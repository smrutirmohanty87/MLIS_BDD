import { expect, Page, test } from '@playwright/test';
import {
  NiCommercialFinalPolicyDetailsPage,
  NiCommercialLoginPage,
  NiCommercialOrderDialog,
  NiCommercialPolicyIssuedPage,
  NiCommercialProductSelectionPage,
  NiCommercialQuoteManagerPage,
  NiCommercialQuotesPage,
  NiCommercialStatementsOfFactPage,
  NiCommercialSummaryPage,
} from '../../src/pages/mlis-portal-ni-commercial';
import { BrokerPortalPage } from '../../src/pages/broker-portal-policy';
import { SalesforcePortalPage } from '../../src/pages/salesforce-cancellation';
import { getBrokerCredentials, getSalesforceCredentials } from '../../src/config/env';

const updatedIntermediaryLegalEntity = 'Portal MLIS | Partner a/c (automated) | Bde-Comm';

async function setLookupField(page: Page, fieldLabel: string, searchText: string, skipEdit = false) {
  // Salesforce Lightning inline-edit lookup — 4 steps.

  // Step 1: Click Edit (pencil) to activate inline-edit for this field.
  // When skipEdit is true the field is already in edit mode (sibling triggered inline-edit).
  if (!skipEdit) {
    const editButton = page
      .getByRole('button', { name: new RegExp(`Edit ${fieldLabel}\\s*$`, 'i') })
      .first();
    await expect(editButton).toBeVisible({ timeout: 60_000 });
    await editButton.click();
    await page.waitForTimeout(600);
  }

  // Step 2: Wait for any Salesforce spinner overlay to disappear, then clear existing pill.
  // Use exact field name patterns to avoid matching similarly-named sibling fields.
  await page.locator('.forceModalSpinner .modal-glass.visible').waitFor({ state: 'hidden', timeout: 30_000 }).catch(() => {});
  const escapedLabel = fieldLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const xButton = page
    .getByRole('button', { name: new RegExp(`Remove ${escapedLabel}\\s*$`, 'i') })
    .or(page.getByRole('button', { name: new RegExp(`Clear ${escapedLabel} Selection\\s*$`, 'i') }))
    .or(page.locator('button.slds-pill__remove').first())
    .first();
  if (await xButton.isVisible({ timeout: 2_000 }).catch(() => false)) {
    await xButton.click();
    await page.waitForTimeout(400);
  }

  // Step 3: Locate the input by exact field name to avoid matching sibling fields.
  const fieldInput = page
    .getByRole('combobox', { name: new RegExp(`^${escapedLabel}$`, 'i') })
    .or(page.locator(`input[aria-label="${fieldLabel}" i]`))
    .first();
  await expect(fieldInput).toBeVisible({ timeout: 15_000 });
  await fieldInput.click();
  // pressSequentially fires keyboard events one character at a time, properly
  // triggering Salesforce's debounced search without an empty-query race condition.
  await fieldInput.pressSequentially(searchText, { delay: 80 });
  await page.waitForTimeout(1_000);

  // Step 4: Select from the Search Results dropdown section only.
  // Exclude helper/action rows such as Advanced Search / Show More Results / Show All Results.
  const searchResultsList = page
    .locator('[role="listbox"]')
    .filter({ hasText: /search results/i })
    .first();

  const dropdownOption = searchResultsList
    .locator('[role="option"]:visible')
    .filter({ hasNotText: /advanced search|show more results|show all results|search for/i })
    .first();
  await expect(dropdownOption).toBeVisible({ timeout: 25_000 });
  await dropdownOption.click();
  await page.waitForTimeout(600);
}

async function updateSubmissionSourceIntermediaryFields(page: Page) {
  // Scroll down to reach the Submission Source section on the MTA record.
  await page.mouse.wheel(0, 1200);
  await page.waitForTimeout(800);

  // 1. Set Intermediary Legal Entity to the complete requested value.
  await setLookupField(page, 'Intermediary Legal Entity', updatedIntermediaryLegalEntity);

  // 2. Scroll down so the Intermediary Contact field (not Telephone) is in view.
  await page.mouse.wheel(0, 600);
  await page.waitForTimeout(500);

  // 3. Set Intermediary Contact — field is already in edit mode (no Edit pencil needed).
  await setLookupField(page, 'Intermediary Contact', 'T-013', true);

  // 4. Save both fields together.
  const saveButton = page.getByRole('button', { name: /^Save$/i }).first();
  await expect(saveButton).toBeVisible({ timeout: 30000 });
  await saveButton.click();
  await page.waitForTimeout(10000);
}

test.describe('@regression | E2E | NI Commercial | NB | MTA | Cancellation From Inception', () => {
  test(
    'DT-MLIS-DF25.5.0 | CR-237340 | TC_34_S6_Verify Cancellation premiums are applied to the appropriate intermediary when user change the Intermediary Legal Entity on MTA _NB>MTA>Cancel the Policy from Inception_NI commercial_Broker portal',
    async ({ page }) => {
      test.setTimeout(900000);
      test.slow();

      const caseRef = `E2E-NI-COMM-NB-MTA-CAN-INF-${Date.now()}`;

      const brokerLogin = new NiCommercialLoginPage(page);
      const quoteManager = new NiCommercialQuoteManagerPage(page);
      const productSelection = new NiCommercialProductSelectionPage(page);
      const statements = new NiCommercialStatementsOfFactPage(page);
      const quotes = new NiCommercialQuotesPage(page);
      const finalDetails = new NiCommercialFinalPolicyDetailsPage(page);
      const summary = new NiCommercialSummaryPage(page);
      const orderDialog = new NiCommercialOrderDialog(page);
      const policyIssued = new NiCommercialPolicyIssuedPage(page);

      const brokerPortal = new BrokerPortalPage(page);
      const salesforce = new SalesforcePortalPage(page);

      // NB: Create a fresh NI Commercial policy in Broker Portal.
      await brokerLogin.goto();
      const brokerCreds = getBrokerCredentials();
      await brokerLogin.login(brokerCreds.username, brokerCreds.password);
      await quoteManager.expectLoaded();

      await quoteManager.startCommercialNorthernIrelandQuote();
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
      const policyLabel = page.locator('strong', { hasText: 'Policy number' });
      await expect(policyLabel).toBeVisible({ timeout: 60000 });
      const policyNumber = (await policyLabel.locator('xpath=following::p[1]').first().innerText()).trim();
      await policyIssued.backToQuoteManager();

      // Verify policy is live before MTA/cancellation.
      await brokerPortal.expectQuoteManagerLoaded();
      await brokerPortal.searchPolicy(policyNumber);
      await brokerPortal.expectPolicyStatus(policyNumber, 'Live');

      // Login to Salesforce and open policy record.
      await salesforce.goto();
      const sfCreds = getSalesforceCredentials();
      await salesforce.login(sfCreds.username, sfCreds.password, { useJwt: true, fast: true });

      await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);
      await salesforce.openRelatedTab();
      await salesforce.openInsurancePolicyFromRelated(policyNumber);

      // Create MTA on policy.
      await salesforce.openCreateMTADialog();
      await salesforce.fillMTAReasonAndSave(
        'Exposure/Limit Changes',
        `MTA Description - Intermediary Legal Entity change for ${policyNumber}`,
      );
      await salesforce.fillIntermediaryReference(`MTA-REF-${Date.now()}`);
      await updateSubmissionSourceIntermediaryFields(page);
      await salesforce.editMTAPremium('100');
      await salesforce.bindMTA();

      // Cancel policy from inception after MTA.
      await salesforce.openCancelPolicyWizard();
      await salesforce.completeCancelFromInceptionStep1(
        `Cancellation from inception after NB->MTA flow (${policyNumber})`,
      );
      await salesforce.completePremiumStepWithTaxCalculation();
      await salesforce.submitCancellation();
      await salesforce.expectPolicyStatusCancelled();

      // Post-cancellation navigation sequence:
      // Tax Jurisdiction (View All) -> Back -> BDX (View All) -> Back -> SFI to FFA Transactions (View All)
      await salesforce.openRelatedTab();

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

      const resetLightningScrollToTop = async () => {
        await page.evaluate(() => {
          window.scrollTo(0, 0);

          const elements = Array.from(document.querySelectorAll<HTMLElement>('*'));
          for (const el of elements) {
            const style = window.getComputedStyle(el);
            const overflowY = style.overflowY;
            if (overflowY !== 'auto' && overflowY !== 'scroll') continue;
            if (el.scrollHeight <= el.clientHeight) continue;
            el.scrollTop = 0;
          }
        });
      };

      const openViewAllFromRelatedCard = async (titleRegex: RegExp) => {
        // Always start scanning from the top of the Related tab to avoid stale/offset scroll state.
        await resetLightningScrollToTop();
        await page.waitForTimeout(500);

        const card = page.locator('article:visible').filter({ hasText: titleRegex }).first();

        for (let i = 0; i < 40; i += 1) {
          if (await card.isVisible({ timeout: 500 }).catch(() => false)) {
            break;
          }

          await card.scrollIntoViewIfNeeded().catch(() => undefined);
          if (await card.isVisible({ timeout: 500 }).catch(() => false)) {
            break;
          }

          await page.mouse.wheel(0, 1200);
          await scrollLightningContainers();
          await page.waitForTimeout(300);
        }

        await expect(card).toBeVisible({ timeout: 120000 });

        const viewAllLink = card.getByRole('link', { name: /^View All/i }).first();
        const viewAllAnchor = card.locator('a:visible').filter({ hasText: /^View All/i }).first();
        const viewAllButton = card.getByRole('button', { name: /^View All/i }).first();

        const deadline = Date.now() + 120000;
        let clicked = false;
        while (Date.now() < deadline && !clicked) {
          if (await viewAllLink.isVisible({ timeout: 300 }).catch(() => false)) {
            await viewAllLink.click();
            clicked = true;
            break;
          }
          if (await viewAllAnchor.isVisible({ timeout: 300 }).catch(() => false)) {
            await viewAllAnchor.click();
            clicked = true;
            break;
          }
          if (await viewAllButton.isVisible({ timeout: 300 }).catch(() => false)) {
            await viewAllButton.click();
            clicked = true;
            break;
          }

          await page.mouse.wheel(0, 1200);
          await scrollLightningContainers();
          await page.waitForTimeout(300);
        }

        expect(clicked).toBeTruthy();

        const table = page.locator('table:visible').first();
        await expect(table).toBeVisible({ timeout: 120000 });
        await expect.poll(async () => table.locator('tbody tr').count(), { timeout: 120000 }).toBeGreaterThan(0);

        return table;
      };

      // 1) Tax Jurisdiction -> View All -> Back
      await openViewAllFromRelatedCard(/Tax\s*Jurisdiction/i);
      await page.goBack({ waitUntil: 'domcontentloaded' });
      await salesforce.openRelatedTab();
      await resetLightningScrollToTop();

      // 2) BDX -> View All -> Back
      await openViewAllFromRelatedCard(/\bBDX\b/i);
      await page.goBack({ waitUntil: 'domcontentloaded' });
      await salesforce.openRelatedTab();
      await resetLightningScrollToTop();

      // 3) SFI to FFA Transactions -> View All
      await openViewAllFromRelatedCard(/SFI\s*to\s*FFA\s*Transactions/i);

      // Final assertion: return to BDX -> View All -> open one BDX line
      // -> CR0090 Intermediary 1 - Name should match updated MTA value.
      await page.goBack({ waitUntil: 'domcontentloaded' });
      await salesforce.openRelatedTab();
      await resetLightningScrollToTop();

      const bdxTable = await openViewAllFromRelatedCard(/\bBDX\b/i);
      const bdxRowLink = bdxTable
        .locator('tbody tr th[scope="row"] a:visible, tbody tr td a:visible')
        .first();
      await expect(bdxRowLink).toBeVisible({ timeout: 120000 });
      await bdxRowLink.click();

      const cr0090ByLabelAttribute = page
        .locator('records-record-layout-item[field-label*="CR0090 Intermediary 1 - Name" i], records-record-layout-item[field-label*="CR0090" i]')
        .first();

      const cr0090ByVisibleText = page
        .locator('records-record-layout-item:visible, .slds-form-element:visible')
        .filter({ hasText: /CR0090\s*Intermediary\s*1\s*-\s*Name/i })
        .first();

      const cr0090Field = (await cr0090ByLabelAttribute.isVisible({ timeout: 5000 }).catch(() => false))
        ? cr0090ByLabelAttribute
        : cr0090ByVisibleText;

      await expect(cr0090Field).toBeVisible({ timeout: 120000 });
      await expect(cr0090Field).toContainText(updatedIntermediaryLegalEntity);

      const cr0090ValueLocator = cr0090Field
        .locator('.slds-form-element__static:visible, lightning-formatted-text:visible, .test-id__field-value:visible, span:visible, div:visible')
        .first();

      const cr0090RawText = (await cr0090ValueLocator.innerText().catch(async () => cr0090Field.innerText())).trim();
      const cr0090Value = cr0090RawText
        .replace(/CR0090\s*Intermediary\s*1\s*-\s*Name/gi, '')
        .trim();

      expect(cr0090Value).toContain(updatedIntermediaryLegalEntity);
    },
  );
});
