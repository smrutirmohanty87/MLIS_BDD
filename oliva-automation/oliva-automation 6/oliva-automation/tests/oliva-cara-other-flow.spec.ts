import { test, expect } from '@playwright/test';
import { jwtLogin, sfQueryOne } from '../src/auth/sfJwt';
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
import { renoIssueAndBond } from '../src/flows/renoIssueAndBond';
import {
  CARA_ACCOUNT, CARA_CLIENT_INFO, CARA_RISK_INFO, CARA_INSURABLE,
  CARA_PRODUCT_FORM, CARA_COVERAGES, CARA_PREMIUMS, CARA_MINIMUM_DEPOSIT,
  CARA_BINDERS, CARA_FEES, CARA_UAL, CARA_USERS, CARA_POLICY_EXPECTATIONS,
  CARA_MTA, CARA_MTA_2, CARA_CANCELLATION,
} from '../src/data/caraData';

/**
 * End-to-end: Oliva "Contractors All Risks - Annual" (CARA) New Business
 * policy on the newprodqa2 sandbox. JWT auth (no password/MFA). Reuses the
 * Renovation/CARP/CONC framework: 4-step questionnaire, SIX product-level
 * coverages by default (including Terrorism; set CARA_INCLUDE_TERRORISM=0 to exclude),
 * per-coverage binder selection across different binders (BindersPage strict mode),
 * FULL per-RBS approval on every section + bulk confirm, three fees,
 * Path-driven issue/bond, Create Policy.
 *
 * Default login is UW5 (doc-exact; per-RBS "Approved" was live-verified
 * editable by UW5). CARA_LOGIN_USER=uw3 switches to the UW3+UAL pattern.
 */
test('create Contractors All Risks - Annual NB policy end-to-end', async ({ page, browser }) => {
  test.setTimeout(60 * 60 * 1000);

  const accounts = new AccountsPage(page);
  const wizard = new SubmissionWizardPage(page);
  const submission = new SubmissionPage(page);
  const quoteWizard = new QuoteWizardPage(page);
  const quote = new QuotePage(page);
  const forms = new OmniScriptFormPage(page);
  const premiums = new PremiumPage(page);
  const binders = new BindersPage(page, CARA_BINDERS[0], CARA_BINDERS);
  const rbs = new RbsApprovalPage(page);
  const status = new QuoteStatusPage(page, CARA_UAL);
  const policy = new PolicyPage(page);

  const loginUser = process.env.CARA_LOGIN_USER === 'uw3' ? CARA_USERS.uw3 : CARA_USERS.uw5;

  await test.step(`Login as Construction ${process.env.CARA_LOGIN_USER === 'uw3' ? 'UW3' : 'UW5'} (JWT — no MFA)`, async () => {
    await jwtLogin(page, loginUser);
  });

  // Fast-iteration escape hatch: CARA_QUOTE_ID resumes at binders on an
  // existing quote (which must already have coverages + premiums entered).
  const resumeQuoteId = process.env.CARA_QUOTE_ID;
  let caraQuoteId = resumeQuoteId ?? '';
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
    await accounts.openAccount(CARA_ACCOUNT.name);
    await accounts.startNewOlivaSubmission();
  });

  await test.step('Complete submission wizard', async () => {
    await wizard.fillSubmissionSource(CARA_ACCOUNT.intermediaryContact);
    await wizard.fillClientInformation(CARA_CLIENT_INFO as never);
    // Doc image 4: Quote Required by Date = Date Submission Received (same day).
    await wizard.fillRiskInformation({ ...CARA_RISK_INFO, quoteRequiredOffsetDays: 0 } as never);
    await wizard.submitClaimsHistory();
    // NOTE: SubmissionPage.riskId() is unsafe for the Moorgarth insured (the
    // Potential Matches rail shows OTHER products' Risk IDs — live-diagnosed),
    // so the CARA Risk-ID pattern is asserted on the QUOTE via REST below.
  });

  await test.step('Create quote', async () => {
    await submission.createNewQuote();
    await quoteWizard.completeWizard();
    const m = page.url().match(/\/Quote\/(0Q0[A-Za-z0-9]+)\//);
    if (!m?.[1]) {
      throw new Error(`Could not parse quote id from URL: ${page.url()}`);
    }
    caraQuoteId = m[1];
    console.log(`[cara] clean quote id for resume: ${caraQuoteId}`);
    const q = await sfQueryOne(
      loginUser,
      `SELECT Risk_ID__c FROM Quote WHERE Id = '${caraQuoteId}'`
    );
    expect(String(q?.Risk_ID__c ?? '')).toMatch(/DOU\/\d+\/CARA\/\d+\/\d+/);
  });

  await test.step('Fill CARA questionnaire (4 steps)', async () => {
    await quote.editRenovationProductQuestions('Contractors All Risks - Annual');
    await forms.fill(CARA_PRODUCT_FORM);
  });

  await test.step(`Add ${CARA_COVERAGES.length} product-level coverages`, async () => {
    // The product card re-renders after the questionnaire modal closes; wait
    // for its "Show Coverages" toggle before driving the page object.
    await expect(
      page.getByText('Show Coverages', { exact: true }).filter({ visible: true }).first()
    ).toBeVisible({ timeout: 60_000 });
    for (const cov of CARA_COVERAGES) {
      await quote.addRenoCoverage(CARA_INSURABLE.insurableName, cov.addRowName);
      await forms.fill(cov.form);
    }
  });

  await test.step('Enter premiums (Minimum & Deposit = Yes)', async () => {
    await quote.clickEnterPremiums();
    await premiums.answerMinimumDeposit(CARA_MINIMUM_DEPOSIT);
    await premiums.fillAndSubmit(CARA_PREMIUMS);
    // After premiums full-page reload, navigate back to quote record view to access binders tab
    await page.goto(`/lightning/r/Quote/${caraQuoteId}/view`);
    await waitForSpinners(page);
  });

  } // end non-resume (submission → premiums)

  if (process.env.CARA_SKIP_BINDERS !== '1') {
    await test.step('Select binders per coverage (3 different binders)', async () => {
      await binders.selectAllBinders();
    });
  }

  if (process.env.CARA_SKIP_RBS !== '1') {
    await test.step('Approve ALL RBS sections (reasons, carrier, Approved)', async () => {
      await rbs.approveAllRbs(caraQuoteId);
    });

    await test.step('RBS — Confirm No Manual RBS Referral Reasons', async () => {
      await status.confirmNoManualRbsReferralReasons();
    });
  }

  if (process.env.CARA_SKIP_FEE !== '1') {
    await test.step('Add 3 fees', async () => {
      for (const fee of CARA_FEES) {
        console.log(`[cara] adding fee: ${fee.type} / ${fee.subType}`);
        const clausesFees = new ClausesFeesPage(page, fee);
        await clausesFees.addFee(caraQuoteId, loginUser);
      }
    });
  }

  if (process.env.CARA_SKIP_ERN !== '1') {
    await test.step('Set ERN exempt', async () => {
      await status.setErnExempt();
    });
  }

  await test.step('Issue and bond (with conditional UW5/UAL branch)', async () => {
    await renoIssueAndBond(page, browser, status);
  });

  let policyNumber = '';
  await test.step('Create policy', async () => {
    policyNumber = await status.createPolicy();
    expect(policyNumber).not.toEqual('');
    await status.goToPolicy();
  });

  await test.step('Assert policy record', async () => {
    await policy.assertState(CARA_POLICY_EXPECTATIONS.status, CARA_POLICY_EXPECTATIONS.newMtaRenewal, {
      product: CARA_POLICY_EXPECTATIONS.product,
      riskIdPattern: CARA_POLICY_EXPECTATIONS.riskIdPattern,
    });
    console.log(`Contractors All Risks - Annual policy created: ${policyNumber}`);
  });

  await test.step('MTA — Mid-term Adjustment (1st)', async () => {
    const policyActions = new PolicyActionsPage(page);
    await policyActions.createMta();
    console.log('[cara] MTA 1 created');
    
    // Capture MTA quote ID from URL
    const mtaQuoteMatch = page.url().match(/\/Quote\/([a-zA-Z0-9]+)\//)?.[1];
    if (!mtaQuoteMatch) {
      throw new Error('Could not parse MTA quote ID from URL');
    }
    const mtaQuoteId1 = mtaQuoteMatch;
    console.log(`[cara] MTA 1 quote ID: ${mtaQuoteId1}`);
    
    // Navigate directly to the MTA quote and wait for the Coverages tab to load
    await page.goto(`/lightning/r/Quote/${mtaQuoteId1}/view`);
    await waitForSpinners(page);
    await expect(
      page.getByRole('tab', { name: 'Coverages', exact: true }).first()
    ).toBeVisible({ timeout: 60_000 });
    console.log('[cara] MTA 1 quote loaded');
    
    // Now click Enter Premiums - this should be visible on the MTA quote
    console.log('[cara] MTA 1 entering premiums...');
    await quote.clickEnterPremiums();
    
    // Answer the "Is any part of policy Minimum & Deposit?" question before filling charges
    console.log('[cara] MTA 1 answering minimum deposit question...');
    await premiums.answerMinimumDeposit(CARA_MINIMUM_DEPOSIT);
    
    // Fill the MTA charge premium for each coverage
    console.log(`[cara] MTA 1 filling MTA charge premiums for ${CARA_MTA.chargePremiums.length} coverages`);
    await premiums.fillMtaChargeAndSubmitByCoverage(CARA_MTA.chargePremiums);
    console.log('[cara] MTA 1 charge premium submitted');
    
    // Ensure we're back on the MTA quote after premium submission
    await expect(
      page.getByRole('tab', { name: 'Coverages', exact: true }).first()
    ).toBeVisible({ timeout: 60_000 });
    console.log('[cara] MTA 1 back on quote record after premium submission');
    
    const rbs = new RbsApprovalPage(page);
    await rbs.approveFirstRbs();
    console.log('[cara] MTA 1 RBS record approved');
    
    await renoIssueAndBond(page, browser, status, true); // Skip sanction check for MTA
    console.log('[cara] MTA 1 quote issued and bonded');
    
    // Navigate back to MTA quote after issue/bond, then create policy version
    await page.goto(`/lightning/r/Quote/${mtaQuoteId1}/view`);
    await waitForSpinners(page);
    
    // Wait for quote to be fully loaded and ready for policy version creation
    await expect(
      page.getByRole('tab', { name: 'Coverages', exact: true }).first()
    ).toBeVisible({ timeout: 60_000 });
    console.log('[cara] MTA 1 quote fully loaded after issue/bond');
    
    const mtaPolicy1 = await status.createPolicyVersion();
    await status.goToPolicy();
    await policy.assertState(CARA_MTA.policyStatus, CARA_MTA.policyNewMtaRenewal);
    console.log(`CARA MTA 1 policy validated: ${mtaPolicy1}`);
  });

  await test.step('MTA — Mid-term Adjustment (2nd)', async () => {
    const policyActions = new PolicyActionsPage(page);
    await policyActions.createMta();
    console.log('[cara] MTA 2 created');
    
    // Capture MTA quote ID from URL
    const mtaQuoteMatch = page.url().match(/\/Quote\/([a-zA-Z0-9]+)\//)?.[1];
    if (!mtaQuoteMatch) {
      throw new Error('Could not parse MTA quote ID from URL');
    }
    const mtaQuoteId2 = mtaQuoteMatch;
    console.log(`[cara] MTA 2 quote ID: ${mtaQuoteId2}`);
    
    // Navigate directly to the MTA quote and wait for the Coverages tab to load
    await page.goto(`/lightning/r/Quote/${mtaQuoteId2}/view`);
    await waitForSpinners(page);
    await expect(
      page.getByRole('tab', { name: 'Coverages', exact: true }).first()
    ).toBeVisible({ timeout: 60_000 });
    console.log('[cara] MTA 2 quote loaded');
    
    // Now click Enter Premiums - this should be visible on the MTA quote
    console.log('[cara] MTA 2 entering premiums...');
    await quote.clickEnterPremiums();
    
    // Answer the "Is any part of policy Minimum & Deposit?" question before filling charges
    console.log('[cara] MTA 2 answering minimum deposit question...');
    await premiums.answerMinimumDeposit(CARA_MINIMUM_DEPOSIT);
    
    // Fill the MTA charge premium for each coverage
    console.log(`[cara] MTA 2 filling MTA charge premiums for ${CARA_MTA_2.chargePremiums.length} coverages`);
    await premiums.fillMtaChargeAndSubmitByCoverage(CARA_MTA_2.chargePremiums);
    console.log('[cara] MTA 2 charge premium submitted');
    
    // Ensure we're back on the MTA quote after premium submission
    await expect(
      page.getByRole('tab', { name: 'Coverages', exact: true }).first()
    ).toBeVisible({ timeout: 60_000 });
    console.log('[cara] MTA 2 back on quote record after premium submission');
    
    const rbs = new RbsApprovalPage(page);
    await rbs.approveFirstRbs();
    console.log('[cara] MTA 2 RBS record approved');
    
    await renoIssueAndBond(page, browser, status, true); // Skip sanction check for MTA
    console.log('[cara] MTA 2 quote issued and bonded');
    
    // Navigate back to MTA quote after issue/bond, then create policy version
    await page.goto(`/lightning/r/Quote/${mtaQuoteId2}/view`);
    await waitForSpinners(page);
    
    // Wait for quote to be fully loaded and ready for policy version creation
    await expect(
      page.getByRole('tab', { name: 'Coverages', exact: true }).first()
    ).toBeVisible({ timeout: 60_000 });
    console.log('[cara] MTA 2 quote fully loaded after issue/bond');
    
    const mtaPolicy2 = await status.createPolicyVersion();
    await status.goToPolicy();
    await policy.assertState(CARA_MTA_2.policyStatus, CARA_MTA_2.policyNewMtaRenewal);
    console.log(`CARA MTA 2 policy validated: ${mtaPolicy2}`);
  });

  await test.step('Cancellation', async () => {
    const policyActions = new PolicyActionsPage(page);
    await policyActions.cancelPolicy(CARA_CANCELLATION);
    await policy.assertState(CARA_CANCELLATION.policyStatus);
    console.log('[cara] policy cancelled');
  });
});
