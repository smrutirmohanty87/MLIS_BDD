import { test, expect } from '@playwright/test';
import { jwtLogin } from '../../src/auth/sfJwt';
import { renoIssueAndBond } from '../../src/flows/renoIssueAndBond';
import { waitForSpinners, closeAllWorkspaceTabs } from '../../src/utils/sf';
import { AccountsPage } from '../../src/pages/AccountsPage';
import { SubmissionWizardPage } from '../../src/pages/SubmissionWizardPage';
import { SubmissionPage } from '../../src/pages/SubmissionPage';
import { QuoteWizardPage } from '../../src/pages/QuoteWizardPage';
import { QuotePage } from '../../src/pages/QuotePage';
import { OmniScriptFormPage } from '../../src/pages/OmniScriptFormPage';
import { PolicyActionsPage } from '../../src/pages/PolicyActionsPage';
import { QuoteStatusPage } from '../../src/pages/QuoteStatusPage';
import { PremiumPage } from '../../src/pages/PremiumPage';
import { BindersPage } from '../../src/pages/BindersPage';
import { RbsApprovalPage } from '../../src/pages/RbsApprovalPage';
import { ClausesFeesPage } from '../../src/pages/ClausesFeesPage';
import { PolicyPage } from '../../src/pages/PolicyPage';
import {
  CARP_ACCOUNT, CARP_CLIENT_INFO, CARP_RISK_INFO, CARP_INSURABLE,
  CARP_PRODUCT_FORM, CARP_COVERAGES, CARP_PREMIUMS, CARP_MINIMUM_DEPOSIT,
  CARP_BINDERS, CARP_FEES, CARP_UAL, CARP_USERS,
  CARP_CNR, CARP_MTA, CARP_RENEWAL
} from '../../src/data/carpData';

/**
 * End-to-end lifecycle chain on a CARP (Contractors All Risks - Project) 
 * New Business policy:
 *   NB â†’ CNR (Cancel & Re-issue) â†’ MTA â†’ Renewal
 *
 * Each flow runs on the policy produced by the previous one. The base NB 
 * policy is created fresh via JWT-authenticated submission so the run 
 * is fully self-contained. The whole journey runs as UW5 by default;
 * CARP_LOGIN_USER=uw3 switches to UW3 (exercises the UAL approval branch).
 */
test('CARP lifecycle chain: NB â†’ CNR â†’ MTA â†’ Renewal', async ({ page, browser }) => {
  // Four sequential Salesforce journeys â€” well beyond the 30-min default.
  test.setTimeout(75 * 60 * 1000);

  const accounts = new AccountsPage(page);
  const wizard = new SubmissionWizardPage(page);
  const submission = new SubmissionPage(page);
  const quoteWizard = new QuoteWizardPage(page);
  const quote = new QuotePage(page);
  const forms = new OmniScriptFormPage(page);
  const premiums = new PremiumPage(page);
  const binders = new BindersPage(page, CARP_BINDERS[0], CARP_BINDERS);
  const rbs = new RbsApprovalPage(page);
  const clausesFees = new ClausesFeesPage(page);
  const status = new QuoteStatusPage(page, CARP_UAL);
  const policyActions = new PolicyActionsPage(page);
  const policy = new PolicyPage(page);

  let nbPolicyNumber = '';
  let quoteId = '';
  
  // The source doc runs the whole flow as UW5 (default, doc-exact).
  // CARP_LOGIN_USER=uw3 switches to UW3 (exercises the conditional UAL referral branch).
  const loginUser = process.env.CARP_LOGIN_USER === 'uw3' ? CARP_USERS.uw3 : CARP_USERS.uw5;

  await test.step(`Login as Construction ${process.env.CARP_LOGIN_USER === 'uw3' ? 'UW3' : 'UW5'} (JWT â€” no MFA)`, async () => {
    await jwtLogin(page, loginUser);
  });

  await test.step('Create base New Business policy (CARP)', async () => {
    // Start submission using browser actions to navigate to Intermediary Account
    // (not SOQL query, which can return the wrong account when both Intermediary
    // and Introducer accounts share the same name)
    await accounts.openAccount(CARP_ACCOUNT.name);
    await accounts.startNewOlivaSubmission();

    // Complete submission wizard
    await wizard.fillSubmissionSource(CARP_ACCOUNT.intermediaryContact);
    await wizard.fillClientInformation(CARP_CLIENT_INFO as never);
    await wizard.fillRiskInformation({ ...CARP_RISK_INFO, quoteRequiredOffsetDays: 5 } as never);
    await wizard.submitClaimsHistory();

    // Create quote
    await submission.createNewQuote();
    await quoteWizard.completeWizard();

    // Capture quote ID from URL
    const m = page.url().match(/\/Quote\/(0Q0[A-Za-z0-9]+)\//);
    if (!m?.[1]) {
      throw new Error(`Could not parse quote id from URL: ${page.url()}`);
    }
    quoteId = m[1];

    // Fill product questionnaire and coverages
    await quote.editRenovationProductQuestions('Contractors All Risks - Project');
    await forms.fill(CARP_PRODUCT_FORM);

    for (const cov of CARP_COVERAGES) {
      await quote.addRenoCoverage(CARP_INSURABLE.insurableName, cov.addRowName);
      await forms.fill(cov.form);
    }

    // Enter premiums
    await quote.clickEnterPremiums();
    await premiums.answerMinimumDeposit(CARP_MINIMUM_DEPOSIT);
    await premiums.fillAndSubmit(CARP_PREMIUMS);

    // Navigate back to quote to access binders tab
    await page.goto(`/lightning/r/Quote/${quoteId}/view`);
    await waitForSpinners(page);

    // Binders, RBS, Fees
    await binders.selectAllBinders();
    await status.confirmNoManualRbsReferralReasons();
    for (const fee of CARP_FEES) {
      const clausesFeeItem = new ClausesFeesPage(page, fee);
      await clausesFeeItem.addFee(quoteId);
    }

    // Set ERN exempt
    await status.setErnExempt();

    // RBS approval
    await rbs.approveFirstRbs();

    // Issue and bond
    await renoIssueAndBond(page, browser, status);
    nbPolicyNumber = await status.createPolicy();
    expect(nbPolicyNumber, 'base NB policy number').not.toEqual('');
    await status.goToPolicy();
    await policy.assertState('In Force', 'New Business');
    console.log(`[carp-chain] base NB policy: ${nbPolicyNumber}`);
  });

  await test.step('CNR â€” Cancel and Reissue', async () => {
    await policyActions.startCancelAndReissue();
    // Capture the CNR quote ID from URL
    const cnrQuoteMatch = page.url().match(/\/Quote\/(0Q0[A-Za-z0-9]+)\//);
    const cnrQuoteId = cnrQuoteMatch?.[1] || '';
    
    await status.confirmNoManualRbsReferralReasons();
    // Navigate back to the CNR quote after RBS confirmation
    await page.goto(`/lightning/r/Quote/${cnrQuoteId}/view`);
    await waitForSpinners(page);
    
    await renoIssueAndBond(page, browser, status);
    const reissued = await status.cancelAndReissuePolicy();
    expect(reissued, 'reissued policy number').not.toEqual('');
    await status.goToPolicy();
    await policy.assertState(CARP_CNR.policyStatus, CARP_CNR.policyNewMtaRenewal);
    console.log(`[carp-chain] CNR reissued policy: ${reissued}`);
  });

  await test.step('MTA â€” Mid-term Adjustment', async () => {
    await policyActions.createMta();
    // Capture MTA quote ID
    const mtaQuoteMatch = page.url().match(/\/Quote\/(0Q0[A-Za-z0-9]+)\//);
    const mtaQuoteId = mtaQuoteMatch?.[1] || '';
    
    await quote.clickEnterPremiums();
    await premiums.answerMinimumDeposit(CARP_MINIMUM_DEPOSIT);
    await premiums.fillMtaChargeAndSubmitByCoverage(CARP_MTA.chargePremiums);
    
    await page.goto(`/lightning/r/Quote/${mtaQuoteId}/view`);
    await waitForSpinners(page);
    
    await rbs.approveFirstRbs();
    await renoIssueAndBond(page, browser, status);
    const mtaPolicy = await status.createPolicyVersion();
    expect(mtaPolicy, 'MTA policy id').not.toEqual('');
    await status.goToPolicy();
    await policy.assertState(CARP_MTA.policyStatus, CARP_MTA.policyNewMtaRenewal);
    console.log(`[carp-chain] MTA policy: ${mtaPolicy}`);
  });

  await test.step('Renewal', async () => {
    await policyActions.startRenewal();
    // Capture renewal quote ID
    const renewalQuoteMatch = page.url().match(/\/Quote\/(0Q0[A-Za-z0-9]+)\//);
    const renewalQuoteId = renewalQuoteMatch?.[1] || '';
    
    await quote.clickEnterPremiums();
    await premiums.answerMinimumDeposit(CARP_MINIMUM_DEPOSIT);
    await premiums.fillUniformAndSubmit(CARP_RENEWAL.premium);
    
    await page.goto(`/lightning/r/Quote/${renewalQuoteId}/view`);
    await waitForSpinners(page);
    
    await binders.selectAllBinders();
    await rbs.approveFirstRbs();
    await renoIssueAndBond(page, browser, status);
    const renewalPolicy = await status.createPolicy();
    expect(renewalPolicy, 'renewal policy number').not.toEqual('');
    await status.goToPolicy();
    await policy.assertState(CARP_RENEWAL.policyStatus, CARP_RENEWAL.policyNewMtaRenewal);
    console.log(`[carp-chain] Renewal policy: ${renewalPolicy}`);
  });
});

