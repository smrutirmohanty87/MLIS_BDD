import { test } from '@playwright/test';
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

test.describe('@BDX | E2E | BDX | NB_MTA', () => {
  test('TC_BDX_005_NB_MTA | Create NB-MTA (Mid-Term Adjustment) on a live policy', async ({ page }) => {
    test.setTimeout(900000);
    test.slow();

    const caseRef = `E2E-BDX-NB-MTA-${Date.now()}`;

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

    // Global Search → open the exact policy number from the results grid
    await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);

    // Navigate to Related tab → open Insurance Policy record
    await salesforce.openRelatedTab();
    await salesforce.openInsurancePolicyFromRelated(policyNumber);

    // Create MTA and save reason
    await salesforce.openCreateMTADialog();
    await salesforce.fillMTAReasonAndSave('Limit Increase', 'MTA Description - mandatory field update');

    // Fill Intermediary Reference (inline-editable pencil icon field)
    await salesforce.fillIntermediaryReference(`MTA-REF-${Date.now()}`);

    // Edit MTA Premium — enter value and press OK
    await salesforce.editMTAPremium('75');

    // Bind MTA — enter today's date and click Bind
    await salesforce.bindMTA();

    // Cancellation flow after MTA completes
    // Re-open the policy record (ensures we're on the right context after the MTA bind UI changes)
    //await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);
    // await salesforce.openRelatedTab();
    // await salesforce.openInsurancePolicyFromRelated(policyNumber);

    // Cancel Policy wizard from "Show more actions" menu
    await salesforce.openCancelPolicyWizard();

    // Cancel from inception (full premium return)
    await salesforce.completeCancelFromInceptionStep2(
      `Policy cancellation from inception - full premium return test (${policyNumber})`,
    );
    await page.reload({ waitUntil: 'domcontentloaded' });
    await salesforce.completePremiumStepCalculateTaxOkAndNext();

    // Verify the policy is cancelled
    await salesforce.expectPolicyStatusCancelled();
  });
});
