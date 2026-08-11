// spec: docs/test-plans/mlis-policy-creation.plan.md
// seed: tests/seed.spec.ts

import { expect, test } from '@playwright/test';
import {
  NiCommercialLoginPage,
  NiCommercialQuoteManagerPage,
  NiCommercialProductSelectionPage,
  NiCommercialStatementsOfFactPage,
  NiCommercialQuotesPage,
  NiCommercialFinalPolicyDetailsPage,
  NiCommercialSummaryPage,
  NiCommercialOrderDialog,
  NiCommercialPolicyIssuedPage,
} from '../../src/pages/mlis-portal-ni-commercial';
import { getBrokerCredentials, getSalesforceCredentials } from '../../src/config/env';
import { SalesforcePortalPage } from '../../src/pages/salesforce-cancellation';
import { TCReg052AddTermsPage } from '../../src/pages/tc-reg-052-add-terms';

test.describe('@regression | E2E | Commercial | Northern Ireland', () => {
  test('TC_REG_057 | NB Clauses are correctly generated .', async ({ page }) => {
    test.setTimeout(300000);
    const caseRef = `E2E-COMM-NI-CLAUSE-${Date.now()}`;

    const loginPage = new NiCommercialLoginPage(page);
    const quoteManager = new NiCommercialQuoteManagerPage(page);
    const productSelection = new NiCommercialProductSelectionPage(page);
    const statements = new NiCommercialStatementsOfFactPage(page);
    const quotes = new NiCommercialQuotesPage(page);
    const finalDetails = new NiCommercialFinalPolicyDetailsPage(page);
    const summary = new NiCommercialSummaryPage(page);
    const orderDialog = new NiCommercialOrderDialog(page);
    const policyIssued = new NiCommercialPolicyIssuedPage(page);
    const salesforce = new SalesforcePortalPage(page);
    const reg052 = new TCReg052AddTermsPage(page);

    await loginPage.goto();
    const brokerCreds = getBrokerCredentials();
    await loginPage.login(brokerCreds.username, brokerCreds.password);
    await quoteManager.expectLoaded();

    await quoteManager.startCommercialNorthernIrelandQuote();
    await productSelection.expectLoaded();

    await productSelection.fillCaseReferenceAndLimit(caseRef, '500000');

    await productSelection.selectProductsByIndex([1]);
    await productSelection.proceed();
    await statements.expectLoaded();

    // Capture clause text in memory for future Salesforce comparison work.
    const capturedNbClauseTexts = await statements.confirmAllStatementsWithClauseAssertions();
    const normalizedBrokerClauseTexts = capturedNbClauseTexts.map((text) => text.replace(/\s+/g, ' ').trim());
    console.log('[Broker SOF] Captured clause texts:', JSON.stringify(normalizedBrokerClauseTexts, null, 2));
    await test.info().attach('nb-clauses-sof-texts', {
      body: JSON.stringify(normalizedBrokerClauseTexts, null, 2),
      contentType: 'application/json',
    });

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

    const policyLabel = page.locator('strong', { hasText: 'Policy number' }).first();
    await expect(policyLabel).toBeVisible({ timeout: 20000 });
    const policyNumber = (await policyLabel.locator('xpath=following::p[1]').first().textContent())?.trim() ?? '';
    expect(policyNumber).toMatch(/[A-Z]{2,}-[A-Z]{2,}-\d{6,}/);

    await policyIssued.backToQuoteManager();
    await quoteManager.expectLoaded();

    const sfCreds = getSalesforceCredentials();
    await salesforce.goto();
    await salesforce.login(sfCreds.username, sfCreds.password, { useJwt: true, fast: true });
    await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);
    await salesforce.openRelatedTab();
    await reg052.openSubmissionStatementOfFactsViewAll();

    const salesforceTextColumnValues = await reg052.getSubmissionStatementOfFactsTextColumnValues();
    const normalizedSalesforceTextColumnValues = salesforceTextColumnValues.map((text) => text.replace(/\s+/g, ' ').trim());
    console.log('[Salesforce SOF] Text column values:', JSON.stringify(normalizedSalesforceTextColumnValues, null, 2));

    for (const brokerClauseText of normalizedBrokerClauseTexts) {
      console.log(`[SOF Compare] Broker: ${brokerClauseText}`);
      console.log(`[SOF Compare] Salesforce match exists: ${normalizedSalesforceTextColumnValues.includes(brokerClauseText)}`);
      expect(
        normalizedSalesforceTextColumnValues,
        `Expected Salesforce Submission Statement Of Facts Text column to contain broker clause text: ${brokerClauseText}`,
      ).toContain(brokerClauseText);
    }
  });
});
