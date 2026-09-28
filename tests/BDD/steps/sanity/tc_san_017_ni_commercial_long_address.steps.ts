import { createBdd, test } from 'playwright-bdd';
import {
  NiCommercialFinalPolicyDetailsPage,
  NiCommercialLoginPage,
  NiCommercialOrderDialog,
  NiCommercialPolicyIssuedPage,
  NiCommercialProductSelectionPage,
  NiCommercialQuoteManagerPage,
  NiCommercialQuotesPage,
  NiCommercialStatementsOfFactPage,
  NiCommercialSummaryPage,
} from '../../../../src/pages/mlis-portal-ni-commercial';
import { getBrokerCredentials } from '../../../../src/config/env';

const { Given, When, Then } = createBdd(test);

let niCaseRef = '';

Given('I log in and start NI commercial quote for long address validation', async ({ page }) => {
  niCaseRef = `E2E-COMM-NI-255ADDR-${Date.now()}`;

  const loginPage = new NiCommercialLoginPage(page);
  const quoteManager = new NiCommercialQuoteManagerPage(page);
  const productSelection = new NiCommercialProductSelectionPage(page);

  await loginPage.goto();
  const brokerCreds = getBrokerCredentials();
  await loginPage.login(brokerCreds.username, brokerCreds.password);
  await quoteManager.expectLoaded();

  await quoteManager.startCommercialNorthernIrelandQuote();
  await productSelection.expectLoaded();
  await productSelection.fillCaseReferenceAndLimit(niCaseRef, '500000');
  await productSelection.selectProductsByIndex([1, 2]);
  await productSelection.proceed();

  const statements = new NiCommercialStatementsOfFactPage(page);
  await statements.expectLoaded();
});

When('I complete NI commercial flow with long manual address', async ({ page }) => {
  const statements = new NiCommercialStatementsOfFactPage(page);
  const quotes = new NiCommercialQuotesPage(page);
  const finalDetails = new NiCommercialFinalPolicyDetailsPage(page);
  const summary = new NiCommercialSummaryPage(page);

  await statements.confirmAllStatements();
  await statements.proceed();

  await quotes.expectLoaded();
  await quotes.selectFirstQuote();

  await finalDetails.expectLoaded();
  await finalDetails.fillRequiredDetailsWithLongAddress();
  await finalDetails.proceed();

  await summary.expectLoaded();
  await summary.expectSummaryDataWithLongAddress(niCaseRef);
  await summary.proceedToOrder();

  const orderDialog = new NiCommercialOrderDialog(page);
  await orderDialog.selectTodayAndOrder();
});

Then('NI commercial policy should be issued and quote manager displayed', async ({ page }) => {
  const policyIssued = new NiCommercialPolicyIssuedPage(page);
  const quoteManager = new NiCommercialQuoteManagerPage(page);

  await policyIssued.expectPolicyIssued();
  await policyIssued.backToQuoteManager();
  await quoteManager.expectLoaded();
});
