import { expect, test } from '@playwright/test';
import {
  ScotlandCommercialFinalPolicyDetailsPage,
  ScotlandCommercialLoginPage,
  ScotlandCommercialOrderDialog,
  ScotlandCommercialPolicyIssuedPage,
  ScotlandCommercialProductSelectionPage,
  ScotlandCommercialQuoteManagerPage,
  ScotlandCommercialQuotesPage,
  ScotlandCommercialStatementsOfFactPage,
  ScotlandCommercialSummaryPage,
} from '../../src/pages/mlis-portal-scotland-commercial';
import { SalesforceNotesAttachmentsEwPage } from '../../src/pages/salesforce-notes-attachments-ew';
import { getBrokerCredentials, getSalesforceCredentials } from '../../src/config/env';

test.describe('@regression | E2E | Notes & Attachments | Commercial', () => {
  test('TC_REG_013 | Open Notes & Attachments in Salesforce (Commercial Scotland policy)', async ({ page }) => {
    test.setTimeout(1200000);
    test.slow();

    const caseRef = `E2E-NOTES-COMM-SCOT-${Date.now()}`;

    const brokerLogin = new ScotlandCommercialLoginPage(page);
    const quoteManager = new ScotlandCommercialQuoteManagerPage(page);
    const productSelection = new ScotlandCommercialProductSelectionPage(page);
    const statements = new ScotlandCommercialStatementsOfFactPage(page);
    const quotes = new ScotlandCommercialQuotesPage(page);
    const finalDetails = new ScotlandCommercialFinalPolicyDetailsPage(page);
    const summary = new ScotlandCommercialSummaryPage(page);
    const orderDialog = new ScotlandCommercialOrderDialog(page);
    const policyIssued = new ScotlandCommercialPolicyIssuedPage(page);
    const salesforce = new SalesforceNotesAttachmentsEwPage(page);

    // Step 1: Login to Broker Portal
    await brokerLogin.goto();
    const brokerCreds = getBrokerCredentials();
    await brokerLogin.login(brokerCreds.username, brokerCreds.password);
    await quoteManager.expectLoaded();
    await quoteManager.acceptCookiesIfVisible();

    // Step 2: Create a policy (Commercial Scotland)
    await quoteManager.startCommercialScotlandQuote();
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

    // Step 3: Capture policy number
    await policyIssued.expectPolicyIssued();
    const policyLabel = page.locator('strong', { hasText: 'Policy number' });
    await expect(policyLabel).toBeVisible({ timeout: 60000 });
    const policyNumber = (await policyLabel.locator('xpath=following::p[1]').first().innerText()).trim();

    // Step 4: Login to Salesforce Portal
    await salesforce.goto();
    const sfCreds = getSalesforceCredentials();
    await salesforce.login(sfCreds.username, sfCreds.password, { useJwt: true, fast: true });

    // Step 5-6: Global Search and open policy from grid by policy number
    await salesforce.searchPolicyAndOpenFromGlobalSearchGrid(policyNumber);

    // Step 7-8: Open Related tab and Notes & Attachments
    await salesforce.openNotesAndAttachmentsFromRelatedTab();

    // Step 9-10: Open each document/link and close; assert still on Notes & Attachments page
    await salesforce.openEachNoteAttachmentAndClose();
    await expect(page.getByRole('heading', { name: /Notes\s*&\s*Attachments/i }).first()).toBeVisible({ timeout: 120000 });
  });
});
