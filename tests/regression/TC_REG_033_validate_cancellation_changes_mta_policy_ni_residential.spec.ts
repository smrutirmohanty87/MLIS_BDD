import { expect, test } from '@playwright/test';
import {
  NiFinalPolicyDetailsPage,
  NiLoginPage,
  NiOrderDialog,
  NiPolicyIssuedPage,
  NiProductSelectionPage,
  NiQuoteManagerPage,
  NiQuotesPage,
  NiStatementsOfFactPage,
  NiSummaryPage,
} from '../../src/pages/mlis-portal-ni';
import { BrokerPortalPage } from '../../src/pages/broker-portal-policy';
import { SalesforcePortalPage } from '../../src/pages/salesforce-cancellation';
import { getBrokerCredentials, getSalesforceCredentials } from '../../src/config/env';

test.describe('@regression | E2E | MTA | Cancellation | NI Residential', () => {
  test('DT-MLIS-DF25.5.0 | F-92746 | U-231622 | Verify user able to validate the cancellations changes on MTA Policy_NI Residential_Cancel the policy Midterm_NB->MTA->MTA->Cancellation', async ({ page }) => {
    test.setTimeout(900000);
    test.slow();

    const caseRef = `E2E-MTA2-CAN-NI-${Date.now()}`;

    const brokerLogin = new NiLoginPage(page);
    const quoteManager = new NiQuoteManagerPage(page);
    const productSelection = new NiProductSelectionPage(page);
    const statements = new NiStatementsOfFactPage(page);
    const quotes = new NiQuotesPage(page);
    const finalDetails = new NiFinalPolicyDetailsPage(page);
    const summary = new NiSummaryPage(page);
    const orderDialog = new NiOrderDialog(page);
    const policyIssued = new NiPolicyIssuedPage(page);

    const brokerPortal = new BrokerPortalPage(page);
    const salesforce = new SalesforcePortalPage(page);

    // Create a fresh NI Residential policy in Broker Portal.
    await brokerLogin.goto();
    const brokerCreds = getBrokerCredentials();
    await brokerLogin.login(brokerCreds.username, brokerCreds.password);
    await quoteManager.expectLoaded();
    await quoteManager.acceptCookiesIfVisible();

    await quoteManager.startResidentialNorthernIrelandQuote();
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
    const policyLabel = page.locator('strong', { hasText: 'Policy number' });
    await expect(policyLabel).toBeVisible({ timeout: 60000 });
    const policyNumber = (await policyLabel.locator('xpath=following::p[1]').first().innerText()).trim();
    await policyIssued.backToQuoteManager();

    // Verify policy is live.
    await brokerPortal.expectQuoteManagerLoaded();
    await brokerPortal.searchPolicy(policyNumber);
    await brokerPortal.expectPolicyStatus(policyNumber, 'Live');

    // Login to Salesforce and open the Insurance Policy record.
    await salesforce.goto();
    const sfCreds = getSalesforceCredentials();
    await salesforce.login(sfCreds.username, sfCreds.password, { useJwt: true, fast: true });

    await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);
    await salesforce.openRelatedTab();
    await salesforce.openInsurancePolicyFromRelated(policyNumber);

    // MTA #1
    await salesforce.openCreateMTADialog();
    await salesforce.fillMTAReasonAndSave('Non Material Amendment', 'MTA Description - mandatory field update');
    await salesforce.fillIntermediaryReference(`MTA1-REF-${Date.now()}`);
    await salesforce.editMTAPremium('100');
    await salesforce.bindMTA();

    // MTA #2
    await salesforce.openCreateMTADialog();
    await salesforce.fillMTAReasonAndSave('Limit Increase', 'MTA Description - mandatory field update');
    await salesforce.fillIntermediaryReference(`MTA2-REF-${Date.now()}`);
    await salesforce.editMTAPremium('200');
    await salesforce.bindMTA();

    // Cancel midterm after second MTA.
    // Step 10: Open Cancel Policy wizard from "Show more actions" menu
    await salesforce.openCancelPolicyWizard();

    // Step 11: Fill Cancel Policy Step 1 — category, instigated by, reason, notes
    await salesforce.completeCancelFromInceptionStep3(
      `Policy cancellation from inception - full premium return test (${policyNumber})`,
    );

    // Step 12: Enter cancellation premium and calculate tax (OK)
    await salesforce.completePremiumStepWithTaxCalculation();


    // Step 13: Click Next and wait for cancellation status/page
    await salesforce.submitCancellation();
    await salesforce.expectPolicyStatusCancelled();
  });
});
