// spec: docs/test-plans/mlis-policy-creation.plan.md
// seed: tests/seed.spec.ts

import { test } from '@playwright/test';
import {
  LoginPage,
  QuoteManagerPage,
  ProductSelectionPage,
  StatementsOfFactPage,
  QuotesPage,
  FinalPolicyDetailsPage,
  SummaryPage,
  OrderDialog,
  PolicyIssuedPage,
} from '../../src/pages/mlis-portal';
import { getBrokerCredentials } from '../../src/config/env';

test.describe('@regression | E2E | Residential | England & Wales', () => {
  test('TC_REG_061 | Create Residential England & Wales policy (end-to-end)', async ({ page }) => {
    test.setTimeout(120000);
    const caseRef = `E2E-EW-${Date.now()}`;

    const loginPage = new LoginPage(page);
    const quoteManager = new QuoteManagerPage(page);
    const productSelection = new ProductSelectionPage(page);
    const statements = new StatementsOfFactPage(page);
    const quotes = new QuotesPage(page);
    const finalDetails = new FinalPolicyDetailsPage(page);
    const summary = new SummaryPage(page);
    const orderDialog = new OrderDialog(page);
    const policyIssued = new PolicyIssuedPage(page);

    // 1) Login with valid credentials and accept cookie consent. Verify Quote Manager dashboard loads.
    await loginPage.goto();
    const brokerCreds = getBrokerCredentials();
    await loginPage.login(brokerCreds.username, brokerCreds.password);
    await quoteManager.expectLoaded();
    await quoteManager.acceptCookiesIfVisible();

    // 2) Navigate from Quote Manager to a Residential England & Wales quote. Verify Product Selection loads.
    await quoteManager.startResidentialEnglandWalesQuote();
    await productSelection.expectLoaded();

    // 3) Complete product selection details and proceed. Verify Statements of Fact loads.
    await productSelection.fillCaseReferenceAndLimit(caseRef, '500000');
    await productSelection.selectProductsByIndex([1]);
    await productSelection.proceed();
    await statements.expectLoaded();

    // 4) Confirm all statements and proceed to quotes. Verify Quotes page loads.
    await statements.confirmAllStatements();
    await statements.proceed();
    await quotes.expectLoaded();

    // 5) Select an available quote and proceed. Verify Final Policy Details loads.
    await quotes.selectFirstQuote();
    await finalDetails.expectLoaded();

    // 6) Enter final policy details and proceed. Verify Summary page loads.
    await finalDetails.fillRequiredDetails();
    await finalDetails.proceed();
    await summary.expectLoaded();

    // 7) Validate summary values for the selected quote and case reference.
    await summary.expectSummaryData(caseRef);

    // 8) Place the order and verify policy issuance, then return to Quote Manager.
    await summary.proceedToOrder();
    await orderDialog.selectTodayAndOrder();
    await policyIssued.expectPolicyIssued();
    await policyIssued.backToQuoteManager();
    await quoteManager.expectLoaded();
  });
});
