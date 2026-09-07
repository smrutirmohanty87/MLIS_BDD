import { expect, Page, test } from '@playwright/test';
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

const normalize = (value: string) => value.replace(/\s+/g, ' ').replace(/\u00A0/g, ' ').trim();

const assertCancellationBdxFields = async (page: Page) => {
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

  const cr0054Text = normalize(await cr0054Field.innerText());
  const cr0055Text = normalize(await cr0055Field.innerText());

  console.log(`[BDX ASSERT] Cancellation CR0054 field value: ${cr0054Text}`);
  console.log(`[BDX ASSERT] Cancellation CR0055 field value: ${cr0055Text}`);

  expect(cr0054Text).toContain('CR0054');
  expect(cr0054Text).toMatch(/\b-?\d[\d,]*(?:\.\d+)?\b/);
  expect(cr0054Text).not.toMatch(/\b0(?:\.0+)?\b/);
  expect(cr0055Text).toContain('CR0055');
  expect(cr0055Text.replace(/CR0055/i, '').trim().length).toBeGreaterThan(0);
};

test.describe('@regression | E2E | BDX | Residential EW | NB-CNR-MTA-MTA-Cancellation', () => {
  test('DT-MLIS-DF29.0.0 | F-232588 | CR-232467 | Validate CR0055 Deductible or Excess Basis after NB-CNR-MTA-MTA-Cancellation', async ({ page }) => {
    test.setTimeout(900000);
    test.slow();

    const caseRef = `E2E-REG-CR0055-NB-CNR-MTA-MTA-CAN-${Date.now()}`;
    const mtaDate = new Date().toLocaleDateString('en-GB', {
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
    const brokerCreds = getBrokerCredentials();
    await loginPage.login(brokerCreds.username, brokerCreds.password);
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
    await brokerPortal.expectQuoteManagerLoaded();
    await brokerPortal.searchPolicy(policyNumber);
    await brokerPortal.expectPolicyStatus(policyNumber, 'Live');

    const sfCreds = getSalesforceCredentials();
    await salesforce.goto();
    await salesforce.login(sfCreds.username, sfCreds.password, { useJwt: true, fast: true });
    await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);
    await salesforce.openRelatedTab();
    await salesforce.openInsurancePolicyFromRelated(policyNumber);

    // CNR after NB.
    await salesforce.openCancelAndReissueDialog();
    await salesforce.completeCancelAndReissueDialog({
      reasonForCR: 'User Error Correction',
      description: `NB-CNR before two MTA cancellation validation (${policyNumber})`,
    });
    await salesforce.completeReissueFinalPolicyDetails();
    await salesforce.completeReissueSummary();

    const reissueSummaryHeading = page.getByRole('heading', { name: /summary/i }).first();
    const proceedToOrder = page.getByRole('button', { name: /proceed to order/i }).first();
    if (await reissueSummaryHeading.isVisible({ timeout: 5000 }).catch(() => false)) {
      await page.waitForTimeout(4000);
      if (await reissueSummaryHeading.isVisible({ timeout: 2000 }).catch(() => false)) {
        await proceedToOrder.click();
      }
    }

    const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const commencementDate = page.getByRole('textbox', { name: /commencement date/i }).first();
    const genericDate = page.locator('input[placeholder="DD/MM/YYYY"]:visible').first();
    if (await commencementDate.isVisible({ timeout: 5000 }).catch(() => false)) {
      await commencementDate.fill(today);
      await page.getByRole('heading', { name: /final policy details/i }).first().click().catch(() => undefined);
    } else if (await genericDate.isVisible({ timeout: 5000 }).catch(() => false)) {
      await genericDate.fill(today);
      await page.getByRole('heading', { name: /final policy details/i }).first().click().catch(() => undefined);
    }

    const orderNow = page.getByRole('button', { name: /order now/i }).first();
    if (await orderNow.isVisible({ timeout: 10000 }).catch(() => false)) {
      await orderNow.click();
    }
    await expect(page.getByRole('heading', { name: /policy issued/i }).first()).toBeVisible({ timeout: 180000 });
    await salesforce.clickReturnToSubmission();

    // MTA #1 and MTA #2 after CNR.
    await salesforce.openRelatedTab();
    await salesforce.openInsurancePolicyFromRelated(policyNumber);
    await salesforce.openCreateMTADialog();
    await salesforce.fillMTAReasonAndSave('Exposure/Limit Changes', `MTA 1 after CNR (${policyNumber})`);
    await salesforce.fillIntermediaryReference(`MTA1-REF-${Date.now()}`);
    await salesforce.editMTAPremium('100');
    await salesforce.bindMTA(mtaDate);

    await salesforce.openCreateMTADialog();
    await salesforce.fillMTAReasonAndSave('Limit Increase', `MTA 2 after CNR (${policyNumber})`);
    await salesforce.fillIntermediaryReference(`MTA2-REF-${Date.now()}`);
    await salesforce.editMTAPremium('200');
    await salesforce.bindMTA(mtaDate);

    // Midterm cancellation after NB-CNR-MTA-MTA.
    await salesforce.openCancelPolicyWizard();
    await salesforce.completeCancelFromInceptionStep3(`Cancellation after NB-CNR-MTA-MTA (${policyNumber})`);
    await salesforce.completePremiumStepWithTaxCalculation();
    await salesforce.submitCancellation();
    await salesforce.expectPolicyStatusCancelled();

    await salesforce.openRelatedTab();
    const bdxCard = page.locator('article:visible').filter({ hasText: /\bBDX\b/i }).first();
    await bdxCard.scrollIntoViewIfNeeded();
    await expect(bdxCard).toBeVisible({ timeout: 120000 });

    const viewAll = bdxCard.getByRole('link', { name: /^View All/i }).first();
    const header = bdxCard.getByRole('link', { name: /\bBDX\b/i }).first();
    if (await viewAll.isVisible({ timeout: 3000 }).catch(() => false)) {
      await viewAll.click();
    } else if (await header.isVisible({ timeout: 3000 }).catch(() => false)) {
      await header.click();
    }

    const bdxTable = page.locator('table:visible').filter({ hasText: /BDX-/i }).first();
    await expect(bdxTable).toBeVisible({ timeout: 120000 });
    await expect.poll(async () => bdxTable.locator('tbody tr').count(), { timeout: 120000 }).toBeGreaterThan(0);

    const cancellationRow = bdxTable
      .locator('tbody tr:visible')
      .filter({ hasText: /endorsement\s+cancellation|cancel|cancelled/i })
      .first();
    const bdxLineLink = cancellationRow.locator('th[scope="row"] a:visible, td a:visible').first();
    await expect(bdxLineLink).toBeVisible({ timeout: 120000 });
    await bdxLineLink.click();
    await assertCancellationBdxFields(page);
  });
});
