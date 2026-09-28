import { createBdd, test } from 'playwright-bdd';
import type { Page } from '@playwright/test';
import {
  CommercialLoginPage,
  CommercialQuoteManagerPage,
  CommercialProductSelectionPage,
  CommercialStatementsOfFactPage,
  CommercialQuotesPage,
  CommercialFinalPolicyDetailsPage,
  CommercialSummaryPage,
  CommercialOrderDialog,
  CommercialPolicyIssuedPage,
} from '../../../../src/pages/mlis-portal-commercial';
import { getBrokerCredentials } from '../../../../src/config/env';

const { Given, When, Then } = createBdd(test);

let caseRef = '';

function pages(page: Page) {
  return {
    loginPage: new CommercialLoginPage(page),
    quoteManager: new CommercialQuoteManagerPage(page),
    productSelection: new CommercialProductSelectionPage(page),
    statements: new CommercialStatementsOfFactPage(page),
    quotes: new CommercialQuotesPage(page),
    finalDetails: new CommercialFinalPolicyDetailsPage(page),
    summary: new CommercialSummaryPage(page),
    orderDialog: new CommercialOrderDialog(page),
    policyIssued: new CommercialPolicyIssuedPage(page),
  };
}

Given('I am logged into MLIS commercial quote manager', async ({ page }) => {
  const p = pages(page);
  await p.loginPage.goto();
  const brokerCreds = getBrokerCredentials();
  await p.loginPage.login(brokerCreds.username, brokerCreds.password);
  await p.quoteManager.expectLoaded();
});

When('I start a new commercial England and Wales quote', async ({ page }) => {
  const p = pages(page);
  await p.quoteManager.startCommercialEnglandWalesQuote();
  await p.productSelection.expectLoaded();
});

When('I enter a unique case reference with limit of indemnity 500000', async ({ page }) => {
  const p = pages(page);
  caseRef = `E2E-COMM-MULTI-${Date.now()}`;
  await p.productSelection.fillCaseReferenceAndLimit(caseRef, '500000');
});

When('I select four commercial products and proceed', async ({ page }) => {
  const p = pages(page);
  await p.productSelection.selectProductsByIndex([1, 2, 3, 4]);
  await p.productSelection.proceed();
  await p.statements.expectLoaded();
});

When('I confirm all statements of fact and proceed', async ({ page }) => {
  const p = pages(page);
  await p.statements.confirmAllStatements();
  await p.statements.proceed();
  await p.quotes.expectLoaded();
});

When('I select the first available commercial quote', async ({ page }) => {
  const p = pages(page);
  await p.quotes.selectFirstQuote();
  await p.finalDetails.expectLoaded();
});

When('I enter required final policy details and proceed', async ({ page }) => {
  const p = pages(page);
  await p.finalDetails.fillRequiredDetails();
  await p.finalDetails.proceed();
  await p.summary.expectLoaded();
});

Then('I should see the commercial summary with case and premium details', async ({ page }) => {
  const p = pages(page);
  await p.summary.expectSummaryData(caseRef);
});

When("I place the commercial order using today's date", async ({ page }) => {
  const p = pages(page);
  await p.summary.proceedToOrder();
  await p.orderDialog.selectTodayAndOrder();
});

Then('the commercial policy is issued and I am returned to quote manager', async ({ page }) => {
  const p = pages(page);
  await p.policyIssued.expectPolicyIssued();
  await p.policyIssued.backToQuoteManager();
  await p.quoteManager.expectLoaded();
});
