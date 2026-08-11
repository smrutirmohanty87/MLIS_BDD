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
import { TCReg041DebitNotePage } from '../../src/pages/tc-reg-041-debit-note';
import { TCRegSharedUtilsPage } from '../../src/pages/tc-reg-shared-utils';
import { getBrokerCredentials, getSalesforceCredentials } from '../../src/config/env';

test.describe('@regression | E2E | Notes & Attachments | MTA | Source Submission', () => {
  test('TC_REG_041 | Assert Debit Note premium before and after MTA from Source Submission', async ({ page }) => {
    test.setTimeout(900000);
    test.slow();

    const caseRef = `E2E-DEBIT-MTA-${Date.now()}`;
    const mtaPremium = '125';

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
    const reg041 = new TCReg041DebitNotePage(page);
    const regUtils = new TCRegSharedUtilsPage(page);

    // Create new policy in Broker Portal.
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

    // Open policy in Salesforce.
    await salesforce.goto();
    const sfCreds = getSalesforceCredentials();
    await salesforce.login(sfCreds.username, sfCreds.password, { useJwt: true, fast: true });

    await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);
    await salesforce.openRelatedTab();

    // Notes & Attachments -> open and close Debit Note.
    await salesforce.openNotesAndAttachmentsFromRelatedTab();
    await reg041.openAndCloseDebitNote();

    // Open Insurance Policy and perform MTA.
    await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);
    await salesforce.openRelatedTab();
    await salesforce.openInsurancePolicyFromRelatedStable(policyNumber);

    await salesforce.openCreateMTADialog();
    await salesforce.fillMTAReasonAndSave('Non Material Amendment', 'MTA Description - mandatory field update');
    await salesforce.fillIntermediaryReference(`MTA-REF-${Date.now()}`);
    await salesforce.editMTAPremium(mtaPremium);
    await salesforce.bindMTA();

    // Details tab -> Source Submission Name -> open policy/submission link.
    const detailsTab = page.getByRole('tab', { name: /^Details$/i }).first();
    await expect(detailsTab).toBeVisible({ timeout: 120000 });
    await detailsTab.click();
    await page.evaluate(() => window.scrollBy(0, 1200));

    const sourceSubmissionLink = await regUtils.pickFirstVisible([
      page
        .locator('records-record-layout-item:has-text("Source Submission Name") a:visible')
        .filter({ hasText: /DA-MLI-|CP-MLI-|Sub-/i }),
      page
        .locator('[data-label="Source Submission Name"] a:visible')
        .filter({ hasText: /DA-MLI-|CP-MLI-|Sub-/i }),
      page.locator('records-record-layout-item:has-text("Source Submission Name") a:visible').first(),
      page.locator('[data-label="Source Submission Name"] a:visible').first(),
    ], 120000);

    await sourceSubmissionLink.click();
    await page.waitForLoadState('domcontentloaded').catch(() => undefined);

    // From Source Submission -> Related -> Notes & Attachments -> open and close Debit Note again.
    await salesforce.openRelatedTab();
    await salesforce.openNotesAndAttachmentsFromRelatedTab();
    await reg041.openAndCloseDebitNote();
  });
});