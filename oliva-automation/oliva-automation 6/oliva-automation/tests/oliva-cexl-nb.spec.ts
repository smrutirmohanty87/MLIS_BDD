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
  CEXL_ACCOUNT,
  CEXL_CLIENT_INFO,
  CEXL_RISK_INFO,
  CEXL_INSURABLE,
  CEXL_COVERAGES,
  CEXL_PREMIUMS,
  CEXL_MINIMUM_DEPOSIT,
  CEXL_BINDERS,
  CEXL_FEES,
  CEXL_UAL,
  CEXL_USERS,
  CEXL_POLICY_EXPECTATIONS,
  CEXL_MTA,
  CEXL_CNR,
  CEXL_ERN,
} from '../src/data/cexlData';

/**
 * End-to-end: Oliva Construction "Contractors Excess Layer" (CEXL) New Business
 * policy on the newprodqa2 sandbox. JWT auth (no password/MFA): UW3 for the
 * whole flow, UW5 only inside the conditional UAL branch.
 *
 * CEXL deltas vs Renovation: same flow (submission → quote → coverages →
 * premiums → binders → RBS → fees → issue/bond → policy), but with CEXL-specific:
 *  - 8-step product questionnaire
 *  - 9 coverages (Contract Works, Existing Structures, Contents, DSU, Own Plant,
 *    Hired in Plant, P&PL, Terrorism*, JCT Non-Negligent Liability)
 *  - CEXL-specific binder section ("Contractors Excess Layer")
 *  - Premium entry without Minimum & Deposit option
 *  - Bulk RBS "Confirm No Manual RBS Referral Reasons"
 *  - Three fees (Survey, DUAL DNA+, Admin)
 */
test('create Contractors Excess Layer NB policy end-to-end', async ({ page, browser }) => {
  test.setTimeout(60 * 60 * 1000);

  const accounts = new AccountsPage(page);
  const wizard = new SubmissionWizardPage(page);
  const submission = new SubmissionPage(page);
  const quoteWizard = new QuoteWizardPage(page);
  const quote = new QuotePage(page);
  const forms = new OmniScriptFormPage(page);
  const premiums = new PremiumPage(page);
  const binders = new BindersPage(page);
  const rbs = new RbsApprovalPage(page);
  const status = new QuoteStatusPage(page, CEXL_UAL);
  const policy = new PolicyPage(page);

  await test.step('Login as Construction UW5 (JWT — no MFA)', async () => {
    await jwtLogin(page, CEXL_USERS.uw5);
  });

  // Fast-iteration escape hatch: CEXL_QUOTE_ID resumes at binders on an
  // existing quote (which must already have coverages + premiums entered).
  const resumeQuoteId = process.env.CEXL_QUOTE_ID;
  let cexlQuoteId = resumeQuoteId ?? '';
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
    await accounts.openAccount(CEXL_ACCOUNT.name);
    await accounts.startNewOlivaSubmission();
  });

  await test.step('Complete submission wizard', async () => {
    console.log('[cexl] Starting submission wizard...');
    await wizard.fillSubmissionSource(CEXL_ACCOUNT.intermediaryContact);
    console.log('[cexl] Submission source filled');
    
    await wizard.fillClientInformation(CEXL_CLIENT_INFO as never);
    console.log('[cexl] Client information filled');
    
    await wizard.fillRiskInformation({ ...CEXL_RISK_INFO, quoteRequiredOffsetDays: 5 } as never);
    console.log('[cexl] Risk information filled');
    
    await wizard.submitClaimsHistory();
    console.log('[cexl] Submission wizard submitted');
    
    const riskId = await submission.riskId();
    console.log(`[cexl] Risk ID obtained: ${riskId}`);
    expect(riskId).toMatch(/DOU\/\d+\/CEXL\/\d+/);
  });

  await test.step('Create quote', async () => {
    await submission.createNewQuote();
    await quoteWizard.completeWizard();
    const m = page.url().match(/\/Quote\/(0Q0[A-Za-z0-9]+)\//);
    if (!m?.[1]) {
      throw new Error(`Could not parse quote id from URL: ${page.url()}`);
    }
    cexlQuoteId = m[1];
    console.log(`[cexl] clean quote id for resume: ${cexlQuoteId}`);
  });

  // SKIP: Product-level questionnaire (8 steps) — not required for this test
  // await test.step('Fill product-level CEXL questionnaire (8 steps)', async () => {
  //   await quote.editRenovationProductQuestions('Contractors Excess Layer');
  //   await forms.fill(CEXL_PRODUCT_FORM);
  // });

  await test.step(`Add ${CEXL_COVERAGES.length} CEXL coverages`, async () => {
    for (const cov of CEXL_COVERAGES) {
      await quote.addRenoCoverage(CEXL_INSURABLE.insurableName, cov.addRowName);
      await forms.fill(cov.form);
    }
  });

  await test.step('Enter premiums (Minimum & Deposit = No)', async () => {
    await quote.clickEnterPremiums();
    await premiums.answerMinimumDeposit(CEXL_MINIMUM_DEPOSIT);
    await premiums.fillAndSubmit(CEXL_PREMIUMS);
  });

  } // end non-resume (submission → premiums)

  if (process.env.CEXL_SKIP_BINDERS !== '1') {
    await test.step('Select binders for all coverages', async () => {
      await binders.selectAllBinders();
    });
  }

  if (process.env.CEXL_SKIP_RBS !== '1') {
    await test.step('RBS — Confirm No Manual RBS Referral Reasons', async () => {
      console.log('[cexl] Starting RBS approval step');
      await status.confirmNoManualRbsReferralReasons();
      console.log('[cexl] RBS confirmation completed');
    });
    
    await test.step('RBS — Approve all RBS records', async () => {
      console.log('[cexl] Starting RBS record approval');
      const rbsPage = new RbsApprovalPage(page);
      await rbsPage.approveAllRbs(cexlQuoteId);
      console.log('[cexl] All RBS records approved');
    });
  } else {
    console.log('[cexl] RBS step skipped (CEXL_SKIP_RBS=1)');
  }

  if (process.env.CEXL_SKIP_FEE !== '1') {
    await test.step('Add 3 fees', async () => {
      for (const fee of CEXL_FEES) {
        console.log(`[cexl] adding fee: ${fee.type} / ${fee.subType}`);
        const clausesFees = new ClausesFeesPage(page, fee);
        await clausesFees.addFee(cexlQuoteId);
      }
    });
  }

  if (process.env.CEXL_SKIP_ERN !== '1') {
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
    await policy.assertState(CEXL_POLICY_EXPECTATIONS.status, CEXL_POLICY_EXPECTATIONS.newMtaRenewal);
    console.log(`CEXL policy created: ${policyNumber}`);
  });

  await test.step('MTA — Mid-term Adjustment', async () => {
    const policyActions = new PolicyActionsPage(page);
    await policyActions.createMta();
    console.log('[cexl] MTA created');
    
    await quote.clickEnterPremiums();
    await premiums.fillMtaChargeAndSubmitByCoverage(CEXL_MTA.chargePremiums);
    console.log('[cexl] MTA charge premium entered');
    
    await rbs.approveFirstRbs();
    console.log('[cexl] MTA RBS record approved');
    
    await renoIssueAndBond(page, browser, status);
    console.log('[cexl] MTA quote issued and bonded');
    
    const mtaPolicy = await status.createPolicyVersion();
    expect(mtaPolicy, 'MTA policy id').not.toEqual('');
    await status.goToPolicy();
    console.log(`[cexl] MTA policy created: ${mtaPolicy}`);
    
    await policy.assertState(CEXL_MTA.policyStatus, CEXL_MTA.policyNewMtaRenewal);
    console.log(`CEXL MTA policy validated: ${mtaPolicy}`);
  });

  await test.step('CNR — Cancel and Reissue', async () => {
    const policyActions = new PolicyActionsPage(page);
    await policyActions.startCancelAndReissue();
    console.log('[cexl] CNR started');
    
    await status.confirmNoManualRbsReferralReasons();
    console.log('[cexl] CNR RBS confirmation completed');
    
    await renoIssueAndBond(page, browser, status);
    console.log('[cexl] CNR quote issued and bonded');
    
    const reissuedPolicy = await status.cancelAndReissuePolicy();
    expect(reissuedPolicy, 'CNR reissued policy number').not.toEqual('');
    await status.goToPolicy();
    console.log(`[cexl] CNR reissued policy: ${reissuedPolicy}`);
    
    await policy.assertState(CEXL_CNR.policyStatus, CEXL_CNR.policyNewMtaRenewal);
    console.log(`CEXL CNR policy validated: ${reissuedPolicy}`);
  });
});
