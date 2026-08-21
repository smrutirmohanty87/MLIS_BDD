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
import { renoIssueAndBond } from '../src/flows/renoIssueAndBond';
import { fillElTradeRow } from '../src/flows/ccNb';
import {
  CC2_ACCOUNT,
  CC2_CLIENT_INFO,
  CC2_RISK_INFO,
  CC2_PRODUCT_CARD,
  CC2_PRODUCT_FORM,
  CC2_COVERAGES,
  CC2_PREMIUMS,
  CC2_MINIMUM_DEPOSIT,
  CC2_BINDERS,
  CC2_BINDER_DEFAULT,
  CC2_FEES,
  CC2_UAL,
  CC2_USERS,
  CC2_EXPECTATIONS,
} from '../src/data/cc2DataSRM';

/**
 * End-to-end: Oliva "Contractors Combined" (CONC) New Business policy
 * SRM variant using CC2 SRM dataset.
 */
test('create Contractors Combined NB policy end-to-end [VariantSRM]', async ({ page, browser }) => {
  test.setTimeout(45 * 60 * 1000);

  const accounts = new AccountsPage(page);
  const wizard = new SubmissionWizardPage(page);
  const submission = new SubmissionPage(page);
  const quoteWizard = new QuoteWizardPage(page);
  const quote = new QuotePage(page);
  const forms = new OmniScriptFormPage(page);
  const premiums = new PremiumPage(page);
  const binders = new BindersPage(page, CC2_BINDER_DEFAULT, CC2_BINDERS);
  const rbs = new RbsApprovalPage(page);
  const status = new QuoteStatusPage(page, CC2_UAL);
  const policy = new PolicyPage(page);

  const loginUser = process.env.CC_LOGIN_USER === 'uw3' ? CC2_USERS.uw3 : CC2_USERS.uw5;

  await test.step(`Login as Construction ${process.env.CC_LOGIN_USER === 'uw3' ? 'UW3' : 'UW5'} (JWT - no MFA)`, async () => {
    await jwtLogin(page, loginUser);
  });

  const resumeQuoteId = process.env.CC_QUOTE_ID;
  let ccQuoteId = resumeQuoteId ?? '';
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
      await accounts.openAccount(CC2_ACCOUNT.name);
      await accounts.startNewOlivaSubmission();
    });

    await test.step('Complete submission wizard', async () => {
      await wizard.fillSubmissionSource(CC2_ACCOUNT.intermediaryContact);
      await wizard.fillClientInformation(CC2_CLIENT_INFO as never);
      await wizard.fillRiskInformation({ ...CC2_RISK_INFO, quoteRequiredOffsetDays: 0 } as never);
      await wizard.submitClaimsHistory();
      expect(await submission.riskId()).toMatch(CC2_EXPECTATIONS.submissionRiskIdPattern);
    });

    await test.step('Create quote', async () => {
      await submission.createNewQuote();
      await quoteWizard.completeWizard();
      const m = page.url().match(/\/Quote\/(0Q0[A-Za-z0-9]+)\//);
      if (!m?.[1]) {
        throw new Error(`Could not parse quote id from URL: ${page.url()}`);
      }
      ccQuoteId = m[1];
      console.log(`[cc-srm] clean quote id for resume: ${ccQuoteId}`);
    });

    await test.step('Fill Contractors Combined questionnaire (5 steps)', async () => {
      await quote.editRenovationProductQuestions('Contractors Combined');
      await forms.fill(CC2_PRODUCT_FORM);
    });

    await test.step(`Add ${CC2_COVERAGES.length} product-card coverages from SRM dataset`, async () => {
      for (const cov of CC2_COVERAGES) {
        await quote.addRenoCoverage(CC2_PRODUCT_CARD, cov.addRowName);
        if (cov.addRowName === 'Employers Liability') {
          await fillElTradeRow(page);
        }
        await forms.fill(cov.form);
      }
    });

    await test.step('Enter premiums (Minimum & Deposit = Yes)', async () => {
      await quote.clickEnterPremiums();
      await premiums.answerMinimumDeposit(CC2_MINIMUM_DEPOSIT);
      await premiums.fillAndSubmit(CC2_PREMIUMS);
      await page.goto(`/lightning/r/Quote/${ccQuoteId}/view`);
      await waitForSpinners(page);
    });
  }

  if (process.env.CC_SKIP_BINDERS !== '1') {
    await test.step(`Select binders per coverage (${CC2_BINDERS.length} binders total)`, async () => {
      await binders.selectAllBinders();
    });
  }

  if (process.env.CC_SKIP_RBS !== '1') {
    await test.step('RBS full approval (reasons, carrier, Approved)', async () => {
      await rbs.approveFirstRbs(ccQuoteId);
    });

    await test.step('RBS - Confirm No Manual RBS Referral Reasons', async () => {
      await status.confirmNoManualRbsReferralReasons();
    });
  }

  if (process.env.CC_SKIP_FEE !== '1') {
    await test.step('Add 3 fees', async () => {
      for (const fee of CC2_FEES) {
        console.log(`[cc-srm] adding fee: ${fee.type} / ${fee.subType}`);
        const clausesFees = new ClausesFeesPage(page, fee);
        await clausesFees.addFee(ccQuoteId, loginUser);
      }
    });
  }

  if (process.env.CC_SKIP_ERN !== '1') {
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
    await policy.assertState(CC2_EXPECTATIONS.status, 'New Business', {
      riskIdPattern: CC2_EXPECTATIONS.quoteRiskIdPattern,
    });
    console.log(`Contractors Combined policy created [VariantSRM]: ${policyNumber}`);
  });
});