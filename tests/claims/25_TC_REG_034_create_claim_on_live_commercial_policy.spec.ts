import { test } from '@playwright/test';
import {
  CommercialFinalPolicyDetailsPage,
  CommercialLoginPage,
  CommercialOrderDialog,
  CommercialPolicyIssuedPage,
  CommercialProductSelectionPage,
  CommercialQuoteManagerPage,
  CommercialQuotesPage,
  CommercialStatementsOfFactPage,
  CommercialSummaryPage,
} from '../../src/pages/mlis-portal-commercial';
import { BrokerPortalPage } from '../../src/pages/broker-portal-policy';
import { SalesforcePortalPage } from '../../src/pages/salesforce-cancellation';
import { getBrokerCredentials } from '../../src/config/env';

test.describe('@regression | E2E | Claims | Commercial', () => {
  test('TC_REG_034_COMM | Create Claim on a live commercial policy and submit mandatory details', async ({ page }) => {
    test.setTimeout(900000);
    test.slow();

    const caseRef = `E2E-COMM-CLAIM-${Date.now()}`;

    const brokerLogin = new CommercialLoginPage(page);
    const quoteManager = new CommercialQuoteManagerPage(page);
    const productSelection = new CommercialProductSelectionPage(page);
    const statements = new CommercialStatementsOfFactPage(page);
    const quotes = new CommercialQuotesPage(page);
    const finalDetails = new CommercialFinalPolicyDetailsPage(page);
    const summary = new CommercialSummaryPage(page);
    const orderDialog = new CommercialOrderDialog(page);
    const policyIssued = new CommercialPolicyIssuedPage(page);

    const brokerPortal = new BrokerPortalPage(page);
    const salesforce = new SalesforcePortalPage(page);

    const getClaimUserCredentials = () => {
      const rawEnv = (process.env.TEST_ENV ?? 'SIT1').trim().toUpperCase();
      const envName = rawEnv;
      const usernameVar = `SALEFORCE_${envName}_CLAIMUSER`;
      const passwordVar = `SALEFORCE_${envName}_CLAIMUSER_PASSWORD`;

      const username = process.env[usernameVar]?.trim();
      const password = process.env[passwordVar]?.trim();
      if (username && password) {
        return { username, password };
      }

      throw new Error(
        `Missing claim user credentials for ${envName}. Set ${usernameVar} and ${passwordVar} in .env for commercial claims flow.`,
      );
    };

    await brokerLogin.goto();
    const brokerCreds = getBrokerCredentials();
    await brokerLogin.login(brokerCreds.username, brokerCreds.password);
    await quoteManager.expectLoaded();
    await quoteManager.acceptCookiesIfVisible();

    await quoteManager.startCommercialEnglandWalesQuote();
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

    const policyNumber = await policyIssued.expectPolicyIssued();
    await policyIssued.backToQuoteManager();

    await brokerPortal.expectQuoteManagerLoaded();
    await brokerPortal.searchPolicy(policyNumber);
    await brokerPortal.expectPolicyStatus(policyNumber, 'Live');

    await salesforce.goto();
    const sfCreds = getClaimUserCredentials();
    await salesforce.login(sfCreds.username, sfCreds.password, { useJwt: false, fast: true });
    await salesforce.closeAllWorkspaceTabs();

    await salesforce.openCreateClaimFromSubmissionViaRiskId(policyNumber);
    await salesforce.selectClaimCoverage();
    await salesforce.completeClaimPostCreationFlowAndAssertIncurred();
  });
});