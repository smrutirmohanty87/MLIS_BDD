import { createBdd, test } from 'playwright-bdd';
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
} from '../../../../src/pages/mlis-portal';
import { BrokerPortalPage } from '../../../../src/pages/broker-portal-policy';
import { SalesforcePortalPage } from '../../../../src/pages/salesforce-cancellation';
import { getBrokerCredentials, getSalesforceCredentials } from '../../../../src/config/env';

declare const require: (moduleName: string) => any;

const policyData = require('../../../test-data/policy-creation.json') as {
  Insuredname: string;
  Landregisternumber: string;
  legalOfIndemnity: string;
};

const { Given, When, Then } = createBdd(test);

let policyNumber = '';

Given('I create a fresh residential policy from broker portal for cancellation', async ({ page }) => {
  const caseRef = `E2E-CAN-INFULL-${Date.now()}`;

  const brokerLogin = new LoginPage(page);
  const quoteManager = new QuoteManagerPage(page);
  const productSelection = new ProductSelectionPage(page);
  const statements = new StatementsOfFactPage(page);
  const quotes = new QuotesPage(page);
  const finalDetails = new FinalPolicyDetailsPage(page);
  const summary = new SummaryPage(page);
  const orderDialog = new OrderDialog(page);
  const policyIssued = new PolicyIssuedPage(page);

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
  policyNumber = await policyIssued.getIssuedPolicyNumber();
  await policyIssued.backToQuoteManager();
});

Given('I verify the created policy is live in broker portal', async ({ page }) => {
  const brokerPortal = new BrokerPortalPage(page);
  await brokerPortal.expectQuoteManagerLoaded();
  await brokerPortal.searchPolicy(policyNumber);
  await brokerPortal.expectPolicyStatus(policyNumber, 'Live');
});

When('I open the policy in Salesforce insurance policy related record', async ({ page }) => {
  const salesforce = new SalesforcePortalPage(page);
  const sfCreds = getSalesforceCredentials();

  await salesforce.goto();
  await salesforce.login(sfCreds.username, sfCreds.password, { useJwt: true, fast: true });
  await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);
  await salesforce.openRelatedTab();
  await salesforce.openInsurancePolicyFromRelated(policyNumber);
});

When('I complete cancel from inception with full premium return', async ({ page }) => {
  const salesforce = new SalesforcePortalPage(page);
  await salesforce.openCancelPolicyWizard();
  await salesforce.completeCancelFromInceptionStep1(
    `Policy cancellation from inception - full premium return test (${policyNumber})`,
  );
  await salesforce.completePremiumStepWithTaxCalculation();
  await salesforce.submitCancellation();
});

Then('the policy should be cancelled in Salesforce', async ({ page }) => {
  const salesforce = new SalesforcePortalPage(page);
  await salesforce.expectPolicyStatusCancelled();
});
