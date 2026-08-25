import { test, expect } from '@playwright/test';
import { jwtLogin } from '../../src/auth/sfJwt';
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
import { PolicyActionsPage } from '../../src/pages/PolicyActionsPage';
import { PolicyPage } from '../../src/pages/PolicyPage';
import { renoIssueAndBond } from '../../src/flows/renoIssueAndBond';
import { fillElTradeRow } from '../../src/flows/cc2Nb';
import {
  CC2_VAR2_ACCOUNT, CC2_VAR2_CLIENT_INFO, CC2_VAR2_RISK_INFO, CC2_VAR2_PRODUCT_CARD,
  CC2_VAR2_COVERAGES, CC2_VAR2_EL_TRADE, CC2_VAR2_PREMIUMS, CC2_VAR2_MINIMUM_DEPOSIT,
  CC2_VAR2_BINDERS, CC2_VAR2_BINDER_DEFAULT, CC2_VAR2_FEES, CC2_VAR2_UAL, CC2_VAR2_USERS,
  CC2_VAR2_EXPECTATIONS, CC2_VAR2_MTA, CC2_VAR2_CANCELLATION,
} from '../../src/data/cc2Data-variant2';

/**
 * End-to-end: CC2 Variant 2 - Contractors Combined NBâ†’MTAâ†’Cancellation lifecycle test on SIT.
 * JWT auth (no password/MFA).
 */
test('CC2 Variant 2: Create Contractors Combined NBâ†’MTAâ†’Cancellation lifecycle', async ({ page, browser }) => {
  test.setTimeout(120 * 60 * 1000);

  const accounts = new AccountsPage(page);
  const wizard = new SubmissionWizardPage(page);
  const submission = new SubmissionPage(page);
  const quoteWizard = new QuoteWizardPage(page);
  const quote = new QuotePage(page);
  const forms = new OmniScriptFormPage(page);
  const premiums = new PremiumPage(page);
  const binders = new BindersPage(page, CC2_VAR2_BINDER_DEFAULT, CC2_VAR2_BINDERS);
  const status = new QuoteStatusPage(page, CC2_VAR2_UAL);
  const policy = new PolicyPage(page);
  const loginUser = CC2_VAR2_USERS.uw5;

  await test.step(`Login as UW5 (JWT â€” no MFA)`, async () => {
    await jwtLogin(page, loginUser);
  });

  const resumeQuoteId = process.env.CC2_VAR2_QUOTE_ID;
  let cc2QuoteId = resumeQuoteId ?? '';
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
      await accounts.openAccount(CC2_VAR2_ACCOUNT.name);
      await accounts.startNewOlivaSubmission();
    });

    await test.step('Complete submission wizard', async () => {
      await wizard.fillSubmissionSource(CC2_VAR2_ACCOUNT.intermediaryContact);
      await wizard.fillClientInformation(CC2_VAR2_CLIENT_INFO as never);
      await wizard.fillRiskInformation(CC2_VAR2_RISK_INFO as never);
      await wizard.submitClaimsHistory();
      expect(await submission.riskId()).toMatch(CC2_VAR2_EXPECTATIONS.submissionRiskIdPattern);
    });

    await test.step('Create quote', async () => {
      await submission.createNewQuote();
      await quoteWizard.completeWizard();
      const m = page.url().match(/\/Quote\/(0Q0[A-Za-z0-9]+)\//);
      if (!m?.[1]) {
        throw new Error(`Could not parse quote id from URL: ${page.url()}`);
      }
      cc2QuoteId = m[1];
      console.log(`[cc2-var2] quote id: ${cc2QuoteId}`);
    });

    await test.step('Add coverages', async () => {
      for (const cov of CC2_VAR2_COVERAGES) {
        await quote.addRenoCoverage(CC2_VAR2_PRODUCT_CARD, cov.addRowName);
        if (cov.addRowName === 'Employers Liability') {
          // Trade Details grid row: bespoke fill BEFORE the generic engine
          // (the engine mis-targets the row's combobox â€” live-proven).
          await fillElTradeRow(page, CC2_VAR2_EL_TRADE);
        }
        await forms.fill(cov.form);
        await waitForSpinners(page);
      }
    });


    await test.step('Enter premiums', async () => {
      await quote.clickEnterPremiums();
      await premiums.answerMinimumDeposit(CC2_VAR2_MINIMUM_DEPOSIT);
      await premiums.fillAndSubmit(CC2_VAR2_PREMIUMS);
      await page.goto(`/lightning/r/Quote/${cc2QuoteId}/view`);
      await waitForSpinners(page);
    });
  }

  if (process.env.CC2_VAR2_SKIP_BINDERS !== '1') {
    await test.step('Select binders', async () => {
      await binders.selectAllBinders();
    });
  }

  if (process.env.CC2_VAR2_SKIP_RBS !== '1') {
    await test.step('RBS confirmation', async () => {
      await status.confirmNoManualRbsReferralReasons();
    });
  }

  if (process.env.CC2_VAR2_SKIP_FEE !== '1') {
    await test.step('Add 3 fees', async () => {
      for (const fee of CC2_VAR2_FEES) {
        console.log(`[cc2-var2] adding fee: ${fee.type} / ${fee.subType}`);
        const clausesFees = new ClausesFeesPage(page, fee);
        await clausesFees.addFee(cc2QuoteId, loginUser);
      }
    });
  }

  if (process.env.CC2_VAR2_SKIP_ERN !== '1') {
    await test.step('Set ERN exempt', async () => {
      await status.setErnExempt();
    });
  }

  await test.step('Issue and bond', async () => {
    await renoIssueAndBond(page, browser, status);
  });

  let policyNumber = '';
  await test.step('Create NB policy', async () => {
    policyNumber = await status.createPolicy();
    expect(policyNumber).not.toEqual('');
    await status.goToPolicy();
    console.log(`[cc2-var2] NB policy created: ${policyNumber}`);
  });

  await test.step('Assert NB policy', async () => {
    await policy.assertState(CC2_VAR2_EXPECTATIONS.status);
  });

  await test.step('MTA â€” Mid-term Adjustment', async () => {
    const policyActions = new PolicyActionsPage(page);
    await policyActions.createMta();
    console.log('[cc2-var2] MTA created');

    const mtaQuoteMatch = page.url().match(/\/Quote\/([a-zA-Z0-9]+)\//)?.[1];
    if (!mtaQuoteMatch) {
      throw new Error('Could not parse MTA quote ID from URL');
    }
    const mtaQuoteId = mtaQuoteMatch;

    await page.goto(`/lightning/r/Quote/${mtaQuoteId}/view`);
    await waitForSpinners(page);
    await expect(
      page.getByRole('tab', { name: 'Coverages', exact: true }).first()
    ).toBeVisible({ timeout: 60_000 });

    await quote.clickEnterPremiums();
    await premiums.answerMinimumDeposit(CC2_VAR2_MINIMUM_DEPOSIT);
    await premiums.fillMtaChargeAndSubmitByCoverage(CC2_VAR2_MTA.chargePremiums);
    console.log('[cc2-var2] MTA charge premium submitted');

    await page.goto(`/lightning/r/Quote/${mtaQuoteId}/view`);
    await waitForSpinners(page);

    await status.confirmNoManualRbsReferralReasons();
    console.log('[cc2-var2] MTA RBS confirmation completed');

    await renoIssueAndBond(page, browser, status);
    console.log('[cc2-var2] MTA marked Bound');

    await page.goto(`/lightning/r/Quote/${mtaQuoteId}/view`);
    await waitForSpinners(page);

    const mtaPolicy = await status.createPolicyVersion();
    await status.goToPolicy();
    await policy.assertState(CC2_VAR2_EXPECTATIONS.status);
    console.log(`[cc2-var2] MTA policy validated: ${mtaPolicy}`);
  });

  await test.step('Cancellation', async () => {
    const policyActions = new PolicyActionsPage(page);
    await policyActions.cancelPolicy(CC2_VAR2_CANCELLATION);
    console.log('[cc2-var2] Cancellation initiated and form submitted');

    await page.waitForTimeout(2000);
    console.log(`[cc2-var2] Final URL: ${page.url()}`);

    await policy.assertState(CC2_VAR2_CANCELLATION.policyStatus);
    console.log(`[cc2-var2] Policy cancelled: ${policyNumber}`);
  });
});

