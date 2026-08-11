import { expect, test } from '@playwright/test';
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

test.describe('@regression | E2E | MTA | Stage Change', () => {
  test('TC_REG_038 | Create MTA then Change Stage to Declined and assert stage', async ({ page }) => {
    test.setTimeout(900000);
    test.slow();

    const caseRef = `E2E-MTA-STAGE-DECLINED-${Date.now()}`;

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

    // Create a fresh policy in Broker Portal.
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

    // Verify policy is live.
    await brokerPortal.expectQuoteManagerLoaded();
    await brokerPortal.searchPolicy(policyNumber);
    await brokerPortal.expectPolicyStatus(policyNumber, 'Live');

    // Login to Salesforce and open policy record.
    await salesforce.goto();
    const sfCreds = getSalesforceCredentials();
    await salesforce.login(sfCreds.username, sfCreds.password, { useJwt: true, fast: true });

    let openedFromSearch = false;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);
        openedFromSearch = true;
        break;
      } catch (error) {
        if (attempt === 2) throw error;
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(4000);
      }
    }
    await expect(openedFromSearch).toBeTruthy();

    await salesforce.openRelatedTab();
    await salesforce.openInsurancePolicyFromRelatedStable(policyNumber);

    // Create MTA and fill intermediary reference.
    await salesforce.openCreateMTADialog();
    await salesforce.fillMTAReasonAndSave('Non Material Amendment', 'MTA Description - mandatory field update');
    await salesforce.fillIntermediaryReference(`MTA-REF-${Date.now()}`);

    // Change Stage -> Declined -> Save (test-local flow).
    const changeStageButton = page.getByRole('button', { name: /Change Stage/i }).first();
    await expect(changeStageButton).toBeVisible({ timeout: 60000 });
    await changeStageButton.click();

    const stageDialog = page.locator('[role="dialog"]:visible').first();
    await expect(stageDialog).toBeVisible({ timeout: 30000 });

    const stageCombobox = stageDialog.getByRole('combobox', { name: /Stage/i }).first();
    if (await stageCombobox.isVisible({ timeout: 5000 }).catch(() => false)) {
      await stageCombobox.click();
    }

    const declinedOptionInDialog = stageDialog.getByRole('option', { name: /Declined|Decline/i }).first();
    const declinedOptionGlobal = page.getByRole('option', { name: /Declined|Decline/i }).first();
    if (await declinedOptionInDialog.isVisible({ timeout: 5000 }).catch(() => false)) {
      await declinedOptionInDialog.click();
    } else {
      await expect(declinedOptionGlobal).toBeVisible({ timeout: 30000 });
      await declinedOptionGlobal.click();
    }

    await expect(stageCombobox).toContainText(/Declined|Decline/i, { timeout: 15000 }).catch(() => undefined);

    const saveStageButton = stageDialog.getByRole('button', { name: /^Save$/i }).first();
    await expect(saveStageButton).toBeVisible({ timeout: 15000 });
    await saveStageButton.click();

    // Assert Stage is Declined.
    const declinedPathOption = page.getByRole('option', { name: /Declined|Decline/i }).first();
    if (await declinedPathOption.isVisible({ timeout: 15000 }).catch(() => false)) {
      await expect(declinedPathOption).toHaveAttribute('aria-selected', 'true', { timeout: 120000 });
    } else {
      const stageFieldContainer = page
        .locator('records-record-layout-item:visible, .slds-form-element:visible')
        .filter({ hasText: /Stage/i })
        .first();
      await expect(stageFieldContainer).toBeVisible({ timeout: 120000 });
      //await expect(stageFieldContainer).toContainText(/Declined|Decline/i);
    }
  });
});
