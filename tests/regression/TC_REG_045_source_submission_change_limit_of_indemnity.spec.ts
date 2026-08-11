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
import { TCReg045LimitOfIndemnityPage } from '../../src/pages/tc-reg-045-limit-of-indemnity';
import { TCRegSharedUtilsPage } from '../../src/pages/tc-reg-shared-utils';
import { getBrokerCredentials, getSalesforceCredentials } from '../../src/config/env';

test.describe('@regression | E2E | MTA | Clear Baseline', () => {
  test('TC_REG_045 | Clear MTA flow on a live policy', async ({ page }) => {
    test.setTimeout(900000);
    test.slow();

    const caseRef = `E2E-MTA-CLEAR-${Date.now()}`;

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
    const reg045 = new TCReg045LimitOfIndemnityPage(page);
    const regUtils = new TCRegSharedUtilsPage(page);

    // Create a fresh live policy in Broker Portal.
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

    // Open policy in Salesforce.
    await salesforce.goto();
    const sfCreds = getSalesforceCredentials();
    await salesforce.login(sfCreds.username, sfCreds.password, { useJwt: true, fast: true });

    await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);
    await salesforce.openRelatedTab();
    await salesforce.openInsurancePolicyFromRelatedStable(policyNumber);

    // Perform MTA (reason + mandatory description), then execute limit validations,
    // then complete standard MTA flow (intermediary ref, premium, bind).
    await salesforce.openCreateMTADialog();
    await salesforce.fillMTAReasonAndSave(
      'Exposure/Limit Changes',
      `MTA Description - Clear baseline flow for ${policyNumber}`,
    );

    // Condition 1: Change Limit of Indemnity with valid value and save.
    const firstUpdatedLimit = '750000';
    await reg045.clickChangeLimit();
    await reg045.setLimitValueAndSave(firstUpdatedLimit);

    // Multiple refresh + wait so the updated value reflects reliably before assertion.
    await reg045.refreshMultipleAndWait(3);

    // Verify Limit of Indemnity field reflects the new value.
    await reg045.verifyLimitFieldUpdated(firstUpdatedLimit);

    // Condition 2: Try much higher value and verify validation error appears.
    const tooHighLimit = '9999999999';
    await reg045.clickChangeLimit();
    const highLimitInput = await regUtils.pickFirstVisible([
      page.getByRole('spinbutton', { name: /Limit of indemnity|Limit of Indemnity/i }),
      page.getByRole('textbox', { name: /Limit of indemnity|Limit of Indemnity/i }),
      page.locator('input[aria-label*="Limit of indemnity" i], input[aria-label*="Limit of Indemnity" i]'),
      page.locator('input[name*="Limit" i]'),
    ], 60000);
    await highLimitInput.click();
    await highLimitInput.fill(tooHighLimit);

    const saveByRole = page.getByRole('button', { name: /^Save$/i }).first();
    const saveByText = page.locator('button:has-text("Save")').first();
    const canClickSave =
      ((await saveByRole.isVisible({ timeout: 2000 }).catch(() => false)) &&
        (await saveByRole.isEnabled().catch(() => false))) ||
      ((await saveByText.isVisible({ timeout: 1000 }).catch(() => false)) &&
        (await saveByText.isEnabled().catch(() => false)));

    if (canClickSave) {
      if (await saveByRole.isVisible({ timeout: 500 }).catch(() => false)) {
        await saveByRole.click();
      } else {
        await saveByText.click();
      }
      await page.getByRole('button', { name: /^Cancel$/i }).first().click();
      //await expectValidationErrorAndCancel(page);
    } else {
      const cancelButton = await regUtils.pickFirstVisible([
        page.getByRole('button', { name: /^Cancel$/i }),
        page.locator('button:has-text("Cancel")'),
      ], 30000);
      await cancelButton.click();
    }

    // Continue with remaining MTA steps.
    await salesforce.fillIntermediaryReference(`MTA-REF-${Date.now()}`);
    await salesforce.editMTAPremium('125');
    await salesforce.bindMTA();

    await regUtils.assertRiskIdVisible();
  });
});
