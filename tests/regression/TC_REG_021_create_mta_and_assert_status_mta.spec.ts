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

test.describe('@regression | E2E | MTA', () => {
  test('TC_REG_021 | Create MTA (Mid-Term Adjustment) and assert policy status is MTA', async ({ page }) => {
    test.setTimeout(900000);
    test.slow();

    const caseRef = `E2E-MTA-${Date.now()}`;

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

    // Step 5-6: Global Search → open the exact policy number from the results grid
    await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);

    // Navigate to Related tab → open Insurance Policy record
    await salesforce.openRelatedTab();
    await salesforce.openInsurancePolicyFromRelated(policyNumber);

    // Step 1: Click Create MTA and fill MTA Reason dropdown, then Save
    await salesforce.openCreateMTADialog();
    await salesforce.fillMTAReasonAndSave('Non Material Amendment', 'MTA Description - mandatory field update');

    // Step 2: Fill Intermediary Reference (inline-editable pencil icon field)
    await salesforce.fillIntermediaryReference(`MTA-REF-${Date.now()}`);

    // Step 3: Edit MTA Premium — enter value and press OK
    await salesforce.editMTAPremium('100');

    // Step 4: Bind MTA — insert today's date and click Bind
    await salesforce.bindMTA();

    // Assert: on Insurance Policy, "New/MTA/Renewal" should eventually show "MTA" (not "New Business").
    // Salesforce can update this field asynchronously after binding, so we retry a few times.
    let newMtaRenewalText = '';
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);
      await salesforce.openRelatedTab();
      await salesforce.openInsurancePolicyFromRelated(policyNumber);

      await expect(page.getByRole('heading', { name: /Insurance Policy/i }).first()).toBeVisible({ timeout: 120000 });

      const detailsTab = page.getByRole('tab', { name: /^Details$/i }).first();
      if (await detailsTab.isVisible({ timeout: 3000 }).catch(() => false)) {
        await detailsTab.click();
      }

      const recordLayoutItem = page
        .locator('records-record-layout-item')
        .filter({ has: page.getByText('New/MTA/Renewal', { exact: true }) })
        .first();
      const valueFromRecordLayout = recordLayoutItem.locator('.test-id__field-value').first();

      const valueFromClassicLayout = page
        .locator('xpath=//*[normalize-space()="New/MTA/Renewal"]/ancestor::*[contains(@class,"slds-form-element")][1]')
        .locator('.test-id__field-value, lightning-formatted-text, span')
        .filter({ hasText: /\S/ })
        .first();

      newMtaRenewalText = (await valueFromRecordLayout.innerText().catch(() => '')).trim();
      if (!newMtaRenewalText) {
        newMtaRenewalText = (await valueFromClassicLayout.innerText().catch(() => '')).trim();
      }

      if (/\bMTA\b/i.test(newMtaRenewalText)) break;

      if (attempt < 6) {
        await page.waitForTimeout(15000);
      }
    }

    expect(newMtaRenewalText).toMatch(/\bMTA\b/i);
  });
});
