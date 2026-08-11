import { expect, Page, test } from '@playwright/test';
import {
  LoginPage,
  QuoteManagerPage,
  ProductSelectionPage,
  StatementsOfFactPage,
  QuotesPage,
  FinalPolicyDetailsPage,
  SummaryPage,
  OrderDialog,
  PolicyIssuedPage,
} from '../../src/pages/mlis-portal';
import { BrokerPortalPage } from '../../src/pages/broker-portal-policy';
import { SalesforcePortalPage } from '../../src/pages/salesforce-cancellation';
import { getBrokerCredentialsForProfile, getSalesforceCredentials } from '../../src/config/env';

const PRODUCT_NAME = 'Lease - Defective Lease buildings insurance';

const assertBdxLineFields = async (page: Page) => {
  const cr0054Field = page
    .locator('records-record-layout-item:visible, .slds-form-element:visible')
    .filter({ hasText: /CR0054/i })
    .first();

  const cr0055Field = page
    .locator('records-record-layout-item:visible, .slds-form-element:visible')
    .filter({ hasText: /CR0055/i })
    .first();

  await expect(cr0054Field).toBeVisible({ timeout: 120000 });
  await expect(cr0055Field).toBeVisible({ timeout: 120000 });

  const normalize = (value: string) => value.replace(/\s+/g, ' ').replace(/\u00A0/g, ' ').trim();
  const cr0054Text = normalize(await cr0054Field.innerText());
  const cr0055Text = normalize(await cr0055Field.innerText());

  // Keep these logs explicit so test runs clearly show what was asserted.
  console.log(`[BDX ASSERT] CR0054 field text: ${cr0054Text}`);
  console.log(`[BDX ASSERT] CR0055 field text: ${cr0055Text}`);

  await expect(cr0054Text).toContain('CR0054');
  await expect(cr0055Text).toContain('CR0055');
  await expect(cr0054Text).toMatch(/\b-?\d[\d,]*(?:\.\d+)?\b/);
  await expect(cr0055Text).toContain('Any one risk');

  console.log('[BDX ASSERT] CR0054 numeric value assertion passed.');
  console.log("[BDX ASSERT] CR0055 contains 'Any one risk' assertion passed.");
};

test.describe('@regression | E2E | BDX | Commercial NB>CNR>MTA>Cancellation', () => {
  test('TC_REG_055 | NB-CNR-MTA-Cancellation | Lease - Defective Lease buildings insurance | assert CR0054 and CR0055 Any one risk', async ({ page }) => {
    test.setTimeout(900000);
    test.slow();

    const caseRef = `E2E-REG-NB-CNR-MTA-CAN-LEASE-${Date.now()}`;
    const nextDay = new Date();
    nextDay.setDate(nextDay.getDate());
    const mtaDate = nextDay.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const loginPage = new LoginPage(page);
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

    await loginPage.goto();
    const brokerCreds = getBrokerCredentialsForProfile('NO_COMM');
    await loginPage.login(brokerCreds.username, brokerCreds.password);
    await quoteManager.expectLoaded();
    await quoteManager.acceptCookiesIfVisible();

    await quoteManager.startResidentialEnglandWalesQuote();
    await productSelection.expectLoaded();
    await productSelection.fillCaseReferenceAndLimit(caseRef, '500000');
    await productSelection.selectProductByName(PRODUCT_NAME);
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
    const policyNumberText = (await policyLabel.locator('xpath=following::p[1]').first().innerText()).trim();
    await policyIssued.backToQuoteManager();

    await brokerPortal.expectQuoteManagerLoaded();
    await brokerPortal.searchPolicy(policyNumberText);
    await brokerPortal.expectPolicyStatus(policyNumberText, 'Live');

    await salesforce.goto();
    const sfCreds = getSalesforceCredentials();
    await salesforce.login(sfCreds.username, sfCreds.password, { useJwt: true, fast: true });
    await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumberText);
    await salesforce.openRelatedTab();
    await salesforce.openInsurancePolicyFromRelated(policyNumberText);

    await salesforce.openCancelAndReissueDialog();
    await salesforce.completeCancelAndReissueDialog({
      reasonForCR: 'User Error Correction',
      description: `NB-CNR-MTA-Cancellation flow for ${policyNumberText}`,
    });
    await salesforce.completeReissueFinalPolicyDetails();
    await salesforce.completeReissueSummary();

    const reissueSummaryHeading = page.getByRole('heading', { name: /summary/i }).first();
    const reissueProceedToOrder = page.getByRole('button', { name: /proceed to order/i }).first();
    if (await reissueSummaryHeading.isVisible({ timeout: 5000 }).catch(() => false)) {
      await page.waitForTimeout(4000);
      if (await reissueSummaryHeading.isVisible({ timeout: 2000 }).catch(() => false)) {
        await reissueProceedToOrder.click();
      }
    }

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
    await salesforce.clickReturnToSubmission();

    await salesforce.openRelatedTab();
    await salesforce.openInsurancePolicyFromRelated(policyNumberText);
    await salesforce.openCreateMTADialog();
    await salesforce.fillMTAReasonAndSave('Exposure/Limit Changes', `MTA Description for ${policyNumberText}`);
    await salesforce.fillIntermediaryReference(`MTA-REF-${Date.now()}`);
    await salesforce.editMTAPremium('100');
    await salesforce.bindMTA(mtaDate);

    await salesforce.openCancelPolicyWizard();
    await salesforce.completeCancelFromInceptionStep3(`Midterm cancellation after NB-CNR-MTA for ${policyNumberText}`);
    await salesforce.completePremiumStepCalculateTaxOkAndNext();

    await salesforce.openRelatedTab();

    const bdxCard = page.locator('article:visible').filter({ hasText: /\bBDX\b/i }).first();
    for (let i = 0; i < 15; i += 1) {
      if (await bdxCard.isVisible({ timeout: 1000 }).catch(() => false)) {
        break;
      }
      await page.mouse.wheel(0, 1200);
      await page.waitForTimeout(400);
    }
    await expect(bdxCard).toBeVisible({ timeout: 120000 });
    await bdxCard.scrollIntoViewIfNeeded();

    const bdxViewAllLink = bdxCard.getByRole('link', { name: /^View All/i }).first();
    const bdxHeaderLink = bdxCard.getByRole('link', { name: /\bBDX\b/i }).first();

    if (await bdxViewAllLink.isVisible({ timeout: 1000 }).catch(() => false)) {
      await bdxViewAllLink.click();
    } else if (await bdxHeaderLink.isVisible({ timeout: 1000 }).catch(() => false)) {
      await bdxHeaderLink.click();
    }

    const bdxTable = page.locator('table:visible').first();
    await expect(bdxTable).toBeVisible({ timeout: 120000 });
    await expect.poll(async () => await bdxTable.locator('tbody tr').count(), { timeout: 120000 }).toBeGreaterThan(0);

    const cancellationRow = bdxTable
      .locator('tbody tr:visible')
      .filter({ hasText: /cancel|cancellation|cancelled/i })
      .first();

    let bdxRowLink = cancellationRow.locator('th[scope="row"] a:visible, td a:visible').first();
    if (!(await bdxRowLink.isVisible({ timeout: 3000 }).catch(() => false))) {
      bdxRowLink = bdxTable.locator('tbody tr th[scope="row"] a:visible, tbody tr td a:visible').first();
    }

    await expect(bdxRowLink).toBeVisible({ timeout: 120000 });
    await bdxRowLink.click();

    await assertBdxLineFields(page);
  });
});
