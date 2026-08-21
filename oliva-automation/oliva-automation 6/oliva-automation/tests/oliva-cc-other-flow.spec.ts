import { test, expect } from '@playwright/test';
import { jwtLogin } from '../src/auth/sfJwt';
import { renoIssueAndBond } from '../src/flows/renoIssueAndBond';
import { waitForSpinners, closeAllWorkspaceTabs } from '../src/utils/sf';
import { AccountsPage } from '../src/pages/AccountsPage';
import { SubmissionWizardPage } from '../src/pages/SubmissionWizardPage';
import { SubmissionPage } from '../src/pages/SubmissionPage';
import { QuoteWizardPage } from '../src/pages/QuoteWizardPage';
import { QuotePage } from '../src/pages/QuotePage';
import { OmniScriptFormPage } from '../src/pages/OmniScriptFormPage';
import { PremiumPage } from '../src/pages/PremiumPage';
import { BindersPage } from '../src/pages/BindersPage';
import { RbsApprovalPage } from '../src/pages/RbsApprovalPage';
import { ClausesFeesPage } from '../src/pages/ClausesFeesPage';
import { QuoteStatusPage } from '../src/pages/QuoteStatusPage';
import { PolicyPage } from '../src/pages/PolicyPage';
import { PolicyActionsPage } from '../src/pages/PolicyActionsPage';
import { fillElTradeRow } from '../src/flows/ccNb';
import {
  CC_ACCOUNT, CC_CLIENT_INFO, CC_RISK_INFO, CC_INSURABLE,
  CC_PRODUCT_FORM, CC_COVERAGES, CC_PD_COVERAGE, CC_PREMIUMS, CC_MINIMUM_DEPOSIT,
  CC_BINDERS, CC_BINDER_DEFAULT, CC_FEES, CC_UAL, CC_USERS, CC_POLICY_EXPECTATIONS,
  CC_MTA, CC_CANCELLATION,
} from '../src/data/ccData';

/**
 * End-to-end lifecycle chain on a Contractors Combined (CONC)
 * New Business policy:
 *   NB → MTA → Cancellation
 *
 * Each flow runs on the policy produced by the previous one. The base NB 
 * policy is created fresh via JWT-authenticated submission so the run 
 * is fully self-contained. The whole journey runs as UW5 by default.
 */
test('CC lifecycle chain: NB → MTA → Cancellation', async ({ page, browser }) => {
  // Three sequential Salesforce journeys — well beyond the 30-min default.
  test.setTimeout(60 * 60 * 1000);

  const accounts = new AccountsPage(page);
  const wizard = new SubmissionWizardPage(page);
  const submission = new SubmissionPage(page);
  const quoteWizard = new QuoteWizardPage(page);
  const quote = new QuotePage(page);
  const forms = new OmniScriptFormPage(page);
  const premiums = new PremiumPage(page);
  const binders = new BindersPage(page, CC_BINDER_DEFAULT, CC_BINDERS);
  const rbs = new RbsApprovalPage(page);
  const status = new QuoteStatusPage(page, CC_UAL);
  const policyActions = new PolicyActionsPage(page);
  const policy = new PolicyPage(page);

  let nbPolicyNumber = '';
  let quoteId = '';

  const loginUser = process.env.CC_LOGIN_USER === 'uw3' ? CC_USERS.uw3 : CC_USERS.uw5;

  await test.step(`Login as Construction ${process.env.CC_LOGIN_USER === 'uw3' ? 'UW3' : 'UW5'} (JWT — no MFA)`, async () => {
    await jwtLogin(page, loginUser);
  });

  await test.step('Create base New Business policy (CC)', async () => {
    await accounts.openAccount(CC_ACCOUNT.name);
    await accounts.startNewOlivaSubmission();

    await wizard.fillSubmissionSource(CC_ACCOUNT.intermediaryContact);
    await wizard.fillClientInformation(CC_CLIENT_INFO as never);
    await wizard.fillRiskInformation({ ...CC_RISK_INFO, quoteRequiredOffsetDays: 0 } as never);
    await wizard.submitClaimsHistory();
    expect(await submission.riskId()).toMatch(/DOU\/\d+\/CONC\/\d+/);

    await submission.createNewQuote();
    await quoteWizard.completeWizard();
    const m = page.url().match(/\/Quote\/(0Q0[A-Za-z0-9]+)\//);
    if (!m?.[1]) {
      throw new Error(`Could not parse quote id from URL: ${page.url()}`);
    }
    quoteId = m[1];

    await quote.editRenovationProductQuestions('Contractors Combined');
    await forms.fill(CC_PRODUCT_FORM);

    for (const cov of CC_COVERAGES) {
      await quote.addRenoCoverage(CC_INSURABLE.insurableName, cov.addRowName);
      if (cov.addRowName === 'Employers Liability') {
        await fillElTradeRow(page);
      }
      await forms.fill(cov.form);
    }

    await quote.addRenoCoverage('UK Test Insured - United Kingdom', CC_PD_COVERAGE.addRowName);
    await forms.fill(CC_PD_COVERAGE.form);

    await quote.clickEnterPremiums();
    await premiums.answerMinimumDeposit(CC_MINIMUM_DEPOSIT);
    await premiums.fillAndSubmit(CC_PREMIUMS);
    await page.goto(`/lightning/r/Quote/${quoteId}/view`);
    await waitForSpinners(page);

    await binders.selectAllBinders();
    await status.confirmNoManualRbsReferralReasons();
    for (const fee of CC_FEES) {
      console.log(`[cc-chain] adding fee: ${fee.type} / ${fee.subType}`);
      const clausesFees = new ClausesFeesPage(page, fee);
      await clausesFees.addFee(quoteId, loginUser);
    }

    await status.setErnExempt();
    await rbs.approveFirstRbs(quoteId);

    await renoIssueAndBond(page, browser, status);
    nbPolicyNumber = await status.createPolicy();
    expect(nbPolicyNumber, 'base NB policy number').not.toEqual('');
    await status.goToPolicy();
    await policy.assertState('In Force', 'New Business');
    console.log(`[cc-chain] base NB policy: ${nbPolicyNumber}`);
  });

  await test.step('MTA — Mid-term Adjustment', async () => {
    await policyActions.createMta();
    console.log('[cc-chain] MTA created');

    // Capture MTA quote ID from URL
    const mtaQuoteMatch = page.url().match(/\/Quote\/([a-zA-Z0-9]+)\//)?.[1];
    if (!mtaQuoteMatch) {
      throw new Error('Could not parse MTA quote ID from URL');
    }
    const mtaQuoteId = mtaQuoteMatch;
    console.log(`[cc-chain] MTA quote ID: ${mtaQuoteId}`);

    // Navigate directly to the MTA quote and wait for the Coverages tab to load
    await page.goto(`/lightning/r/Quote/${mtaQuoteId}/view`);
    await waitForSpinners(page);
    await expect(
      page.getByRole('tab', { name: 'Coverages', exact: true }).first()
    ).toBeVisible({ timeout: 60_000 });
    console.log('[cc-chain] MTA quote loaded');

    console.log('[cc-chain] MTA entering premiums...');
    await quote.clickEnterPremiums();

    console.log('[cc-chain] MTA answering minimum deposit question...');
    await premiums.answerMinimumDeposit(CC_MINIMUM_DEPOSIT);

    console.log(`[cc-chain] MTA filling MTA charge premiums for ${CC_MTA.chargePremiums.length} coverages`);
    await premiums.fillMtaChargeAndSubmitByCoverage(CC_MTA.chargePremiums);
    console.log('[cc-chain] MTA charge premium submitted');

    await expect(
      page.getByRole('tab', { name: 'Coverages', exact: true }).first()
    ).toBeVisible({ timeout: 60_000 });
    console.log('[cc-chain] MTA back on quote record after premium submission');

    await rbs.approveFirstRbs(mtaQuoteId);
    console.log('[cc-chain] MTA RBS record approved');

    await renoIssueAndBond(page, browser, status, true); // Skip sanction check for MTA
    console.log('[cc-chain] MTA quote issued and bonded');

    await page.goto(`/lightning/r/Quote/${mtaQuoteId}/view`);
    await waitForSpinners(page);

    const mtaPolicy = await status.createPolicyVersion();
    await status.goToPolicy();
    await policy.assertState(CC_MTA.policyStatus, CC_MTA.policyNewMtaRenewal);
    console.log(`[cc-chain] MTA policy validated: ${mtaPolicy}`);
  });

  await test.step('Cancellation', async () => {
    await policyActions.cancelPolicy(CC_CANCELLATION);
    await policy.assertState(CC_CANCELLATION.policyStatus);
    console.log('[cc-chain] policy cancelled');
  });
});
