import { test, expect } from '@playwright/test';
import { jwtLogin } from '../src/auth/sfJwt';
import { waitForSpinners, closeAllWorkspaceTabs } from '../src/utils/sf';
import { AccountsPage } from '../src/pages/AccountsPage';
import { SubmissionWizardPage } from '../src/pages/SubmissionWizardPage';
import { SubmissionPage } from '../src/pages/SubmissionPage';
import { QuoteWizardPage } from '../src/pages/QuoteWizardPage';
import { QuotePage } from '../src/pages/QuotePage';
import { OmniScriptFormPage } from '../src/pages/OmniScriptFormPage';
import { PremiumPage } from '../src/pages/PremiumPage';
import { BindersPage } from '../src/pages/BindersPage';
import { ClausesFeesPage } from '../src/pages/ClausesFeesPage';
import { QuoteStatusPage } from '../src/pages/QuoteStatusPage';
import { PolicyActionsPage } from '../src/pages/PolicyActionsPage';
import { PolicyPage } from '../src/pages/PolicyPage';
import { renoIssueAndBond } from '../src/flows/renoIssueAndBond';
import {
  JCT_ACCOUNT, JCT_CLIENT_INFO, JCT_RISK_INFO, JCT_INSURABLE,
  JCT_PRODUCT_FORM, JCT_COVERAGES, JCT_PREMIUMS, JCT_MINIMUM_DEPOSIT,
  JCT_BINDER, JCT_FEES, JCT_UAL, JCT_USERS, JCT_POLICY_EXPECTATIONS,
  JCT_MTA, JCT_CANCELLATION,
} from '../src/data/jctData';

/**
 * End-to-end: Oliva "JCT 6.5.1 Non Negligent Liability" (JCTL) lifecycle test
 * covering New Business → MTA → Cancellation on the SIT sandbox. JWT auth (no password/MFA).
 *
 * JCT deltas vs CONC:
 *  - insured "UK Test Insured" (doc-exact, verified to exist on newprodqa2);
 *  - ONE-step questionnaire ("Oliva Standard Questions" only);
 *  - ONE coverage under RISK-LOCATION card (2-page form with "(Optional)" suffix);
 *  - Insurable Name RENDERS on premium grid (unlike CONC which is empty);
 *  - Three fees (Survey, DUAL DNA+, Admin);
 *  - renoIssueAndBond flow (Path-driven issue/bond with conditional UAL);
 *  - Create Policy (full E2E);
 *  - MTA: charge premium adjustment;
 *  - Cancellation: cancel policy with return full premium.
 */
test('create JCT 6.5.1 NB→MTA→Cancellation lifecycle', async ({ page, browser }) => {
  test.setTimeout(90 * 60 * 1000); // 1.5 hours for full lifecycle

  const accounts = new AccountsPage(page);
  const wizard = new SubmissionWizardPage(page);
  const submission = new SubmissionPage(page);
  const quoteWizard = new QuoteWizardPage(page);
  const quote = new QuotePage(page);
  const forms = new OmniScriptFormPage(page);
  const premiums = new PremiumPage(page);
  const binders = new BindersPage(page, JCT_BINDER);
  const status = new QuoteStatusPage(page, JCT_UAL);
  const policy = new PolicyPage(page);

  // The source doc runs the whole flow as UW5 (default, doc-exact).
  // JCT_LOGIN_USER=uw3 switches to UW3 (exercises the conditional UAL referral branch).
  const loginUser = process.env.JCT_LOGIN_USER === 'uw3' ? JCT_USERS.uw3 : JCT_USERS.uw5;

  await test.step(`Login as Construction ${process.env.JCT_LOGIN_USER === 'uw3' ? 'UW3' : 'UW5'} (JWT — no MFA)`, async () => {
    await jwtLogin(page, loginUser);
  });

  // Fast-iteration escape hatch: JCT_QUOTE_ID resumes at binders on an
  // existing quote (which must already have the coverage + premiums entered).
  const resumeQuoteId = process.env.JCT_QUOTE_ID;
  let jctQuoteId = resumeQuoteId ?? '';
  if (resumeQuoteId) {
    await test.step(`Resume from existing quote ${resumeQuoteId}`, async () => {
      await page.goto(`/lightning/r/Quote/${resumeQuoteId}/view`);
      await waitForSpinners(page);
      await closeAllWorkspaceTabs(page);
      await page.goto(`/lightning/r/Quote/${resumeQuoteId}/view`);
      await waitForSpinners(page);
      await expect(
        page.getByRole('tab', { name: 'Coverages', exact: true }).first()
      ).toBeVisible({ timeout: 90_000 });
    });
  } else {

  await test.step('Open intermediary account and start submission', async () => {
    await accounts.openAccount(JCT_ACCOUNT.name);
    await accounts.startNewOlivaSubmission();
  });

  await test.step('Complete submission wizard', async () => {
    await wizard.fillSubmissionSource(JCT_ACCOUNT.intermediaryContact);
    await wizard.fillClientInformation(JCT_CLIENT_INFO as never);
    // Doc image 4: Quote Required by Date = Date Submission Received (same day).
    await wizard.fillRiskInformation({ ...JCT_RISK_INFO, quoteRequiredOffsetDays: 0 } as never);
    await wizard.submitClaimsHistory();
    expect(await submission.riskId()).toMatch(/DOU\/\d+\/JCTL\/\d+/);
  });

  await test.step('Create quote', async () => {
    await submission.createNewQuote();
    await quoteWizard.completeWizard();
    const m = page.url().match(/\/Quote\/(0Q0[A-Za-z0-9]+)\//);
    if (!m?.[1]) {
      throw new Error(`Could not parse quote id from URL: ${page.url()}`);
    }
    jctQuoteId = m[1];
    console.log(`[jct] clean quote id for resume: ${jctQuoteId}`);
  });

  await test.step('Fill JCT questionnaire (1 step)', async () => {
    await quote.editRenovationProductQuestions('JCT 6.5.1 Non Negligent Liability');
    await forms.fill(JCT_PRODUCT_FORM);
  });

  await test.step('Add JCT coverage under the risk-location card', async () => {
    // The Risk Locations card re-renders after the product-questions modal
    // closes; wait for its "Show Coverages" toggle before driving the page
    // object (live exploration run 1 raced this and found 0 toggles).
    await expect(
      page.getByText('Show Coverages', { exact: true }).filter({ visible: true }).first()
    ).toBeVisible({ timeout: 60_000 });
    for (const cov of JCT_COVERAGES) {
      await quote.addRenoCoverage(JCT_INSURABLE.insurableName, cov.addRowName);
      await forms.fill(cov.form);
    }
  });

  await test.step('Enter premiums (Minimum & Deposit = Yes)', async () => {
    await quote.clickEnterPremiums();
    await premiums.answerMinimumDeposit(JCT_MINIMUM_DEPOSIT);
    await premiums.fillAndSubmit(JCT_PREMIUMS);
    // After premiums full-page reload, navigate back to quote record view to access binders tab
    await page.goto(`/lightning/r/Quote/${jctQuoteId}/view`);
    await waitForSpinners(page);
  });

  } // end non-resume (submission → premiums)

  if (process.env.JCT_SKIP_BINDERS !== '1') {
    await test.step('Select binder (Accelerant Oliva Construction 2024)', async () => {
      await binders.selectAllBinders();
    });
  }

  if (process.env.JCT_SKIP_RBS !== '1') {
    await test.step('RBS — Confirm No Manual RBS Referral Reasons (bulk, per doc)', async () => {
      await status.confirmNoManualRbsReferralReasons();
    });
  }

  if (process.env.JCT_SKIP_FEE !== '1') {
    await test.step('Add 3 fees', async () => {
      for (const fee of JCT_FEES) {
        console.log(`[jct] adding fee: ${fee.type} / ${fee.subType}`);
        const clausesFees = new ClausesFeesPage(page, fee);
        await clausesFees.addFee(jctQuoteId, loginUser);
      }
    });
  }

  if (process.env.JCT_SKIP_ERN !== '1') {
    await test.step('Set ERN exempt', async () => {
      await status.setErnExempt();
    });
  }

  await test.step('Issue and bond (with conditional UW5/UAL branch)', async () => {
    await renoIssueAndBond(page, browser, status);
  });

  let policyNumber = '';
  await test.step('Create NB policy', async () => {
    policyNumber = await status.createPolicy();
    expect(policyNumber).not.toEqual('');
    await status.goToPolicy();
    console.log(`[jct] NB policy created: ${policyNumber}`);
  });

  await test.step('Assert NB policy record', async () => {
    await policy.assertState(JCT_POLICY_EXPECTATIONS.status, JCT_POLICY_EXPECTATIONS.newMtaRenewal, {
      product: JCT_POLICY_EXPECTATIONS.product,
      riskIdPattern: JCT_POLICY_EXPECTATIONS.riskIdPattern,
    });
    console.log(`[jct] NB policy validated: ${policyNumber}`);
  });

  await test.step('MTA — Mid-term Adjustment', async () => {
    const policyActions = new PolicyActionsPage(page);
    await policyActions.createMta();
    console.log('[jct] MTA created');
    
    // Capture MTA quote ID from URL
    const mtaQuoteMatch = page.url().match(/\/Quote\/([a-zA-Z0-9]+)\//)?.[1];
    if (!mtaQuoteMatch) {
      throw new Error('Could not parse MTA quote ID from URL');
    }
    const mtaQuoteId = mtaQuoteMatch;
    console.log(`[jct] MTA quote ID: ${mtaQuoteId}`);
    
    // Navigate directly to the MTA quote and wait for the Coverages tab to load
    await page.goto(`/lightning/r/Quote/${mtaQuoteId}/view`);
    await waitForSpinners(page);
    await expect(
      page.getByRole('tab', { name: 'Coverages', exact: true }).first()
    ).toBeVisible({ timeout: 60_000 });
    console.log('[jct] MTA quote loaded');
    
    console.log('[jct] MTA entering premiums...');
    await quote.clickEnterPremiums();
    
    console.log('[jct] MTA answering minimum deposit question...');
    await premiums.answerMinimumDeposit(JCT_MINIMUM_DEPOSIT);
    
    console.log('[jct] MTA filling MTA charge premiums');
    await premiums.fillMtaChargeAndSubmitByCoverage(JCT_MTA.chargePremiums);
    console.log('[jct] MTA charge premium submitted');
    
    // Ensure we're back on the MTA quote after premium submission
    await expect(
      page.getByRole('tab', { name: 'Coverages', exact: true }).first()
    ).toBeVisible({ timeout: 60_000 });
    console.log('[jct] MTA back on quote record after premium submission');
    
    // RBS confirmation for MTA (same as NB)
    await status.confirmNoManualRbsReferralReasons();
    console.log('[jct] MTA RBS confirmation completed');
    
    // Issue and bond for MTA using same flow as NB
    await renoIssueAndBond(page, browser, status);
    console.log('[jct] MTA marked Bound');
    
    // Navigate back to MTA quote after bound, then create policy version
    await page.goto(`/lightning/r/Quote/${mtaQuoteId}/view`);
    await waitForSpinners(page);
    
    const mtaPolicy = await status.createPolicyVersion();
    await status.goToPolicy();
    await policy.assertState(JCT_POLICY_EXPECTATIONS.status);
    console.log(`[jct] MTA policy validated: ${mtaPolicy}`);
  });

  await test.step('Cancellation', async () => {
    const policyActions = new PolicyActionsPage(page);
    await policyActions.cancelPolicy(JCT_CANCELLATION);
    await policy.assertState(JCT_CANCELLATION.policyStatus);
    console.log(`[jct] Policy cancelled: ${policyNumber}`);
  });
});
