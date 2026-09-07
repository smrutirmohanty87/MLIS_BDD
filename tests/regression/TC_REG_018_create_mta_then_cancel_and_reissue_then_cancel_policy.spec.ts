import { expect, test } from '@playwright/test';
import {
  FinalPolicyDetailsPage,
  LoginPage,
  OrderDialog,
  PolicyIssuedPage,
  ProductSelectionPage,
  QuoteManagerPage,
  QuotesPage,
  StatementsOfFactPage,
  SummaryPage,
} from '../../src/pages/mlis-portal';
import { BrokerPortalPage } from '../../src/pages/broker-portal-policy';
import { SalesforcePortalPage } from '../../src/pages/salesforce-cancellation';
import { getBrokerCredentials, getSalesforceCredentials } from '../../src/config/env';

const assertBdxAsFields = async (page: import('@playwright/test').Page, status: 'Paid' | 'Written') => {
  const as0023Field = page
    .locator('records-record-layout-item:visible, .slds-form-element:visible')
    .filter({ hasText: /AS0023/i })
    .first();
  const as0028Field = page
    .locator('records-record-layout-item:visible, .slds-form-element:visible')
    .filter({ hasText: /AS0028|AS00228/i })
    .first();

  await expect(as0023Field).toBeVisible({ timeout: 120000 });
  await expect(as0028Field).toBeVisible({ timeout: 120000 });

  const as0023Text = (await as0023Field.innerText()).replace(/\s+/g, ' ').trim();
  const as0028Text = (await as0028Field.innerText()).replace(/\s+/g, ' ').trim();

  console.log(`[BDX ASSERT] ${status} line AS0023 field value: ${as0023Text}`);
  console.log(`[BDX ASSERT] ${status} line AS0028 field value: ${as0028Text}`);

  expect(as0023Text).toMatch(/AS0023/i);
  expect(as0023Text.replace(/AS0023/i, '').trim().length).toBeGreaterThan(0);
  expect(as0028Text).toMatch(/AS0028|AS00228/i);
  expect(as0028Text.replace(/AS0028|AS00228/i, '').trim().length).toBeGreaterThan(0);
};

test.describe('@regression | E2E | MTA | Cancel and Reissue | Cancellation', () => {
  test('TC_REG_018 | Create MTA then cancel and reissue then cancel the policy', async ({ page }) => {
    test.setTimeout(900000);
    test.slow();

    const caseRef = `E2E-MTA-CR-CAN-${Date.now()}`;

    const brokerLogin = new LoginPage(page);
    const quoteManager = new QuoteManagerPage(page);
    const productSelection = new ProductSelectionPage(page);
    const statements = new StatementsOfFactPage(page);
    const quotes = new QuotesPage(page);
    const finalDetails = new FinalPolicyDetailsPage(page);
    const summary = new SummaryPage(page);
    const orderDialog = new OrderDialog(page);
    const policyIssued = new PolicyIssuedPage(page);

    const brokerPortal = new BrokerPortalPage(page);
    const salesforce = new SalesforcePortalPage(page);

    // Create a fresh policy in Broker Portal
    await brokerLogin.goto();
    const brokerCreds = getBrokerCredentials();
    await brokerLogin.login(brokerCreds.username, brokerCreds.password);
    await quoteManager.expectLoaded();
    await quoteManager.acceptCookiesIfVisible();

    await quoteManager.startResidentialEnglandWalesQuote();
    await productSelection.expectLoaded();
    await productSelection.fillCaseReferenceAndLimit(caseRef, '500000');
    await productSelection.selectProductsByIndex([1]);
    await productSelection.proceed();

    await statements.expectLoaded();
    await statements.confirmAllStatements();
    await statements.proceed();

    await quotes.expectLoaded();
    await quotes.selectFirstQuote();

    await finalDetails.expectLoaded();
    await finalDetails.fillRequiredDetails();
    await finalDetails.proceed();

    await summary.expectLoaded();
    await summary.expectSummaryData(caseRef);
    await summary.proceedToOrder();
    await orderDialog.selectTodayAndOrder();

    await policyIssued.expectPolicyIssued();
    const policyNumber = await policyIssued.getIssuedPolicyNumber();
    await policyIssued.backToQuoteManager();

    // Verify policy is live
    await brokerPortal.expectQuoteManagerLoaded();
    await brokerPortal.searchPolicy(policyNumber);
    await brokerPortal.expectPolicyStatus(policyNumber, 'Live');

    // Login to Salesforce Portal
    await salesforce.goto();
    const sfCreds = getSalesforceCredentials();
    await salesforce.login(sfCreds.username, sfCreds.password, { useJwt: true, fast: true });

    // Global Search → open the exact policy number from the results grid
    await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);

    // Navigate to Related tab → open Insurance Policy record
    await salesforce.openRelatedTab();
    await salesforce.openInsurancePolicyFromRelated(policyNumber);

    // Create MTA
    await salesforce.openCreateMTADialog();
    await salesforce.fillMTAReasonAndSave('Non Material Amendment', 'MTA Description - mandatory field update');
    await salesforce.fillIntermediaryReference(`MTA-REF-${Date.now()}`);
    await salesforce.editMTAPremium('200');
    await salesforce.bindMTA();

    // // Re-open the policy record after binding MTA, then run the Cancel and Reissue dialog.
    // await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);
    // await salesforce.openRelatedTab();
    // await salesforce.openInsurancePolicyFromRelated(policyNumber);

    // Open Cancel and Reissue dialog from "Show more actions" menu
    await salesforce.openCancelAndReissueDialog();

    // Fill the Cancel and Reissue Details dialog and submit
    await salesforce.completeCancelAndReissueDialog({
      reasonForCR: 'User Error Correction',
      description: `Cancel and reissue after MTA test (${policyNumber})`,
    });

    // New CnR flow: on Final policy details, return to submission, then bind MTA.
    await expect(page.getByRole('heading', { name: /Quote Journey/i })).toBeVisible({ timeout: 120000 });
    await expect(page.getByRole('heading', { name: /Final policy details/i })).toBeVisible({ timeout: 120000 });
    await page.waitForTimeout(5000);

    const returnToSubmission = page
      .getByRole('button', { name: /Return to submission/i })
      .or(page.getByRole('link', { name: /Return to submission/i }))
      .first();

    await expect(returnToSubmission).toBeVisible({ timeout: 60000 });
    await returnToSubmission.click();
    await page.waitForLoadState('domcontentloaded');
    await page.waitForTimeout(5000);

    await salesforce.bindMTA();

    // // Re-open the policy from global search to avoid stale record context.
    // await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);
    // await salesforce.openRelatedTab();
    // await salesforce.openInsurancePolicyFromRelatedStable(policyNumber);

    // Step 10: Open Cancel Policy wizard from "Show more actions" menu
    await salesforce.openCancelPolicyWizard();

    // Step 11: Fill Cancel Policy Step 1 — category, instigated by, reason, notes
    await salesforce.completeCancelFromInceptionStep1(
      `Policy cancellation from inception - full premium return test (${policyNumber})`,
    );
  // Step 12: Calculate Tax -> OK -> Next (opt-in flow for this test only)
    await salesforce.completePremiumStepCalculateTaxOkAndNext();

    // Step 13: Click Next and wait for cancellation status/page
    // await salesforce.submitCancellation();
    await salesforce.expectPolicyStatusCancelled();

    await salesforce.openRelatedTab();
    const bdxCard = page.locator('article:visible').filter({ hasText: /\bBDX\b/i }).first();
    await bdxCard.scrollIntoViewIfNeeded();
    await expect(bdxCard).toBeVisible({ timeout: 120000 });

    const viewAll = bdxCard.getByRole('link', { name: /^View All/i }).first();
    const bdxHeader = bdxCard.getByRole('link', { name: /\bBDX\b/i }).first();
    if (await viewAll.isVisible({ timeout: 3000 }).catch(() => false)) {
      await viewAll.click();
    } else if (await bdxHeader.isVisible({ timeout: 3000 }).catch(() => false)) {
      await bdxHeader.click();
    }

    const bdxTable = page.locator('table:visible').filter({ hasText: /BDX-/i }).first();
    await expect(bdxTable).toBeVisible({ timeout: 120000 });
    await expect.poll(async () => bdxTable.locator('tbody tr').count(), { timeout: 120000 }).toBeGreaterThan(0);

    const openBdxLine = async (lineStatus: 'Paid' | 'Written') => {
      const row = bdxTable
        .locator('tbody tr:visible')
        .filter({ hasText: /endorsement\s+cancellation|cancel|cancelled/i })
        .filter({ hasText: lineStatus })
        .first();
      const rowLink = row.locator('th[scope="row"] a:visible, td a:visible').first();
      await expect(rowLink).toBeVisible({ timeout: 120000 });
      await rowLink.click();
      await assertBdxAsFields(page, lineStatus);
    };

    await openBdxLine('Paid');
    await page.goBack({ waitUntil: 'domcontentloaded' });
    await salesforce.openRelatedTab().catch(() => undefined);
    await openBdxLine('Written');
  });
});
