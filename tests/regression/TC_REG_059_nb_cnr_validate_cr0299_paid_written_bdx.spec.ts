import { expect, Locator, Page, test } from '@playwright/test';
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

test.describe('@regression | E2E | BDX | Residential EW | NB-CNR-Can', () => {
  test('TC_REG_059 | NB-CNR-Can | Validate CR0299 field for paid and written BDX lines', async ({ page }) => {
    test.setTimeout(900000);
    test.slow();

    const caseRef = `E2E-REG-BDX-NB-CNR-CR0299-PW-${Date.now()}`;

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

    const scrollLightningContainers = async () => {
      await page.evaluate(() => {
        window.scrollBy(0, 1200);

        const elements = Array.from(document.querySelectorAll<HTMLElement>('*'));
        for (const el of elements) {
          const style = window.getComputedStyle(el);
          const overflowY = style.overflowY;
          if (overflowY !== 'auto' && overflowY !== 'scroll') continue;
          if (el.scrollHeight <= el.clientHeight) continue;
          el.scrollTop += 1200;
        }
      });
    };

    const openBdxTable = async () => {
      const bdxCard = page.locator('article:visible').filter({ hasText: /\bBDX\b/i }).first();

      for (let i = 0; i < 25; i += 1) {
        if (await bdxCard.isVisible({ timeout: 500 }).catch(() => false)) {
          break;
        }

        await bdxCard.scrollIntoViewIfNeeded().catch(() => undefined);
        if (await bdxCard.isVisible({ timeout: 500 }).catch(() => false)) {
          break;
        }

        await page.mouse.wheel(0, 1200);
        await scrollLightningContainers();
        await page.waitForTimeout(300);
      }

      await expect(bdxCard).toBeVisible({ timeout: 120000 });

      const bdxInlineRows = bdxCard.locator('tbody tr:visible, [role="row"]:visible').filter({ hasText: /^BDX-/i });
      const bdxViewAllLink = bdxCard.getByRole('link', { name: /^View All/i }).first();
      const bdxHeaderLink = bdxCard.getByRole('link', { name: /\bBDX\b/i }).first();

      const modeDeadline = Date.now() + 120000;
      let bdxOpenMode: '' | 'inline' | 'viewAll' | 'header' = '';
      while (Date.now() < modeDeadline && !bdxOpenMode) {
        if (await bdxInlineRows.first().isVisible({ timeout: 200 }).catch(() => false)) {
          bdxOpenMode = 'inline';
          break;
        }
        if (await bdxViewAllLink.isVisible({ timeout: 200 }).catch(() => false)) {
          bdxOpenMode = 'viewAll';
          break;
        }
        if (await bdxHeaderLink.isVisible({ timeout: 200 }).catch(() => false)) {
          bdxOpenMode = 'header';
          break;
        }

        await page.mouse.wheel(0, 1200);
        await scrollLightningContainers();
        await page.waitForTimeout(300);
      }

      expect(bdxOpenMode).not.toBe('');

      if (bdxOpenMode === 'viewAll') {
        await bdxViewAllLink.click();
      } else if (bdxOpenMode === 'header') {
        await bdxHeaderLink.click();
      }

      const bdxTable = bdxOpenMode === 'inline'
        ? bdxCard.locator('table:visible, [role="grid"]:visible').first()
        : page.locator('table:visible, [role="grid"]:visible').filter({ hasText: /BDX-/i }).first();
      await expect(bdxTable).toBeVisible({ timeout: 120000 });
      await expect
        .poll(async () => bdxTable.locator('a:visible').filter({ hasText: /BDX-/i }).count(), { timeout: 120000 })
        .toBeGreaterThan(0);

      return bdxTable;
    };

    const openBdxLine = async (bdxTable: Locator, status: 'Paid' | 'Written') => {
      const rowLink = bdxTable
        .locator(`xpath=.//*[self::tr or @role="row"][.//*[normalize-space(.)="${status}"]]//a[contains(normalize-space(.), "BDX-")]`)
        .first();

      await expect(rowLink).toBeVisible({ timeout: 30000 });
      await rowLink.click();
    };

    const verifyCr0299Field = async (targetPage: Page, status: 'Paid' | 'Written') => {
      const cr0299ByLabelAttribute = targetPage
        .locator('records-record-layout-item[field-label*="CR0299" i]')
        .first();

      const cr0299ByVisibleText = targetPage
        .locator('records-record-layout-item:visible, .slds-form-element:visible')
        .filter({ hasText: /(?:^|\b)CR0299\b/i })
        .first();

      const cr0299Field = (await cr0299ByLabelAttribute.isVisible({ timeout: 5000 }).catch(() => false))
        ? cr0299ByLabelAttribute
        : cr0299ByVisibleText;

      await expect(cr0299Field).toBeVisible({ timeout: 120000 });

      const cr0299ValueLocator = cr0299Field
        .locator('.slds-form-element__static:visible, lightning-formatted-text:visible, .test-id__field-value:visible, span:visible, div:visible')
        .first();

      const cr0299RawText = (await cr0299ValueLocator.innerText().catch(async () => cr0299Field.innerText())).trim();
      const cr0299Value = cr0299RawText
        .replace(/CR0299/gi, '')
        .trim();

      console.log(`[BDX] ${status} line CR0299 field value: ${cr0299Value}`);

      expect(cr0299Value.length).toBeGreaterThan(0);
    };

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

    await brokerPortal.expectQuoteManagerLoaded();
    await brokerPortal.searchPolicy(policyNumber);
    await brokerPortal.expectPolicyStatus(policyNumber, 'Live');

    await salesforce.goto();
    const sfCreds = getSalesforceCredentials();
    await salesforce.login(sfCreds.username, sfCreds.password, { useJwt: true, fast: true });

    await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);
    await salesforce.openRelatedTab();
    await salesforce.openInsurancePolicyFromRelatedStable(policyNumber);

    await salesforce.openCancelAndReissueDialog();
    await salesforce.completeCancelAndReissueDialog({
      reasonForCR: 'User Error Correction',
      description: `NB-CNR CR0299 paid and written BDX validation (${policyNumber})`,
    });

    await salesforce.completeReissueFinalPolicyDetails();
    await salesforce.completeReissueSummary();

    const summaryHeading = page.getByRole('heading', { name: /summary/i }).first();
    const proceedToOrder = page.getByRole('button', { name: /proceed to order/i }).first();
    if (await summaryHeading.isVisible({ timeout: 5000 }).catch(() => false)) {
      await page.waitForTimeout(4000);
      if (await summaryHeading.isVisible({ timeout: 2000 }).catch(() => false)) {
        await proceedToOrder.click();
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
    await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);
    await salesforce.openRelatedTab();
    await salesforce.openInsurancePolicyFromRelatedStable(policyNumber);

    await salesforce.openCancelPolicyWizard();
    await salesforce.completeCancelFromInceptionStep3(`Cancellation after NB-CNR for ${policyNumber}`);
    await salesforce.completePremiumStepCalculateTaxOkAndNext();

    await salesforce.openRelatedTab();
    // // await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);
    // // await salesforce.openRelatedTab();
    // // await salesforce.openInsurancePolicyFromRelatedStable(policyNumber);
    // await salesforce.openRelatedTab();

    let bdxTable = await openBdxTable();
    await openBdxLine(bdxTable, 'Paid');
    await verifyCr0299Field(page, 'Paid');

    await page.goBack({ waitUntil: 'domcontentloaded' });
    await salesforce.openRelatedTab().catch(() => undefined);

    bdxTable = await openBdxTable();
    await openBdxLine(bdxTable, 'Written');
    await verifyCr0299Field(page, 'Written');
  });
});