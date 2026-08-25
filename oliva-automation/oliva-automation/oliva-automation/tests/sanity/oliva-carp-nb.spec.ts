import { test, expect } from '@playwright/test';
import { jwtLogin, sfQueryOne } from '../../src/auth/sfJwt';
import { waitForSpinners, closeAllWorkspaceTabs } from '../../src/utils/sf';
import { AccountsPage } from '../../src/pages/AccountsPage';
import { SubmissionWizardPage } from '../../src/pages/SubmissionWizardPage';
import { SubmissionPage } from '../../src/pages/SubmissionPage';
import { QuoteWizardPage } from '../../src/pages/QuoteWizardPage';
import { QuotePage } from '../../src/pages/QuotePage';
import { OmniScriptFormPage } from '../../src/pages/OmniScriptFormPage';
import { PremiumPage } from '../../src/pages/PremiumPage';
import { BindersPage } from '../../src/pages/BindersPage';
import { ClausesFeesPage } from '../../src/pages/ClausesFeesPage';
import { QuoteStatusPage } from '../../src/pages/QuoteStatusPage';
import { PolicyPage } from '../../src/pages/PolicyPage';
import { renoIssueAndBond } from '../../src/flows/renoIssueAndBond';
import {
  CARP_ACCOUNT, CARP_CLIENT_INFO, CARP_RISK_INFO, CARP_INSURABLE,
  CARP_PRODUCT_FORM, CARP_COVERAGES, CARP_PREMIUMS, CARP_MINIMUM_DEPOSIT,
  CARP_BINDERS, CARP_FEES, CARP_UAL, CARP_USERS, CARP_POLICY_EXPECTATIONS,
} from '../../src/data/carpData';

/**
 * End-to-end: Oliva Construction "Contractors All Risks - Project" (CARP)
 * New Business policy on the newprodqa2 sandbox. Auth is JWT (no password/
 * MFA): UW5 (T-0016) for the whole flow by default. CARP_LOGIN_USER=uw3 switches
 * to UW3 (exercises the conditional UAL referral branch). Reuses the Renovation
 * framework: generic OmniScript form engine for the 5-step product questionnaire
 * + 8 coverage forms, standalone-page Add Fee (Ã—3), bulk "Confirm No Manual RBS
 * Referral Reasons", Path-driven issue/bond.
 */
test('create Contractors All Risks - Project NB policy end-to-end', async ({ page, browser }) => {
  test.setTimeout(45 * 60 * 1000);

  const accounts = new AccountsPage(page);
  const wizard = new SubmissionWizardPage(page);
  const submission = new SubmissionPage(page);
  const quoteWizard = new QuoteWizardPage(page);
  const quote = new QuotePage(page);
  const forms = new OmniScriptFormPage(page);
  const premiums = new PremiumPage(page);
  const binders = new BindersPage(page, CARP_BINDERS[0], CARP_BINDERS);
  const status = new QuoteStatusPage(page, CARP_UAL);
  const policy = new PolicyPage(page);

  // The source doc runs the whole flow as UW5 (default, doc-exact).
  // CARP_LOGIN_USER=uw3 switches to UW3 (exercises the conditional UAL referral branch).
  const loginUser = process.env.CARP_LOGIN_USER === 'uw3' ? CARP_USERS.uw3 : CARP_USERS.uw5;

  await test.step(`Login as Construction ${process.env.CARP_LOGIN_USER === 'uw3' ? 'UW3' : 'UW5'} (JWT â€” no MFA)`, async () => {
    await jwtLogin(page, loginUser);
  });

  // Fast-iteration escape hatch: CARP_QUOTE_ID resumes at binders on an
  // existing quote (which must already have coverages + premiums entered).
  const resumeQuoteId = process.env.CARP_QUOTE_ID;
  let carpQuoteId = resumeQuoteId ?? '';
  if (resumeQuoteId) {
    await test.step(`Resume from existing quote ${resumeQuoteId}`, async () => {
      // newprodqa2 restores remembered console tabs and can focus a stale one â€”
      // nuke all workspace tabs, then reopen the quote as the sole active tab.
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
      CARP_USERS.uw3,
      `SELECT Id FROM Account WHERE Name = '${CARP_ACCOUNT.name}' LIMIT 1`
    );
    if (!acc?.Id) throw new Error(`Account not found: ${CARP_ACCOUNT.name}`);
    await page.goto(`/lightning/r/Account/${acc.Id}/view`);
    await waitForSpinners(page);
    await accounts.startNewOlivaSubmission();
  });

  await test.step('Complete submission wizard', async () => {
    await wizard.fillSubmissionSource(CARP_ACCOUNT.intermediaryContact);
    await wizard.fillClientInformation(CARP_CLIENT_INFO as never);
    await wizard.fillRiskInformation({ ...CARP_RISK_INFO, quoteRequiredOffsetDays: 5 } as never);
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
    console.log(`[carp] clean quote id for resume: ${carpQuoteId}`);
  });

  await test.step('Fill product-level CARP questionnaire (5 steps)', async () => {
    await quote.editRenovationProductQuestions('Contractors All Risks - Project');
    await forms.fill(CARP_PRODUCT_FORM);
  });

  await test.step(`Add ${CARP_COVERAGES.length} CARP coverages`, async () => {
    for (const cov of CARP_COVERAGES) {
      await quote.addRenoCoverage(CARP_INSURABLE.insurableName, cov.addRowName);
      await forms.fill(cov.form);
    }
  });

  await test.step('Enter premiums (Minimum & Deposit = Yes)', async () => {
    await quote.clickEnterPremiums();
    await premiums.answerMinimumDeposit(CARP_MINIMUM_DEPOSIT);
    await premiums.fillAndSubmit(CARP_PREMIUMS);
  });

  } // end non-resume (submission â†’ premiums)

  if (process.env.CARP_SKIP_BINDERS !== '1') {
    await test.step('Select binders for all risks', async () => {
      await binders.selectAllBinders();
    });
  }

  if (process.env.CARP_SKIP_RBS !== '1') {
    await test.step('RBS â€” Confirm No Manual RBS Referral Reasons', async () => {
      await status.confirmNoManualRbsReferralReasons();
    });
  }

  if (process.env.CARP_SKIP_FEE !== '1') {
    await test.step('Add 3 fees', async () => {
      for (const fee of CARP_FEES) {
        console.log(`[carp] adding fee: ${fee.type} / ${fee.subType}`);
        const clausesFees = new ClausesFeesPage(page, fee);
        await clausesFees.addFee(carpQuoteId);
      }
    });
  }

  if (process.env.CARP_SKIP_ERN !== '1') {
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
    await policy.assertState(CARP_POLICY_EXPECTATIONS.status, CARP_POLICY_EXPECTATIONS.newMtaRenewal);
    console.log(`CARP policy created: ${policyNumber}`);
  });
});

