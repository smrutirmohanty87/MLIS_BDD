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

declare const require: (moduleName: string) => any;
const policyData = require('../test-data/policy-creation.json') as {
  Insuredname: string;
  Landregisternumber: string;
};

test.describe('@regression | E2E | EW Residential | Full Cancellation | DUAL GWP', () => {
  test('TC_REG_026 | Verify DUAL Share GWP and BDX values through full cancellation flow', async ({ page }) => {
    test.setTimeout(900000);
    test.slow();

    const LIMIT_OF_INDEMNITY = '2005000';
    const EXPECTED_GWP = 495.21;
    const CANCELLATION_PREMIUM = '-495.21';
    const EXPECTED_TAX = -59.43;

    const caseRef = `E2E-REG-CAN-GWP-${Date.now()}`;
    const executionLog: string[] = [];

    const logStep = (message: string) => {
      const line = `[TC_REG_026] ${new Date().toISOString()} | ${message}`;
      executionLog.push(line);
      console.log(line);
    };

    let policyNumber = '';
    let bdxOpenModeSummary: '' | 'inline' | 'viewAll' | 'header' = '';
    let gwpOccurrencesSummary = 0;
    let parsedTaxSummary = 0;

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

    try {
      logStep(`Started test run with caseRef=${caseRef}`);

      // Clone SAN_008 flow up to opening Insurance Policy
      logStep('Broker portal login started');
      await brokerLogin.goto();
      const brokerCreds = getBrokerCredentials();
      await brokerLogin.login(brokerCreds.username, brokerCreds.password);
      await quoteManager.expectLoaded();
      await quoteManager.acceptCookiesIfVisible();
      logStep('Broker portal login completed');

      logStep('Quote creation flow started');
      await quoteManager.startResidentialEnglandWalesQuote();
      await productSelection.expectLoaded();
      await productSelection.fillCaseReferenceAndLimit(caseRef, LIMIT_OF_INDEMNITY);
      await productSelection.selectProductsByIndex([1]);
      await productSelection.proceed();

      await statements.expectLoaded();
      await statements.confirmAllStatements();
      await statements.proceed();

      await quotes.expectLoaded();
      await quotes.selectFirstQuote();

      await finalDetails.expectLoaded();
      await finalDetails.fillRequiredDetails({
        insuredName: policyData.Insuredname,
        landRegisterNumber: policyData.Landregisternumber,
      });
      await finalDetails.proceed();

      await summary.expectLoaded();
      await summary.expectSummaryData(caseRef, {
        limitOfIndemnity: LIMIT_OF_INDEMNITY,
        insuredName: policyData.Insuredname,
      });
      await summary.proceedToOrder();
      await orderDialog.selectTodayAndOrder();
      logStep('Quote creation and order placement completed');

      await policyIssued.expectPolicyIssued();
      policyNumber = await policyIssued.getIssuedPolicyNumber();
      logStep(`Policy issued with policyNumber=${policyNumber}`);
      await policyIssued.backToQuoteManager();

      await brokerPortal.expectQuoteManagerLoaded();
      await brokerPortal.searchPolicy(policyNumber);
      await brokerPortal.expectPolicyStatus(policyNumber, 'Live');
      logStep('Live policy status verified in broker portal');

      logStep('Salesforce login started');
      await salesforce.goto();
      const sfCreds = getSalesforceCredentials();
      await salesforce.login(sfCreds.username, sfCreds.password, { useJwt: true, fast: true });
      logStep('Salesforce login completed');

    const searchAndOpenPolicyWithRetry = async (ref: string, attempts = 3) => {
      let lastError: unknown;
      for (let attempt = 1; attempt <= attempts; attempt += 1) {
        try {
          await salesforce.searchAndOpenExactFromGlobalSearchGrid(ref);
          return;
        } catch (error) {
          lastError = error;
          if (attempt < attempts) {
            await salesforce.goto();
            await page.waitForTimeout(2000);
          }
        }
      }
      throw lastError;
    };

      await searchAndOpenPolicyWithRetry(policyNumber);
      logStep('Policy located via Salesforce global search');
      await salesforce.openRelatedTab();
      await salesforce.openInsurancePolicyFromRelated(policyNumber);
      await expect(page.getByRole('heading', { name: /Insurance Policy/i }).first()).toBeVisible({ timeout: 120000 });
      logStep('Insurance Policy opened from Related tab');

    // Value assertions (495.21) on details screen
      const detailsTab = page.getByRole('tab', { name: /^Details$/i }).first();
      await expect(detailsTab).toBeVisible({ timeout: 120000 });
      await detailsTab.click();

      const moneyRegex = /(?:GBP\s*)?£?\s*495\.21/i;
      const taxJurisdictionSection = page.locator('main:visible, [role="tabpanel"]:visible').first();
      await expect(taxJurisdictionSection).toContainText(/DUAL\s*Share\s*GWP/i);
      await expect(taxJurisdictionSection).toContainText(/Gross\s*Written\s*Premium/i);
      await expect(taxJurisdictionSection).toContainText(moneyRegex);
      logStep('Insurance Policy details values validated for DUAL Share GWP and GWP');

    // Open BDX and assert fields = 495.21
      await salesforce.openRelatedTab();
      const bdxCard = page.locator('article:visible').filter({ hasText: /\bBDX\b/i }).first();
      await expect(bdxCard).toBeVisible({ timeout: 120000 });

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
      bdxOpenModeSummary = bdxOpenMode;
      logStep(`BDX section open mode resolved as ${bdxOpenMode}`);

      if (bdxOpenMode === 'viewAll') {
        await bdxViewAllLink.click();
      } else if (bdxOpenMode === 'header') {
        await bdxHeaderLink.click();
      }

      const bdxTable = bdxOpenMode === 'inline' ? bdxCard.locator('table:visible').first() : page.locator('table:visible').first();
      await expect(bdxTable).toBeVisible({ timeout: 120000 });
      await expect.poll(async () => bdxTable.locator('tbody tr').count(), { timeout: 120000 }).toBeGreaterThan(0);

      const firstBdxRowLink = bdxTable.locator('tbody tr a:visible').first();
      if (await firstBdxRowLink.isVisible({ timeout: 3000 }).catch(() => false)) {
        await firstBdxRowLink.click();
      }

      const bdxDetailsPanel = page.locator('main:visible, [role="tabpanel"]:visible').first();
      await expect(bdxDetailsPanel).toContainText(moneyRegex, { timeout: 120000 });

      const bdxText = await bdxDetailsPanel.innerText();
      const gwpOccurrences = (bdxText.match(/(?:GBP\s*)?£?\s*495\.21/gi) || []).length;
      expect(gwpOccurrences).toBeGreaterThan(0);
      gwpOccurrencesSummary = gwpOccurrences;
      logStep(`BDX values validated; 495.21 occurrences=${gwpOccurrences}`);

    // Cancellation flow with exact numeric values
      await searchAndOpenPolicyWithRetry(policyNumber);
      await salesforce.openRelatedTab();
      await salesforce.openInsurancePolicyFromRelated(policyNumber);
      await expect(page.getByRole('heading', { name: /Insurance Policy/i }).first()).toBeVisible({ timeout: 120000 });
      logStep('Re-opened Insurance Policy for cancellation flow');

      await salesforce.openCancelPolicyWizard();
      await expect(page.getByRole('heading', { name: /Cancel Policy/i })).toBeVisible({ timeout: 120000 });
      logStep('Cancel Policy wizard opened');

      await salesforce.completeCancelFromInceptionStep1(`Regression cancellation test (${policyNumber})`);
      await expect(page.getByRole('heading', { name: /Enter Premiums/i })).toBeVisible({ timeout: 120000 });
      logStep('Cancellation step 1 completed; Enter Premiums reached');

      await salesforce.completePremiumStepWithTaxCalculation(CANCELLATION_PREMIUM);
      logStep(`Premium and tax calculated with cancellation premium=${CANCELLATION_PREMIUM}`);

      const taxRow = page.locator('[role="row"]:has-text("Insurance Premium Tax")').first();
      await expect(taxRow).toBeVisible({ timeout: 120000 });

      const taxAmountCell = taxRow.locator('[role="gridcell"]').filter({ hasText: /GBP\s*-?59\.43|-?59\.43/ }).first();
      await expect(taxAmountCell).toBeVisible({ timeout: 120000 });

      const taxCellText = await taxAmountCell.innerText();
      const parsedTax = Number(taxCellText.replace(/[^\d.-]/g, ''));
      expect(Math.abs(parsedTax)).toBeCloseTo(Math.abs(EXPECTED_TAX), 2);
      parsedTaxSummary = parsedTax;
      logStep(`Tax assertion validated with parsedTax=${parsedTax}`);

      await salesforce.submitCancellation();
      await salesforce.expectPolicyStatusCancelled();
      await expect(page.getByRole('option', { name: 'Cancelled' })).toHaveAttribute('aria-selected', 'true', { timeout: 180000 });
      logStep('Cancellation submitted and cancelled status verified');
    } finally {
      console.log('[TC_REG_026] ---------------- Execution Summary ----------------');
      console.log(`[TC_REG_026] caseRef=${caseRef}`);
      console.log(`[TC_REG_026] policyNumber=${policyNumber || 'N/A'}`);
      console.log(`[TC_REG_026] bdxOpenMode=${bdxOpenModeSummary || 'N/A'}`);
      console.log(`[TC_REG_026] bdx495_21Occurrences=${gwpOccurrencesSummary}`);
      console.log(`[TC_REG_026] parsedTax=${parsedTaxSummary}`);
      console.log(`[TC_REG_026] expectedTax=${EXPECTED_TAX}`);
      console.log('[TC_REG_026] ---------------- Timeline ----------------');
      for (const line of executionLog) {
        console.log(line);
      }
      console.log('[TC_REG_026] ---------------------------------------------------');
    }
  });
});
