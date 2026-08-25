import { expect, test } from '@playwright/test';
import {
  CommercialFinalPolicyDetailsPage,
  CommercialLoginPage,
  CommercialOrderDialog,
  CommercialPolicyIssuedPage,
  CommercialProductSelectionPage,
  CommercialQuoteManagerPage,
  CommercialQuotesPage,
  CommercialStatementsOfFactPage,
  CommercialSummaryPage,
} from '../../src/pages/mlis-portal-commercial';
import { BrokerPortalPage } from '../../src/pages/broker-portal-policy';
import { SalesforcePortalPage } from '../../src/pages/salesforce-cancellation';
import { TCRegNiCommercialIntermediaryPage } from '../../src/pages/tc-reg-ni-commercial-intermediary';
import { getBrokerCredentialsForProfile, getSalesforceCredentials } from '../../src/config/env';

test.describe('@sanity | E2E | BDX | MLIS Policy | Introducer Commission | EW Commercial NB>CNR>MTA>Cancel only MTA', () => {
  test('TC_BDX_001 | England & Wales Commercial NB policy, CNR, MTA future date premium 300, cancel only MTA', async ({ page }) => {
    test.setTimeout(900000);
    test.slow();

    const caseRef = `E2E-BDX-EW-COMM-NB-CNR-MTA-CANMTA-${Date.now()}`;

    const nextDay = new Date();
    nextDay.setDate(nextDay.getDate() + 5);
    const mtaDate = nextDay.toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const brokerLogin = new CommercialLoginPage(page);
    const quoteManager = new CommercialQuoteManagerPage(page);
    const productSelection = new CommercialProductSelectionPage(page);
    const statements = new CommercialStatementsOfFactPage(page);
    const quotes = new CommercialQuotesPage(page);
    const finalDetails = new CommercialFinalPolicyDetailsPage(page);
    const summary = new CommercialSummaryPage(page);
    const orderDialog = new CommercialOrderDialog(page);
    const policyIssued = new CommercialPolicyIssuedPage(page);

    const brokerPortal = new BrokerPortalPage(page);
    const salesforce = new SalesforcePortalPage(page);
    const regNiIntermediary = new TCRegNiCommercialIntermediaryPage(page);

    // NB policy creation in Broker Portal (EW Commercial)
    await brokerLogin.goto();
    const brokerCreds = getBrokerCredentialsForProfile('INTRO_COMM');
    await brokerLogin.login(brokerCreds.username, brokerCreds.password);
    await quoteManager.expectLoaded();

    
    await quoteManager.startCommercialEnglandWalesQuote();
    await productSelection.expectLoaded();
    await productSelection.fillCaseReferenceAndLimit(caseRef, '500000');
    await productSelection.selectProductsByIndex([1]);
    await productSelection.proceed();

    await statements.expectLoaded();
    await statements.confirmAllStatements();
    await statements.proceed();

    await quotes.expectLoaded();
    await quotes.selectQuoteByIndex(1);

    await finalDetails.expectLoaded();
    await finalDetails.fillRequiredDetailsWithAllAddressLinesMax255();
    await finalDetails.proceed();

    await summary.expectLoaded();
    await summary.expectSummaryDataWithLongAddress(caseRef);
    await summary.proceedToOrder();
    await orderDialog.selectTodayAndOrder();

    await policyIssued.expectPolicyIssued();
    const policyLabel = page.locator('strong', { hasText: 'Policy number' });
    await expect(policyLabel).toBeVisible({ timeout: 60000 });
    const policyNumber = (await policyLabel.locator('xpath=following::p[1]').first().innerText()).trim();
    await policyIssued.backToQuoteManager();

    // Verify policy is live before CNR/MTA cancellation operations.
    await brokerPortal.expectQuoteManagerLoaded();
    await brokerPortal.searchPolicy(policyNumber);
    await brokerPortal.expectPolicyStatus(policyNumber, 'Live');

    // Login to Salesforce and open the policy record.
    await salesforce.goto();
    const sfCreds = getSalesforceCredentials();
    await salesforce.login(sfCreds.username, sfCreds.password, { useJwt: true, fast: true });
    await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);
    await salesforce.openRelatedTab();
    await salesforce.openInsurancePolicyFromRelated(policyNumber);

    // CNR with reason.
    await salesforce.openCancelAndReissueDialog();
    await salesforce.completeCancelAndReissueDialog({
      reasonForCR: 'User Error Correction',
      description: `NB>CNR>MTA>Cancel MTA Only flow (${policyNumber})`,
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

    // MTA with future effective date and premium increase to 300.
    await salesforce.openRelatedTab();
    await salesforce.openInsurancePolicyFromRelated(policyNumber);
    await salesforce.openCreateMTADialog();
    await salesforce.fillMTAReasonAndSave(
      'Exposure/Limit Changes',
      `MTA with future date and premium increase (${policyNumber})`,
    );
    await salesforce.fillIntermediaryReference(`MTA-REF-${Date.now()}`);
    //await regNiIntermediary.updateSubmissionSourceIntermediaryFields();
    await salesforce.editMTAPremium('300');
    await salesforce.bindMTA(mtaDate);

    // Cancel only the MTA.
    await salesforce.openCancelPolicyWizard();
    await salesforce.completeCancelFromInceptionStep2(
      `Cancel this MTA only after NB>CNR>MTA flow (${policyNumber})`,
    );
    await salesforce.completePremiumStepCalculateTaxOkAndNext();

    // BDX assertion for the flow lines generated.
    await salesforce.openRelatedTab();

    const bdxCard = page.locator('article:visible').filter({ hasText: /\bBDX\b/i }).first();

    const scrollLightningContainers = async () => {
      await page.evaluate(() => {
        // Salesforce Lightning often scrolls inside nested containers, not the window.
        // Scroll the window and any element that is currently scrollable.
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

      // First try: ask Playwright to scroll directly to the element.
      await bdxCard.scrollIntoViewIfNeeded().catch(() => undefined);
      if (await bdxCard.isVisible({ timeout: 500 }).catch(() => false)) {
        break;
      }

      // Fallback: scroll likely Lightning containers.
      await page.mouse.wheel(0, 1200);
      await scrollLightningContainers();
      await page.waitForTimeout(300);
    }

    await expect(bdxCard).toBeVisible({ timeout: 120000 });

    const bdxInlineRows = bdxCard.locator('tbody tr:visible');
    const bdxViewAllLink = bdxCard.getByRole('link', { name: /^View All/i }).first();
    const bdxHeaderLink = bdxCard.getByRole('link', { name: /\bBDX\b/i }).first();

    await expect
      .poll(async () => {
        if (await bdxInlineRows.first().isVisible({ timeout: 200 }).catch(() => false)) return 'inline';
        if (await bdxViewAllLink.isVisible({ timeout: 200 }).catch(() => false)) return 'viewAll';
        if (await bdxHeaderLink.isVisible({ timeout: 200 }).catch(() => false)) return 'header';

        await page.mouse.wheel(0, 1200);
        await scrollLightningContainers();
        return '';
      }, { timeout: 120000 })
      .not.toBe('');

    // Prefer opening the full related list view when available.
    if (await bdxViewAllLink.isVisible({ timeout: 1000 }).catch(() => false)) {
      await bdxViewAllLink.click();
    } else if (await bdxHeaderLink.isVisible({ timeout: 1000 }).catch(() => false)) {
      await bdxHeaderLink.click();
    }

    const bdxTable = page.locator('table:visible').first();
    await expect(bdxTable).toBeVisible({ timeout: 120000 });
    await expect.poll(async () => await bdxTable.locator('tbody tr').count(), { timeout: 120000 }).toBeGreaterThan(0);
    // Transaction labels vary by environment; UAT2 may label MTA/CNR activity as Endorsement.
    await expect(bdxTable).toContainText(/cancel|mta|reissue|endorsement/i);

    await bdxTable.scrollIntoViewIfNeeded();

    const screenshotPath = test.info().outputPath('bdx-nb-cnr-mta-cancel-mta-only-lines.png');
    await page.screenshot({ path: screenshotPath, fullPage: true });
    await test.info().attach('BDX NB-CNR-MTA-Cancel-MTA lines', { path: screenshotPath, contentType: 'image/png' });
  });
});
