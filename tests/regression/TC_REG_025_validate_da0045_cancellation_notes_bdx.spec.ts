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

test.describe('@regression | E2E | BDX | Residential EW | NB Cancellation', () => {
  test('TC_REG_025 | Validate DA0045 Cancellation Notes field in BDX cancellation line', async ({ page }) => {
    test.setTimeout(900000);
    test.slow();

    const caseRef = `E2E-REG-BDX-CAN-NOTES-${Date.now()}`;
    const da0045Notes = `DA0045 cancellation notes validation ${Date.now()}`;

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

    // NB on Broker Portal (EW Residential)
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

    // Confirm policy is live before cancellation.
    await brokerPortal.expectQuoteManagerLoaded();
    await brokerPortal.searchPolicy(policyNumber);
    await brokerPortal.expectPolicyStatus(policyNumber, 'Live');

    // Salesforce: open policy and perform cancellation.
    await salesforce.goto();
    const sfCreds = getSalesforceCredentials();
    await salesforce.login(sfCreds.username, sfCreds.password, { useJwt: true, fast: true });

    await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);
    await salesforce.openRelatedTab();
    await salesforce.openInsurancePolicyFromRelated(policyNumber);

    await salesforce.openCancelPolicyWizard();
    await salesforce.completeCancelFromInceptionStep1(da0045Notes);
    await salesforce.completePremiumStepWithTaxCalculation();
    await salesforce.submitCancellation();
    await salesforce.expectPolicyStatusCancelled();

    // Related -> BDX -> open cancellation line.
    await salesforce.openRelatedTab();

    const bdxCard = page.locator('article:visible').filter({ hasText: /\bBDX\b/i }).first();

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

    const bdxInlineRows = bdxCard.locator('tbody tr:visible');
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

    const bdxTable = bdxOpenMode === 'inline' ? bdxCard.locator('table:visible').first() : page.locator('table:visible').first();
    await expect(bdxTable).toBeVisible({ timeout: 120000 });
    await expect.poll(async () => bdxTable.locator('tbody tr').count(), { timeout: 120000 }).toBeGreaterThan(0);

    const cancellationRow = bdxTable.locator('tbody tr').filter({ hasText: /cancel/i }).first();
    await expect(cancellationRow).toBeVisible({ timeout: 120000 });

    const cancellationRowLink = cancellationRow
      .locator('th[scope="row"] a:visible, td[data-label] a:visible, td a:visible')
      .first();
    await expect(cancellationRowLink).toBeVisible({ timeout: 30000 });
    await cancellationRowLink.click();

    // DA0045 field validation on the opened cancellation line record.
    const da0045ByLabelAttribute = page
      .locator('records-record-layout-item[field-label*="DA0045" i], records-record-layout-item[field-label*="Cancellation Notes" i]')
      .first();

    const da0045ByVisibleText = page
      .locator('records-record-layout-item:visible, .slds-form-element:visible')
      .filter({ hasText: /(?:^|\b)(DA0045|Cancellation\s*Notes(?:\/?Narrative)?)\b/i })
      .first();

    const da0045Field = (await da0045ByLabelAttribute.isVisible({ timeout: 5000 }).catch(() => false))
      ? da0045ByLabelAttribute
      : da0045ByVisibleText;

    await expect(da0045Field).toBeVisible({ timeout: 120000 });

    const da0045ValueLocator = da0045Field
      .locator('.slds-form-element__static:visible, lightning-formatted-text:visible, .test-id__field-value:visible, span:visible, div:visible')
      .first();

    const da0045RawText = (await da0045ValueLocator.innerText().catch(async () => da0045Field.innerText())).trim();
    const da0045Value = da0045RawText
      .replace(/DA0045/gi, '')
      .replace(/Cancellation\s*Notes\/?Narrative/gi, '')
      .replace(/Cancellation\s*Notes/gi, '')
      .trim();

    expect(da0045Value.length).toBeGreaterThan(0);
    await expect(da0045Field).toContainText(da0045Notes);
  });
});
