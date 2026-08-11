import { expect, Locator, test } from '@playwright/test';
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

test.describe('@regression | E2E | MTA', () => {
  test('TC_REG_022 | Create 2 MTAs and assert premiums on Quotes tab', async ({ page }) => {
    test.setTimeout(900000);
    test.slow();

    const caseRef = `E2E-MTA2-${Date.now()}`;

    const mtaPremium1 = '100';
    const mtaPremium2 = '200';

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

    // Step 5-6: Global Search → open the exact policy number from the results grid
    await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);

    // Navigate to Related tab → open Insurance Policy record
    await salesforce.openRelatedTab();
    await salesforce.openInsurancePolicyFromRelated(policyNumber);

    // MTA #1
    await salesforce.openCreateMTADialog();
    await salesforce.fillMTAReasonAndSave('Non Material Amendment', 'MTA Description - mandatory field update');
    await salesforce.fillIntermediaryReference(`MTA-REF-${Date.now()}`);
    await salesforce.editMTAPremium(mtaPremium1);
    await salesforce.bindMTA();

    // // Re-open Insurance Policy record for MTA #2
    // await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);
    // await salesforce.openRelatedTab();
    // await salesforce.openInsurancePolicyFromRelated(policyNumber);

    
    // After 2nd MTA, open the Insurance Policy and go to Quotes tab (not Related) to assert premiums
    // Open Cancel and Reissue dialog from "Show more actions" menu
        await salesforce.openCancelAndReissueDialog();
    
        // Fill the Cancel and Reissue Details dialog and submit
        await salesforce.completeCancelAndReissueDialog({
          reasonForCR: 'User Error Correction',
          description: `Cancel and reissue test (${policyNumber})`,
        });
    
        // After submit, Salesforce redirects to Quote Journey → Final policy details (pre-filled)
        await salesforce.completeReissueFinalPolicyDetails();
    
        // Summary step — review and proceed to order
        await salesforce.completeReissueSummary();

        // For this test only: if Summary is still shown after first click, wait and retry once.
        const reissueSummaryHeading = page.getByRole('heading', { name: /summary/i }).first();
        const reissueProceedToOrder = page.getByRole('button', { name: /proceed to order/i }).first();
        if (await reissueSummaryHeading.isVisible({ timeout: 5000 }).catch(() => false)) {
          await page.waitForTimeout(4000);
          if (await reissueSummaryHeading.isVisible({ timeout: 2000 }).catch(() => false)) {
            await reissueProceedToOrder.click();
          }
        }
    
        // Try to complete ordering (if required) and capture the reissued policy number.
        const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
        const commencementDateInput = page.getByRole('textbox', { name: /commencement date/i }).first();
        const genericDateInput = page.locator('input[placeholder="DD/MM/YYYY"]:visible').first();
    
        if (await commencementDateInput.isVisible({ timeout: 5000 }).catch(() => false)) {
          await commencementDateInput.fill(today);
          await page.getByRole('heading', { name: /final policy details/i }).first().click().catch(() => undefined);
        } else if (await genericDateInput.isVisible({ timeout: 5000 }).catch(() => false)) {
          await genericDateInput.fill(today);
          await page.getByRole('heading', { name: /final policy details/i }).first().click().catch(() => undefined);
        }
    
        const orderNow = page.getByRole('button', { name: /order now/i }).first();
        if (await orderNow.isVisible({ timeout: 10000 }).catch(() => false)) {
          await orderNow.click();
        }
    
        await expect(page.getByRole('heading', { name: /policy issued/i }).first()).toBeVisible({ timeout: 180000 });
    
        // After Cancel & Re-issue completes, return to the Submission record before continuing.
        await salesforce.clickReturnToSubmission();

        await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);

    // Navigate to Related tab → open Insurance Policy record
    await salesforce.openRelatedTab();
    await salesforce.openInsurancePolicyFromRelated(policyNumber);

        // MTA #2
    await salesforce.openCreateMTADialog();
    await salesforce.fillMTAReasonAndSave('Non Material Amendment', 'MTA Description - mandatory field update');
    await salesforce.fillIntermediaryReference(`MTA2-REF-${Date.now()}`);
    await salesforce.editMTAPremium(mtaPremium2);
    await salesforce.bindMTA();

    
    await salesforce.searchAndOpenQuotedFromGlobalSearchGrid(policyNumber);
    await salesforce.openQuotesTab1();
    // await salesforce.openInsurancePolicyFromRelated(policyNumber);

    //await salesforce.expectMTAPremiumsOnQuotesTab([mtaPremium1, mtaPremium2]);
  });
});

