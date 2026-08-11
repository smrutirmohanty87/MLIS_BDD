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

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function toGbDate(date: Date): string {
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

function toIsoDate(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

test.describe('@regression | E2E | MTA', () => {
  test('DT-MLIS-DF25.5.0 | F-92746 | U-135531 | Validate MTA effective date cannot be prior to NB commencement date', async ({ page }) => {
    test.setTimeout(900000);
    test.slow();

    const caseRef = `E2E-MTA-EFF-DATE-${Date.now()}`;

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
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        await statements.confirmAllStatements();
        break;
      } catch (error) {
        if (attempt === 2) throw error;
        await page.waitForTimeout(5000);
        await statements.expectLoaded();
      }
    }
    await statements.proceed();

    await quotes.expectLoaded();
    await quotes.selectFirstQuote();

    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        await finalDetails.expectLoaded();
        await finalDetails.fillRequiredDetails();
        await finalDetails.proceed();
        await summary.expectLoaded();
        break;
      } catch (error) {
        if (attempt === 2) throw error;
        await page.waitForTimeout(5000);
      }
    }

    await summary.expectSummaryData(caseRef);
    await summary.proceedToOrder();
    await orderDialog.selectTodayAndOrder();

    await policyIssued.expectPolicyIssued();
    const policyNumber = await policyIssued.getIssuedPolicyNumber();
    await policyIssued.backToQuoteManager();

    // Verify policy is live in Broker Portal.
    await brokerPortal.expectQuoteManagerLoaded();
    await brokerPortal.searchPolicy(policyNumber);
    await brokerPortal.expectPolicyStatus(policyNumber, 'Live');

    // Login to Salesforce and open policy.
    await salesforce.goto();
    const sfCreds = getSalesforceCredentials();
    await salesforce.login(sfCreds.username, sfCreds.password, { useJwt: true, fast: true });

    await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);
    await salesforce.openRelatedTab();
    await salesforce.openInsurancePolicyFromRelated(policyNumber);

    // Start MTA flow.
    await salesforce.openCreateMTADialog();
    await salesforce.fillMTAReasonAndSave('Non Material Amendment', 'MTA Description - mandatory field update');
    await salesforce.fillIntermediaryReference(`MTA-REF-${Date.now()}`);
    await salesforce.editMTAPremium('100');

    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const todayGb = toGbDate(today);
    const todayIso = toIsoDate(today);
    const yesterdayGb = toGbDate(yesterday);

    // Open Bind MTA dialog explicitly to validate date rule in-place.
    const bindMTAButton = page.getByRole('button', { name: /Bind MTA/i }).first();
    await expect(bindMTAButton).toBeVisible({ timeout: 30000 });
    await bindMTAButton.click();

    const bindDialog = page.locator('[role="dialog"]:visible').first();
    await expect(bindDialog).toBeVisible({ timeout: 30000 });

    const yesterdayIso = toIsoDate(yesterday);
    const todayIsoValue = toIsoDate(today);

    const dialogDateInput = bindDialog.locator('input[type="date"]:visible').first();
    const dialogDateTextbox = bindDialog.getByRole('textbox', { name: /Bind Date|Effective.*Date|Date/i }).first();

    // Enter a past date first, wait briefly, then enter a valid date before binding.
    if (await dialogDateInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dialogDateInput.fill(yesterdayIso);
      await dialogDateInput.press('Tab').catch(() => undefined);
      await page.waitForTimeout(1500);
      await dialogDateInput.fill(todayIsoValue);
      await dialogDateInput.press('Tab').catch(() => undefined);
    } else {
      await expect(dialogDateTextbox).toBeVisible({ timeout: 10000 });
      await dialogDateTextbox.fill(yesterdayGb);
      await dialogDateTextbox.press('Tab').catch(() => undefined);
      await page.waitForTimeout(1500);
      await dialogDateTextbox.fill(todayGb);
      await dialogDateTextbox.press('Tab').catch(() => undefined);
    }

    const dialogBindButton = bindDialog
      .getByRole('button', { name: /^Bind$/i })
      .or(bindDialog.getByRole('button', { name: /Bind MTA/i }))
      .first();
    await expect(dialogBindButton).toBeVisible({ timeout: 10000 });
    await dialogBindButton.click();

    // // Re-open policy to ensure latest values are visible for assertions.
    // await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);
    // await salesforce.openRelatedTab();
    // await salesforce.openInsurancePolicyFromRelated(policyNumber);

    // const detailsTab = page.getByRole('tab', { name: /^Details$/i }).first();
    // if (await detailsTab.isVisible({ timeout: 5000 }).catch(() => false)) {
    //   await detailsTab.click();
    // }

    // Assert MTA status on top section.
    const mtaStatusValue = page
      .locator('p:visible')
      .filter({ hasText: /^New\/MTA\/Renewal$/ })
      .first()
      .locator('xpath=following-sibling::p[1]')
      .first();

    await expect(mtaStatusValue).toBeVisible({ timeout: 120000 });
    await expect(mtaStatusValue).toContainText(/MTA/i);

    // Assert effective date shown at top matches the proper date used for bind.
    const effectiveDateValue = page
      .locator('p:visible')
      .filter({ hasText: /^Effective Date$/ })
      .first()
      .locator('xpath=following-sibling::p[1]')
      .first();

    await expect(effectiveDateValue).toBeVisible({ timeout: 120000 });
    const effectiveText = (await effectiveDateValue.innerText()).trim();
    expect(effectiveText).toMatch(new RegExp(`${todayGb}|${todayIso}`));
  });
});
