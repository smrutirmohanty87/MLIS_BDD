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
import { RbsApprovalPage } from '../src/pages/RbsApprovalPage';
import { ClausesFeesPage } from '../src/pages/ClausesFeesPage';
import { QuoteStatusPage } from '../src/pages/QuoteStatusPage';
import { PolicyPage } from '../src/pages/PolicyPage';
import { PolicyActionsPage } from '../src/pages/PolicyActionsPage';
import { renoIssueAndBond } from '../src/flows/renoIssueAndBond';
import {
  RENO_ACCOUNT, RENO_CLIENT_INFO, RENO_RISK_INFO, RENO_INSURABLE,
  RENO_PRODUCT_FORM, RENO_COVERAGES, RENO_PREMIUMS, RENO_MINIMUM_DEPOSIT,
  RENO_BINDERS, RENO_FEES, RENO_UAL, RENO_USERS, RENO_POLICY_EXPECTATIONS,
  RENO_MTA_POLICY_EXPECTATIONS, RENO_CANCELLATION,
} from '../src/data/renoData';

/**
 * End-to-end: Oliva Construction "Renovation" New Business, MTA, CNR, and Cancellation flow
 * on the SIT sandbox. Auth is JWT (no password/MFA): UW5 (T-0016) for the whole flow by default.
 * RENO_LOGIN_USER=uw3 switches to UW3. Reuses the Care framework via injected Construction
 * data (binder/fee/UAL) + the generic OmniScript form engine for the product questionnaire
 * and 9 coverage forms.
 */
test('create Construction Renovation NB policy end-to-end', async ({ page, browser }) => {
  test.setTimeout(90 * 60 * 1000);

  const accounts = new AccountsPage(page);
  const wizard = new SubmissionWizardPage(page);
  const submission = new SubmissionPage(page);
  const quoteWizard = new QuoteWizardPage(page);
  const quote = new QuotePage(page);
  const forms = new OmniScriptFormPage(page);
  const premiums = new PremiumPage(page);
  const binders = new BindersPage(page, RENO_BINDERS[0], RENO_BINDERS);
  const rbs = new RbsApprovalPage(page);
  const status = new QuoteStatusPage(page, RENO_UAL);
  const policy = new PolicyPage(page);

  // The source doc runs the whole flow as UW5 (default, doc-exact).
  // RENO_LOGIN_USER=uw3 switches to UW3 (exercises the conditional UAL referral branch).
  const loginUser = process.env.RENO_LOGIN_USER === 'uw3' ? RENO_USERS.uw3 : RENO_USERS.uw5;

  await test.step(`Login as Construction ${process.env.RENO_LOGIN_USER === 'uw3' ? 'UW3' : 'UW5'} (JWT — no MFA)`, async () => {
    await jwtLogin(page, loginUser);
  });

  // Fast-iteration escape hatch: RENO_QUOTE_ID skips the ~12-min submission +
  // 9-coverage build and resumes at binders on an existing quote (which must
  // already have coverages + premiums entered).
  const resumeQuoteId = process.env.RENO_QUOTE_ID;
  // The quote id (18-char) — known upfront on resume, captured after creation on
  // a full run. Used to open the Add Fee OmniScript as a standalone page.
  let renoQuoteId = resumeQuoteId ?? '';
  if (resumeQuoteId) {
    await test.step(`Resume from existing quote ${resumeQuoteId}`, async () => {
      // newprodqa2 restores this user's remembered console tabs on navigation,
      // so a bare goto lands focus on a STALE tab (an Account), breaking
      // header-button steps (Add Fee etc.). Open the quote, nuke all workspace
      // tabs to clear the saved set, then reopen — leaving the quote as the sole
      // active tab.
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
    await accounts.openAccount(RENO_ACCOUNT.name);
    await accounts.startNewOlivaSubmission();
  });

  await test.step('Complete submission wizard', async () => {
    await wizard.fillSubmissionSource(RENO_ACCOUNT.intermediaryContact);
    // The wizard page objects are typed to the Care data shapes; the
    // Construction data is structurally compatible for the fields they read
    // (dates are computed inside the page object; offset supplied here).
    await wizard.fillClientInformation(RENO_CLIENT_INFO as never);
    await wizard.fillRiskInformation({ ...RENO_RISK_INFO, quoteRequiredOffsetDays: 5 } as never);
    await wizard.submitClaimsHistory();
    expect(await submission.riskId()).toMatch(/DOU\/\d+\/RENO\/\d+/);
  });

  await test.step('Create quote', async () => {
    await submission.createNewQuote();
    await quoteWizard.completeWizard();
    // Log the quote id so a clean resume point (RENO_QUOTE_ID) can be captured
    // from the run log without waiting for the whole flow to finish.
    const m = page.url().match(/\/Quote\/(0Q0[A-Za-z0-9]+)\//);
    if (!m?.[1]) {
      // Fail FAST: without the id the fee step would silently degrade to the
      // in-console path, which is broken on newprodqa2 (stale-tab focus theft).
      throw new Error(`Could not parse quote id from URL: ${page.url()}`);
    }
    renoQuoteId = m[1];
    console.log(`[reno] clean quote id for resume: ${renoQuoteId}`);
  });

  await test.step('Fill product-level Renovation questionnaire', async () => {
    await quote.editRenovationProductQuestions();
    await forms.fill(RENO_PRODUCT_FORM);
  });

  await test.step('Add all 9 Construction coverages', async () => {
    for (const cov of RENO_COVERAGES) {
      await quote.addRenoCoverage(RENO_INSURABLE.insurableName, cov.addRowName);
      await forms.fill(cov.form);
    }
  });

  await test.step('Enter premiums', async () => {
    await quote.clickEnterPremiums();
    await premiums.answerMinimumDeposit(RENO_MINIMUM_DEPOSIT);
    await premiums.fillAndSubmit(RENO_PREMIUMS);
    // After premiums full-page reload, navigate back to quote record view to access binders tab
    await page.goto(`/lightning/r/Quote/${renoQuoteId}/view`);
    await waitForSpinners(page);
  });

  } // end non-resume (submission → premiums)

  // Fine-grained resume: when iterating downstream steps on a quote that
  // already has binders/RBS done, skip re-running them (re-processing an
  // already-bound quote is fragile and unnecessary).
  const skipBinders = process.env.RENO_SKIP_BINDERS === '1';
  const skipRbs = process.env.RENO_SKIP_RBS === '1';

  if (!skipBinders) {
    await test.step('Select binders for all risks', async () => {
      await binders.selectAllBinders();
    });
  }

  if (!skipRbs) {
    await test.step('RBS approval (confirm reasons, carrier, approve)', async () => {
      await rbs.approveFirstRbs();
    });
  }

  if (process.env.RENO_SKIP_FEE !== '1') {
    await test.step('Add 3 fees', async () => {
      for (const fee of RENO_FEES) {
        console.log(`[reno] adding fee: ${fee.type} / ${fee.subType}`);
        const clausesFees = new ClausesFeesPage(page, fee);
        await clausesFees.addFee(renoQuoteId);
      }
    });
  }

  if (process.env.RENO_SKIP_ERN !== '1') {
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
    await policy.assertState(RENO_POLICY_EXPECTATIONS.status, RENO_POLICY_EXPECTATIONS.newMtaRenewal);
    console.log(`Renovation policy created: ${policyNumber}`);
  });

  await test.step('MTA — Mid-term Adjustment', async () => {
    const policyActions = new PolicyActionsPage(page);
    await policyActions.createMta();
    console.log('[reno] MTA created');
    
    // Capture MTA quote ID from URL
    const mtaQuoteMatch = page.url().match(/\/Quote\/([a-zA-Z0-9]+)\//)?.[1];
    if (!mtaQuoteMatch) {
      throw new Error('Could not parse MTA quote ID from URL');
    }
    const mtaQuoteId = mtaQuoteMatch;
    console.log(`[reno] MTA quote ID: ${mtaQuoteId}`);
    
    // Navigate directly to the MTA quote and wait for the Coverages tab to load
    await page.goto(`/lightning/r/Quote/${mtaQuoteId}/view`);
    await waitForSpinners(page);
    await expect(
      page.getByRole('tab', { name: 'Coverages', exact: true }).first()
    ).toBeVisible({ timeout: 60_000 });
    console.log('[reno] MTA quote loaded');
    
    console.log('[reno] MTA entering premiums...');
    await quote.clickEnterPremiums();
    
    console.log('[reno] MTA answering minimum deposit question...');
    await premiums.answerMinimumDeposit(RENO_MINIMUM_DEPOSIT);
    
    console.log('[reno] MTA filling MTA charge premium: 10');
    await premiums.fillMtaChargeAndSubmit('10');
    console.log('[reno] MTA charge premium submitted');
    
    // Ensure we're back on the MTA quote after premium submission
    await expect(
      page.getByRole('tab', { name: 'Coverages', exact: true }).first()
    ).toBeVisible({ timeout: 60_000 });
    console.log('[reno] MTA back on quote record after premium submission');
    
    await rbs.approveFirstRbs(mtaQuoteId);
    console.log('[reno] MTA RBS record approved');
    
    await renoIssueAndBond(page, browser, status, true); // Skip sanction check for MTA
    console.log('[reno] MTA quote issued and bonded');
    
    // Navigate back to MTA quote after issue/bond, then create policy version
    await page.goto(`/lightning/r/Quote/${mtaQuoteId}/view`);
    await waitForSpinners(page);
    
    const mtaPolicy = await status.createPolicyVersion();
    await status.goToPolicy();
    await policy.assertState(RENO_MTA_POLICY_EXPECTATIONS.status, RENO_MTA_POLICY_EXPECTATIONS.newMtaRenewal);
    console.log(`RENO MTA policy validated: ${mtaPolicy}`);
  });

  await test.step('CNR — Cancel and Reissue', async () => {
    const policyActions = new PolicyActionsPage(page);
    await policyActions.startCancelAndReissue();
    console.log('[reno] CNR started');
    
    // Capture CNR quote ID from URL
    const cnrQuoteMatch = page.url().match(/\/Quote\/([a-zA-Z0-9]+)\//)?.[1];
    const cnrQuoteId = cnrQuoteMatch || '';
    
    await status.confirmNoManualRbsReferralReasons();
    console.log('[reno] CNR RBS confirmation completed');
    
    // Navigate back to the CNR quote after RBS confirmation
    await page.goto(`/lightning/r/Quote/${cnrQuoteId}/view`);
    await waitForSpinners(page);
    
    await renoIssueAndBond(page, browser, status);
    console.log('[reno] CNR quote issued and bonded');
    
    const reissuedPolicy = await status.cancelAndReissuePolicy();
    await status.goToPolicy();
    await policy.assertState(RENO_POLICY_EXPECTATIONS.status);
    console.log(`RENO CNR policy validated: ${reissuedPolicy}`);
  });

  await test.step('Cancellation', async () => {
    const policyActions = new PolicyActionsPage(page);
    await policyActions.cancelPolicy(RENO_CANCELLATION);
    console.log('[reno] Cancellation initiated and form submitted');
    
    // Wait for navigation and verify cancellation
    await page.waitForTimeout(2000);
    console.log(`[reno] Final URL: ${page.url()}`);
    
    await policy.assertState(RENO_CANCELLATION.policyStatus);
    console.log('[reno] Policy cancelled successfully');
  });
});
