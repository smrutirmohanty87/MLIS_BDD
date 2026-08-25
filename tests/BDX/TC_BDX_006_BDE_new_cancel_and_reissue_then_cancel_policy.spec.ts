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
import { getBrokerCredentialsForProfile, getSalesforceCredentials } from '../../src/config/env';

test.describe('@sanity | E2E | BDX | BDE | Cancel and Reissue | Cancellation', () => {
  test('TC_BDX_006_BDE | BDE - Create new policy then cancel and reissue then cancel the policy', async ({ page }) => {
    test.setTimeout(900000);
    test.slow();

    const caseRef = `E2E-BDX-BDE-CR-CAN-${Date.now()}`;

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
    const brokerCreds = getBrokerCredentialsForProfile('BDE_COMM');
    await brokerLogin.login(brokerCreds.username, brokerCreds.password);
    await quoteManager.expectLoaded();
    await quoteManager.acceptCookiesIfVisible();

    await quoteManager.startResidentialEnglandWalesQuote();
    await productSelection.expectLoaded();
    await productSelection.fillCaseReferenceAndLimit(caseRef, '192345');
    await productSelection.selectProductsByIndex([1]);
    await productSelection.proceed();

    await statements.expectLoaded();
    await statements.confirmAllStatements();
    await statements.proceed();

    await quotes.expectLoaded();
    const axaInsurerLabel = page
      .locator('p[title="AXA XL Insurance Company UK Limited"] strong, strong')
      .filter({ hasText: /^AXA XL Insurance Company UK Limited$/i })
      .first();

    const scrollQuoteContainers = async () => {
      await page.evaluate(() => {
        window.scrollBy(0, 900);

        const elements = Array.from(document.querySelectorAll<HTMLElement>('*'));
        for (const el of elements) {
          const style = window.getComputedStyle(el);
          const overflowY = style.overflowY;
          if (overflowY !== 'auto' && overflowY !== 'scroll') continue;
          if (el.scrollHeight <= el.clientHeight) continue;
          el.scrollTop += 900;
        }
      });
    };

    let axaFound = false;
    for (let i = 0; i < 30; i += 1) {
      if (await axaInsurerLabel.isVisible({ timeout: 600 }).catch(() => false)) {
        axaFound = true;
        break;
      }
      await page.mouse.wheel(0, 900);
      await scrollQuoteContainers();
      await page.waitForTimeout(250);
    }

    expect(axaFound).toBeTruthy();
    await axaInsurerLabel.scrollIntoViewIfNeeded();

    const axaQuoteCard = axaInsurerLabel.locator('xpath=ancestor::*[.//button[normalize-space()="Select quote"]][1]');
    await expect(axaQuoteCard).toBeVisible({ timeout: 15000 });
    await axaQuoteCard.getByRole('button', { name: /^Select quote$/i }).click();

    await finalDetails.expectLoaded();
    await finalDetails.fillRequiredDetails();
    await finalDetails.proceed();

    await summary.expectLoaded();
    await summary.expectSummaryData(caseRef, { limitOfIndemnity: '192345' });
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

    // Global Search → open the exact policy number from the results grid.
    // Test-local retry for transient Salesforce search UI loading issues.
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
    expect(openedFromSearch).toBeTruthy();

    // Navigate to Related tab → open Insurance Policy record
    await salesforce.openRelatedTab();
    await salesforce.openInsurancePolicyFromRelated(policyNumber);

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

    // After Cancel & Re-issue, the UI can land on either:
    // - a "Policy issued" confirmation page, OR
    // - a "Return to submission" action, OR
    // - directly back on an Insurance Policy record.
    const policyIssuedHeading = page.getByRole('heading', { name: /policy issued/i }).first();
    const returnToSubmission = page
      .getByRole('button', { name: /Return to submission/i })
      .or(page.getByRole('link', { name: /Return to submission/i }))
      .first();
    const insurancePolicyHeading = page.getByRole('heading', { name: /Insurance Policy/i }).first();

    await expect
      .poll(
        async () => {
          if (await returnToSubmission.isVisible({ timeout: 500 }).catch(() => false)) return 'return';
          if (await policyIssuedHeading.isVisible({ timeout: 500 }).catch(() => false)) return 'issued';
          if (await insurancePolicyHeading.isVisible({ timeout: 500 }).catch(() => false)) return 'policy';
          return '';
        },
        { timeout: 180000 },
      )
      .not.toBe('');

    // Prefer the standard path: return to the Submission record and then open the policy from Related.
    if (await returnToSubmission.isVisible({ timeout: 2000 }).catch(() => false)) {
      await salesforce.clickReturnToSubmission();

      // Navigate to Related tab → open Insurance Policy record
      await salesforce.openRelatedTab();
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await page.reload({ waitUntil: 'domcontentloaded' });
      await salesforce.openInsurancePolicyFromRelated(policyNumber);
    } else {
      // Fallback: we're already on an Insurance Policy record (or didn't get a return action).
      await expect(insurancePolicyHeading).toBeVisible({ timeout: 120000 });
    }

    // If the policy is already cancelled (sometimes Cancel & Reissue cancels the original), don't attempt to cancel again.
    const cancelledOption = page.getByRole('option', { name: 'Cancelled' }).first();
    const alreadyCancelled = (await cancelledOption.getAttribute('aria-selected').catch(() => null)) === 'true';

    if (!alreadyCancelled) {
      // Open Cancel Policy wizard from "Show more actions" menu
      await salesforce.openCancelPolicyWizard();

      // Fill Cancel Policy Step 1 — category, instigated by, reason, notes
      await salesforce.completeCancelFromInceptionStep3(
        `Policy cancellation from inception - full premium return test (${policyNumber})`,
      );

      // Enter cancellation premium and calculate tax
      await salesforce.completePremiumStepWithTaxCalculation('-87.92');

      // Submit cancellation and wait for cancellation status/page
      await salesforce.submitCancellation();
    }

    await salesforce.expectPolicyStatusCancelled();

    // After cancellation: Related tab → BDX → View All → assert cancellation lines generated → screenshot
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
      if (await bdxCard.isVisible({ timeout: 500 }).catch(() => false)) break;
      await bdxCard.scrollIntoViewIfNeeded().catch(() => undefined);
      if (await bdxCard.isVisible({ timeout: 500 }).catch(() => false)) break;
      await page.mouse.wheel(0, 1200);
      await scrollLightningContainers();
      await page.waitForTimeout(300);
    }

    await expect(bdxCard).toBeVisible({ timeout: 120000 });

    const bdxViewAllLink = bdxCard.getByRole('link', { name: /^View All/i }).first();
    const bdxHeaderLink = bdxCard.getByRole('link', { name: /\bBDX\b/i }).first();

    // Requirement: click View All (fallback: open the BDX header link if View All isn't rendered)
    for (let i = 0; i < 25; i += 1) {
      if (await bdxViewAllLink.isVisible({ timeout: 500 }).catch(() => false)) break;
      await page.mouse.wheel(0, 1200);
      await scrollLightningContainers();
      await page.waitForTimeout(200);
    }

    if (await bdxViewAllLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await bdxViewAllLink.click();
    } else {
      await expect(bdxHeaderLink).toBeVisible({ timeout: 15000 });
      await bdxHeaderLink.click();
    }

    const bdxTable = page.locator('table:visible').first();
    await expect(bdxTable).toBeVisible({ timeout: 120000 });
    await expect.poll(async () => bdxTable.locator('tbody tr').count(), { timeout: 120000 }).toBeGreaterThan(0);
    await expect(bdxTable).toContainText(/cancel/i);

    const screenshotPath = test.info().outputPath('bdx-cancellation-lines.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    await test.info().attach('BDX cancellation lines', { path: screenshotPath, contentType: 'image/png' });
  });
});
