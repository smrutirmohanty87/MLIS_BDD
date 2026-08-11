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

test.describe('@regression | E2E | MTA | No Bind | Related Counts', () => {
  test('TC_REG_046 | Create MTA without bind, assert Insurance Policies (0) and Quotes (1), open Quote', async ({ page }) => {
    test.setTimeout(900000);
    test.slow();

    const caseRef = `E2E-MTA-NOBIND-${Date.now()}`;

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

    // Create a fresh live policy in Broker Portal.
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

    // Verify policy is live.
    await brokerPortal.expectQuoteManagerLoaded();
    await brokerPortal.searchPolicy(policyNumber);
    await brokerPortal.expectPolicyStatus(policyNumber, 'Live');

    // Open policy in Salesforce and start MTA.
    await salesforce.goto();
    const sfCreds = getSalesforceCredentials();
    await salesforce.login(sfCreds.username, sfCreds.password, { useJwt: true, fast: true });

    await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);
    await salesforce.openRelatedTab();
    await salesforce.openInsurancePolicyFromRelatedStable(policyNumber);

    await salesforce.openCreateMTADialog();
    await salesforce.fillMTAReasonAndSave(
      'Non Material Change',
      `MTA Description - no bind related counts for ${policyNumber}`,
    );
    await salesforce.fillIntermediaryReference(`MTA-REF-${Date.now()}`);
    await salesforce.editMTAPremium('125');

    // Do NOT bind MTA. Go to Related tab, then scroll to Insurance Policies and Quotes.
    await salesforce.openRelatedTab();
    await page.mouse.wheel(0, 1200);

    const insurancePoliciesCountLink = page
      .getByRole('link', { name: /Insurance Policies\s*\(\s*0\s*\)/i })
      .or(page.locator('a:visible').filter({ hasText: /Insurance Policies\s*\(\s*0\s*\)/i }))
      .first();
    await insurancePoliciesCountLink.scrollIntoViewIfNeeded();
    await expect(insurancePoliciesCountLink).toBeVisible({ timeout: 120000 });

    const quotesCountLink = page
      .getByRole('link', { name: /Quotes\s*\(\s*1\s*\)/i })
      .or(page.locator('a:visible').filter({ hasText: /Quotes\s*\(\s*1\s*\)/i }))
      .first();

    await page.mouse.wheel(0, 1200);
    await quotesCountLink.scrollIntoViewIfNeeded();
    await expect(quotesCountLink).toBeVisible({ timeout: 120000 });
    await quotesCountLink.click();

    // Open first quote row and end flow.
    const firstQuoteLink = page
      .locator('table:visible tbody tr a:visible')
      .filter({ hasText: /\S+/ })
      .first();
    await expect(firstQuoteLink).toBeVisible({ timeout: 60000 });
    await firstQuoteLink.click();

    await expect(page.getByRole('heading', { name: /Quote|Quote Journey/i }).first()).toBeVisible({ timeout: 60000 });
  });
});
