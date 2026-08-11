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
import { TCRegSharedUtilsPage } from '../../src/pages/tc-reg-shared-utils';
import { getBrokerCredentials, getSalesforceCredentials } from '../../src/config/env';

test.describe('@regression | E2E | MTA', () => {
  test('TC_REG_030 | Create 2 MTA and assert premiums from Source Submission Quotes tab', async ({ page }) => {
    test.setTimeout(900000);
    test.slow();

    const caseRef = `E2E-MTA2-${Date.now()}`;
    const mtaPremium1 = '125';
    const mtaPremium2 = '275';

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
    const regUtils = new TCRegSharedUtilsPage(page);

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

    // Step 5-6: Global Search -> open the exact policy number from the results grid
    await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);

    // Navigate to Related tab -> open Insurance Policy record
    await salesforce.openRelatedTab();
    await salesforce.openInsurancePolicyFromRelated(policyNumber);

    // MTA #1
    await salesforce.openCreateMTADialog();
    await salesforce.fillMTAReasonAndSave('Non Material Amendment', 'MTA Description - mandatory field update');
    await salesforce.fillIntermediaryReference(`MTA1-REF-${Date.now()}`);
    await salesforce.editMTAPremium(mtaPremium1);
    await salesforce.bindMTA();

    // // Re-open Insurance Policy record for MTA #2
    // await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);
    // await salesforce.openRelatedTab();
    // await salesforce.openInsurancePolicyFromRelated(policyNumber);

    // MTA #2
    await salesforce.openCreateMTADialog();
    await salesforce.fillMTAReasonAndSave('Limit Increase', 'MTA Description - mandatory field update');
    await salesforce.fillIntermediaryReference(`MTA2-REF-${Date.now()}`);
    await salesforce.editMTAPremium(mtaPremium2);
    await salesforce.bindMTA();

    // After 2nd MTA: open Details tab -> Source Submission Name link.
    const detailsTab = page.getByRole('tab', { name: /^Details$/i }).first();
    await expect(detailsTab).toBeVisible({ timeout: 120000 });
    await detailsTab.click();

    await page.evaluate(() => window.scrollBy(0, 1200));

    const sourceSubmissionLink = await regUtils.pickFirstVisible([
      page
        .locator('records-record-layout-item:has-text("Source Submission Name") a:visible')
        .filter({ hasText: /DA-MLI-|Sub-/i }),
      page
        .locator('[data-label="Source Submission Name"] a:visible')
        .filter({ hasText: /DA-MLI-|Sub-/i }),
      page
        .locator('records-record-layout-item:has-text("Source Submission Name") a:visible')
        .first(),
      page
        .locator('[data-label="Source Submission Name"] a:visible')
        .first(),
    ], 120000);

    await sourceSubmissionLink.click();
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);

    // Go to Quotes tab and assert MTA Premium (inc. IPT) values match entered MTAs.
    await salesforce.openQuotesTab1();

    const quotesText = await page.locator('main').innerText();
    expect(quotesText).toMatch(/MTA Premium\s*\(inc\.\s*IPT\)/i);

    const mtaPremiumValue1 = regUtils.extractMtaPremiumForRow(quotesText, /MTA01\/00/i);
    const mtaPremiumValue2 = regUtils.extractMtaPremiumForRow(quotesText, /MTA02\/00/i);

    expect(mtaPremiumValue1).toBe(regUtils.parseMoney(mtaPremium1));
    expect(mtaPremiumValue2).toBe(regUtils.parseMoney(mtaPremium2));
  });
});
