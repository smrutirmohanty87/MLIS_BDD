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
import { ClausesFeesPage } from '../src/pages/ClausesFeesPage';
import { QuoteStatusPage } from '../src/pages/QuoteStatusPage';
import { PolicyPage } from '../src/pages/PolicyPage';
import { renoIssueAndBond } from '../src/flows/renoIssueAndBond';
import {
  CARP_NB_VARIANT1_ACCOUNT, CARP_NB_VARIANT1_CLIENT_INFO, CARP_NB_VARIANT1_RISK_INFO, CARP_NB_VARIANT1_INSURABLE,
  CARP_NB_VARIANT1_COVERAGES, CARP_NB_VARIANT1_PREMIUMS, CARP_NB_VARIANT1_MINIMUM_DEPOSIT,
  CARP_NB_VARIANT1_BINDERS, CARP_NB_VARIANT1_FEES, CARP_NB_VARIANT1_UAL, CARP_NB_VARIANT1_USERS, CARP_NB_VARIANT1_POLICY_EXPECTATIONS,
} from '../src/data/carpNbVariant1Data';

/**
 * End-to-end: Oliva Construction "Contractors All Risks - Project" (CARP)
 * New Business variant 1 — simplified NB-only flow with 3 coverages and 1 fee.
 * 
 * Auth is JWT (no password/MFA): UW5 (T-0016) for the whole flow by default.
 * CARP_NB_VARIANT1_LOGIN_USER=uw3 switches to UW3 (exercises the conditional
 * UAL referral branch). Flow: account → submission → quote → 3 coverages →
 * premiums → binders → RBS → 1 DUAL fee → issue/bond → policy.
 */
test('create Contractors All Risks - Project NB policy (variant 1) end-to-end', async ({ page, browser }) => {
  test.setTimeout(45 * 60 * 1000);

  const accounts = new AccountsPage(page);
  const wizard = new SubmissionWizardPage(page);
  const submission = new SubmissionPage(page);
  const quoteWizard = new QuoteWizardPage(page);
  const quote = new QuotePage(page);
  const forms = new OmniScriptFormPage(page);
  const premiums = new PremiumPage(page);
  const binders = new BindersPage(page, CARP_NB_VARIANT1_BINDERS[0], CARP_NB_VARIANT1_BINDERS);
  const status = new QuoteStatusPage(page, CARP_NB_VARIANT1_UAL);
  const policy = new PolicyPage(page);

  const loginUser = process.env.CARP_NB_VARIANT1_LOGIN_USER === 'uw3' ? CARP_NB_VARIANT1_USERS.uw3 : CARP_NB_VARIANT1_USERS.uw5;

  await test.step(`Login as Construction ${process.env.CARP_NB_VARIANT1_LOGIN_USER === 'uw3' ? 'UW3' : 'UW5'} (JWT — no MFA)`, async () => {
    await jwtLogin(page, loginUser);
  });

  const resumeQuoteId = process.env.CARP_NB_VARIANT1_QUOTE_ID;
  let carpQuoteId = resumeQuoteId ?? '';
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
    const acc = await sfQueryOne(
      CARP_NB_VARIANT1_USERS.uw5,
      `SELECT Id FROM Account WHERE Name = '${CARP_NB_VARIANT1_ACCOUNT.name}' LIMIT 1`
    );
    if (!acc?.Id) throw new Error(`Account not found: ${CARP_NB_VARIANT1_ACCOUNT.name}`);
    await page.goto(`/lightning/r/Account/${acc.Id}/view`);
    await waitForSpinners(page);
    await accounts.startNewOlivaSubmission();
  });

  await test.step('Complete submission wizard', async () => {
    await wizard.fillSubmissionSource(CARP_NB_VARIANT1_ACCOUNT.intermediaryContact);
    await wizard.fillClientInformation(CARP_NB_VARIANT1_CLIENT_INFO as never);
    await wizard.fillRiskInformation({ ...CARP_NB_VARIANT1_RISK_INFO, quoteRequiredOffsetDays: 5 } as never);
    await wizard.submitClaimsHistory();
    expect(await submission.riskId()).toMatch(/DOU\/\d+\/CARP\/\d+/);
  });

  await test.step('Create quote', async () => {
    await submission.createNewQuote();
    await quoteWizard.completeWizard();
    const m = page.url().match(/\/Quote\/(0Q0[A-Za-z0-9]+)\//);
    if (!m?.[1]) {
      throw new Error(`Could not parse quote id from URL: ${page.url()}`);
    }
    carpQuoteId = m[1];
    console.log(`[carp-nb-variant1] clean quote id for resume: ${carpQuoteId}`);
  });

  await test.step(`Add ${CARP_NB_VARIANT1_COVERAGES.length} CARP coverages`, async () => {
    for (const cov of CARP_NB_VARIANT1_COVERAGES) {
      await quote.addRenoCoverage(CARP_NB_VARIANT1_INSURABLE.insurableName, cov.addRowName);
      await forms.fill(cov.form);
    }
  });

  await test.step('Enter premiums (Minimum & Deposit = Yes)', async () => {
    await quote.clickEnterPremiums();
    await premiums.answerMinimumDeposit(CARP_NB_VARIANT1_MINIMUM_DEPOSIT);
    await premiums.fillAndSubmit(CARP_NB_VARIANT1_PREMIUMS);
  });

  } // end non-resume (submission → premiums)

  if (process.env.CARP_NB_VARIANT1_SKIP_BINDERS !== '1') {
    await test.step('Select binders for all risks', async () => {
      await binders.selectAllBinders();
    });
  }

  if (process.env.CARP_NB_VARIANT1_SKIP_RBS !== '1') {
    await test.step('RBS — Confirm No Manual RBS Referral Reasons', async () => {
      await status.confirmNoManualRbsReferralReasons();
    });
  }

  if (process.env.CARP_NB_VARIANT1_SKIP_FEE !== '1') {
    await test.step('Add DUAL fee', async () => {
      for (const fee of CARP_NB_VARIANT1_FEES) {
        console.log(`[carp-nb-variant1] adding fee: ${fee.type} / ${fee.subType}`);
        const clausesFees = new ClausesFeesPage(page, fee);
        await clausesFees.addFee(carpQuoteId);
      }
    });
  }

  if (process.env.CARP_NB_VARIANT1_SKIP_ERN !== '1') {
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
    await policy.assertState(CARP_NB_VARIANT1_POLICY_EXPECTATIONS.status, CARP_NB_VARIANT1_POLICY_EXPECTATIONS.newMtaRenewal);
    console.log(`CARP NB-Variant1 policy created: ${policyNumber}`);
  });
});
