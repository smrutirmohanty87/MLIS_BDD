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

declare const require: (moduleName: string) => any;
const policyData = require('../test-data/policy-creation.json') as {
  Insuredname: string;
  Landregisternumber: string;
  legalOfIndemnity: string;
};

test.describe('@sanity | E2E | EW Residential | DUAL Share GWP', () => {
  test('TC_SAN_013 | Verify DUAL Share GWP value is consistent across Insurance Policy details', async ({ page }) => {
    test.setTimeout(900000);
    test.slow();

    const caseRef = `E2E-SAN-DUAL-GWP-${Date.now()}`;

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

    // Broker Portal: create EW Residential policy.
    await brokerLogin.goto();
    const brokerCreds = getBrokerCredentials();
    await brokerLogin.login(brokerCreds.username, brokerCreds.password);
    await quoteManager.expectLoaded();
    await quoteManager.acceptCookiesIfVisible();

    await quoteManager.startResidentialEnglandWalesQuote();
    await productSelection.expectLoaded();
    await productSelection.fillCaseReferenceAndLimit(caseRef, policyData.legalOfIndemnity);
    await productSelection.selectProductsByIndex([1]);
    await productSelection.proceed();

    await statements.expectLoaded();
    await statements.confirmAllStatements();
    await statements.proceed();

    await quotes.expectLoaded();
    await quotes.selectFirstQuote();

    await finalDetails.expectLoaded();
    await finalDetails.fillRequiredDetails({
      insuredName: policyData.Insuredname,
      landRegisterNumber: policyData.Landregisternumber,
    });
    await finalDetails.proceed();

    await summary.expectLoaded();
    await summary.expectSummaryData(caseRef, {
      limitOfIndemnity: policyData.legalOfIndemnity,
      insuredName: policyData.Insuredname,
    });
    await summary.proceedToOrder();
    await orderDialog.selectTodayAndOrder();

    await policyIssued.expectPolicyIssued();
    const policyNumber = await policyIssued.getIssuedPolicyNumber();
    await policyIssued.backToQuoteManager();

    // Confirm policy is live.
    await brokerPortal.expectQuoteManagerLoaded();
    await brokerPortal.searchPolicy(policyNumber);
    await brokerPortal.expectPolicyStatus(policyNumber, 'Live');

    // Step 4: Login to Salesforce Portal
    await salesforce.goto();
    const sfCreds = getSalesforceCredentials();
    await salesforce.login(sfCreds.username, sfCreds.password, { useJwt: true, fast: true });

    // Step 5-6: Global Search -> open the exact policy number from the results grid
    await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);

    // Step 7: Navigate to Related tab
    await salesforce.openRelatedTab();

    // Step 8-9: Scroll to Insurance Policy section & open the record
    await salesforce.openInsurancePolicyFromRelated(policyNumber);

    // Go to Details tab on Insurance Policy.
    const detailsTab = page.getByRole('tab', { name: /^Details$/i }).first();
    await expect(detailsTab).toBeVisible({ timeout: 120000 });
    await detailsTab.click();

    const parseCurrency = (raw: string): number => {
      const numeric = Number(raw.replace(/[^\d.-]/g, ''));
      return Number.isFinite(numeric) ? numeric : Number.NaN;
    };

    const extractLabelValues = (sourceText: string, labelRegexSource: string): number[] => {
      const money = '£?\\s*\\d[\\d,]*(?:\\.\\d{1,2})?';
      const regex = new RegExp(`${labelRegexSource}[\\s\\S]{0,120}?(${money})`, 'gi');
      const values: number[] = [];

      for (const match of sourceText.matchAll(regex)) {
        const value = parseCurrency(match[1]);
        if (!Number.isNaN(value)) {
          values.push(value);
        }
      }
      return values;
    };

    const collectDualShareGwpValues = async () => {
      const dualValues: number[] = [];
      const dualSeen = new Set<string>();

      for (let i = 0; i < 8; i += 1) {
        const detailsPanel = page.locator('main:visible, [role="tabpanel"]:visible').first();
        const text = await detailsPanel.innerText().catch(() => '');

        const currentDual = extractLabelValues(text, 'DUAL\\s*Share\\s*GWP');
        for (const value of currentDual) {
          const key = value.toFixed(2);
          if (!dualSeen.has(key)) {
            dualSeen.add(key);
            dualValues.push(value);
          }
        }

        await page.mouse.wheel(0, 1400);
        await page.waitForTimeout(400);
      }

      return dualValues;
    };

    const dualValues = await collectDualShareGwpValues();

    expect(dualValues.length).toBeGreaterThan(0);

    // First visible DUAL Share GWP value is treated as the top reference value.
    const topDualShareGwp = dualValues[0];

    for (const value of dualValues) {
      expect(value).toBeCloseTo(topDualShareGwp, 2);
    }
  });
});
