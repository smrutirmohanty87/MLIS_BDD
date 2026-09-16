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
const policyData = require('../test-data/policy-creation-no-comm.json') as {
  Insuredname: string;
  Landregisternumber: string;
  legalOfIndemnity: string;
};

test.describe('@BDX | E2E | BDX | NO_COMM', () => {
  test('TC_BDX_004_NO_COMM | Verify BDX lines generated', async ({ page }) => {
    test.setTimeout(900000);
    test.slow();

    const caseRef = `E2E-BDX-NOCOMM-${Date.now()}`;

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

    // Create a fresh policy in Broker Portal.
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

    // Verify policy is live.
    await brokerPortal.expectQuoteManagerLoaded();
    await brokerPortal.searchPolicy(policyNumber);
    await brokerPortal.expectPolicyStatus(policyNumber, 'Live');

    // Step 4: Login to Salesforce Portal
    await salesforce.goto();
    const sfCreds = getSalesforceCredentials();
    await salesforce.login(sfCreds.username, sfCreds.password, { useJwt: true, fast: true });

    // Step 5-6: Global Search → open the exact policy number from the results grid
    await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);

    // Step 7: Navigate to Related tab
    await salesforce.openRelatedTab();

    // Step 8-9: Scroll to Insurance Policy section & open the record
    await salesforce.openInsurancePolicyFromRelated(policyNumber);

    // Step 10: Related tab → BDX → View All → assert lines generated
    await salesforce.openRelatedTab();

    const bdxCard = page.locator('article:visible').filter({ hasText: /\bBDX\b/i }).first();

    const scrollLightningContainers = async () => {
      await page.evaluate(() => {
        window.scrollBy(0, 1200);

        const elements = Array.from(document.querySelectorAll<HTMLElement>('*'));
        for (const el of elements) {
          const style = window.getComputedStyle(el);
          const overflowY = style.overflowY;
          if (overflowY !== 'auto' && overflowY !== 'scroll') continue;
          if (el.scrollHeight <= el.clientHeight) continue;
          el.scrollTop += 1200;
        }
      });
    };

    for (let i = 0; i < 25; i += 1) {
      if (await bdxCard.isVisible({ timeout: 500 }).catch(() => false)) {
        break;
      }

      await bdxCard.scrollIntoViewIfNeeded().catch(() => undefined);
      if (await bdxCard.isVisible({ timeout: 500 }).catch(() => false)) {
        break;
      }

      await page.mouse.wheel(0, 1200);
      await scrollLightningContainers();
      await page.waitForTimeout(300);
    }

    await expect(bdxCard).toBeVisible({ timeout: 120000 });

    const bdxInlineRows = bdxCard.locator('tbody tr:visible');
    const bdxViewAllLink = bdxCard.getByRole('link', { name: /^View All/i }).first();
    const bdxHeaderLink = bdxCard.getByRole('link', { name: /\bBDX\b/i }).first();

    await expect
      .poll(async () => {
        if (await bdxInlineRows.first().isVisible({ timeout: 200 }).catch(() => false)) return 'inline';
        if (await bdxViewAllLink.isVisible({ timeout: 200 }).catch(() => false)) return 'viewAll';
        if (await bdxHeaderLink.isVisible({ timeout: 200 }).catch(() => false)) return 'header';

        await page.mouse.wheel(0, 1200);
        await scrollLightningContainers();
        return '';
      }, { timeout: 120000 })
      .not.toBe('');

    if (await bdxViewAllLink.isVisible({ timeout: 1000 }).catch(() => false)) {
      await bdxViewAllLink.click();
    } else if (await bdxHeaderLink.isVisible({ timeout: 1000 }).catch(() => false)) {
      await bdxHeaderLink.click();
    }

    const bdxTable = page.locator('table:visible').first();
    await expect(bdxTable).toBeVisible({ timeout: 120000 });
    await expect.poll(async () => await bdxTable.locator('tbody tr').count(), { timeout: 120000 }).toBeGreaterThan(0);

    await bdxTable.scrollIntoViewIfNeeded();

    const screenshotPath = test.info().outputPath('bdx-lines.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    await test.info().attach('BDX lines', { path: screenshotPath, contentType: 'image/png' });
  });
});
