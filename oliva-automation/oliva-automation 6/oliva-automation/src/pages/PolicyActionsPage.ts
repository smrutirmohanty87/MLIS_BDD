import { expect, Locator, Page } from '@playwright/test';
import { CNR, MTA, CANCELLATION } from '../data/testdata';
import { ukDateDash, waitForSpinners } from '../utils/sf';

/**
 * InsurancePolicy record header actions and the OmniScript wizard forms they
 * open (all open shadow DOM — plain page-scoped locators pierce it; the
 * wizards render in full-page console subtabs).
 *
 * Header layout (verified in the doc screenshots):
 *   Follow | Post-Bind Questions | Generate Document | Create MTA | ▾
 * The ▾ overflow contains: Cancel Policy, Create Claim, Renewal Quote,
 * Submit for Approval, New Note, Change Owner, Cancel and Reissue.
 */
export class PolicyActionsPage {
  constructor(private page: Page) {}

  // ----------------------------------------------------------------- actions

  /**
   * CNR — header ▾ → "Cancel and Reissue" → "Cancel and Reissue Details"
   * (set Reason for C&R + Description; dates and Reason are prefilled) →
   * Submit. Lands on the new CRN quote record.
   */
  async startCancelAndReissue(): Promise<void> {
    await this.openHeaderMenu();
    await this.clickMenuItem('Cancel and Reissue');
    await this.expectWizard('Cancel and Reissue Details');

    await this.pickOption('Reason for C&R', CNR.reasonForCandR);
    await this.fillText('Description', CNR.description);
    await this.submitWizard();
    await this.expectQuoteRecord();
  }

  /**
   * MTA — header "Create MTA" button → "Enter MTA Information"
   * (set Reason + Description; dates/time prefilled) → Submit. Lands on the
   * MTA quote record.
   */
  async createMta(): Promise<void> {
    const createMtaBtn = this.page
      .getByRole('button', { name: 'Create MTA', exact: true })
      .filter({ visible: true })
      .first();
    await expect(createMtaBtn).toBeVisible({ timeout: 60_000 });
    await createMtaBtn.click();
    await this.expectWizard('Enter MTA Information');

    // Verified LIVE: MTA Effective Date + Submission Date are EMPTY and
    // required (the doc's prefilled screenshots are stale). They must be filled
    // in DD-MM-YYYY and committed with Tab (Escape reverts them).
    await this.fillOmniDate('MTA Effective Date', ukDateDash(MTA.effectiveOffsetDays));
    await this.fillOmniDate('MTA Submission Date', ukDateDash(MTA.submissionOffsetDays));
    await this.pickOption('MTA Reason', MTA.reason);
    await this.fillText('MTA Description', MTA.description);
    await this.submitWizard();
    await this.expectQuoteRecord();
  }

  /**
   * Renewal — header ▾ → "Renewal Quote" → "Warning" (Yes) →
   * "Risk Details" (dates prefilled) → Submit. Lands on the renewal quote.
   */
  async startRenewal(): Promise<void> {
    await this.openHeaderMenu();
    await this.clickMenuItem('Renewal Quote');

    await this.expectWizard('Warning');
    await this.page
      .getByRole('button', { name: 'Yes', exact: true })
      .filter({ visible: true })
      .first()
      .click();
    await waitForSpinners(this.page);

    await this.expectWizard('Risk Details');
    await this.submitWizard();
    await this.expectQuoteRecord();
  }

  /**
   * Cancellation — header ▾ → "Cancel Policy" → fill form → Next →
   * "Enter Premiums" (Return FULL Premium = Yes, Do you want to return fee(s)? = Yes if present) → Submit.
   * The policy record then shows the "Cancelled" path stage (asserted by the caller via
   * PolicyPage.assertState).
   *
   * Note: Effective Date is auto-filled by Salesforce and is readonly.
   *
   * @param cancellationData Optional cancellation data; defaults to CANCELLATION from testdata
   */
  async cancelPolicy(
    cancellationData?: {
      category: string;
      instigatedBy: string;
      reason: string;
      notes: string;
      returnFullPremium: string;
      returnFees?: string;
      policyStatus?: string;
    }
  ): Promise<void> {
    const data = cancellationData ?? CANCELLATION;

    await this.openHeaderMenu();
    await this.clickMenuItem('Cancel Policy');
    await this.expectWizard('Cancel Policy');

    // Step 1 — "Cancel Policy": fill the cancellation details
    await this.pickOption('Cancellation Category', data.category);
    
    // Cancellation Effective Date is only enabled/required for "Cancel the Policy Midterm" category
    // It's a date picker field, so use fillOmniDate instead of fillText
    // For midterm cancellation, use a future date that's greater than the auto-filled Effective Date
    // (30 days from now ensures it's always after the policy's effective date)
    if (data.category === 'Cancel the Policy Midterm') {
      await this.page.waitForTimeout(500); // wait for field to become editable after category selection
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 30); // 30 days from now
      const cancellationEffectiveDate = `${String(futureDate.getDate()).padStart(2, '0')}-${String(futureDate.getMonth() + 1).padStart(2, '0')}-${futureDate.getFullYear()}`;
      await this.fillOmniDate('Cancellation Effective Date', cancellationEffectiveDate);
    }
    
    await this.pickOption('Cancellation Instigated By', data.instigatedBy);
    await this.pickOption('Cancellation Reason', data.reason);
    await this.fillText('Cancellation Notes/Narrative', data.notes);

    await this.page
      .getByRole('button', { name: 'Next', exact: true })
      .filter({ visible: true })
      .last()
      .click();
    await waitForSpinners(this.page);

    // Step 2 — "Enter Premiums": handle "Return FULL Premium" field if present
    // (some products like CARA may not have this field on cancellation)
    await this.expectWizard('Enter Premiums');
    
    // Try to find and set "Return FULL Premium" field if present
    const returnPremiumField = this.page
      .getByLabel('Return FULL Premium')
      .filter({ visible: true })
      .first();
    
    const premiumFieldExists = await returnPremiumField.isVisible({ timeout: 5_000 }).catch(() => false);
    console.log('[cancelPolicy] premiumFieldExists:', premiumFieldExists);
    if (premiumFieldExists) {
      console.log('[cancelPolicy] Setting "Return FULL Premium" to:', data.returnFullPremium);
      await this.pickOption('Return FULL Premium', data.returnFullPremium);
      await this.page.waitForTimeout(1000);
    }
    
    // Try to find and set "Do you want to return fee(s)?" field if present and provided in data
    const returnFees = cancellationData?.returnFees;
    console.log('[cancelPolicy] returnFees value:', returnFees);
    
    if (returnFees) {
      console.log('[cancelPolicy] Looking for "Do you want to return fee(s)?" field with value:', returnFees);
      
      // Find the container that has the text "Do you want to return fee(s)?"
      const feeFieldContainer = this.page
        .locator('text=/do you want to return fee/i')
        .first();
      
      const feeContainerExists = await feeFieldContainer.isVisible({ timeout: 3_000 }).catch(() => false);
      console.log(`[cancelPolicy] feeContainerExists: ${feeContainerExists}`);
      
      if (feeContainerExists) {
        try {
          // Find the combobox/button within or near this container
          const combobox = feeFieldContainer
            .locator('..')  // parent
            .locator('button[role="combobox"], [role="combobox"], lightning-combobox button')
            .filter({ visible: true })
            .first();
          
          const comboboxExists = await combobox.isVisible({ timeout: 3_000 }).catch(() => false);
          console.log(`[cancelPolicy] comboboxExists: ${comboboxExists}`);
          
          if (comboboxExists) {
            console.log('[cancelPolicy] Clicking returnFees combobox');
            await combobox.click();
            await this.page.waitForTimeout(500);
            
            // Find and click the option (Yes/No)
            const option = this.page
              .getByRole('option', { name: returnFees, exact: true })
              .or(this.page.getByText(returnFees, { exact: true }))
              .filter({ visible: true })
              .first();
            
            console.log(`[cancelPolicy] Clicking option: ${returnFees}`);
            await expect(option).toBeVisible({ timeout: 10_000 });
            await option.click();
            await this.page.waitForTimeout(500);
            console.log('[cancelPolicy] Successfully set returnFees field');
          } else {
            console.warn('[cancelPolicy] WARNING: Combobox for returnFees field not found');
          }
        } catch (err) {
          console.error('[cancelPolicy] Error setting returnFees:', err);
          throw err;
        }
      } else {
        console.warn('[cancelPolicy] WARNING: "Do you want to return fee(s)?" field not found');
      }
    }
    
    console.log('[cancelPolicy] Submitting wizard form');
    await this.submitWizard();

    // Back on the InsurancePolicy record (path advances to "Cancelled").
    // For some products (like Renovation), the navigation might not happen automatically,
    // so we try to wait first, and if it times out, we manually navigate using the context ID
    try {
      await this.page.waitForURL(/\/InsurancePolicy\//, { timeout: 30_000 });
    } catch (e) {
      console.log('[cancelPolicy] Automatic navigation to policy record timed out, manually extracting and navigating');
      
      // Extract policy ID from URL context
      const currentUrl = this.page.url();
      const ctxMatch = currentUrl.match(/c__ContextId=([a-zA-Z0-9]+)/);
      
      if (ctxMatch?.[1]) {
        const policyId = ctxMatch[1];
        console.log(`[cancelPolicy] Extracted policy ID: ${policyId}, navigating...`);
        await this.page.goto(`/lightning/r/InsurancePolicy/${policyId}/view`);
        await waitForSpinners(this.page);
        await this.page.waitForTimeout(1000); // extra delay to ensure page fully renders
      } else {
        console.log('[cancelPolicy] Could not extract policy ID from URL, trying page reload');
        await this.page.reload();
        await waitForSpinners(this.page);
      }
    }
    
    await waitForSpinners(this.page);
  }

  // ----------------------------------------------------------------- helpers

  /**
   * Open the policy header actions overflow ▾. The record header sits at the
   * top of the page; earlier steps may leave it scrolled, so scroll up first.
   */
  private async openHeaderMenu(): Promise<void> {
    await this.page.mouse.wheel(0, -3000);
    await this.page.waitForTimeout(300);
    const overflow = this.page
      .getByRole('button', { name: /^Show more actions$|more actions/i })
      .filter({ visible: true })
      .first();
    await expect(overflow).toBeVisible({ timeout: 30_000 });
    await overflow.click();
    await expect(this.page.getByRole('menuitem').first()).toBeVisible({ timeout: 10_000 });
  }

  /** Click an overflow menu item by exact name. */
  private async clickMenuItem(name: string): Promise<void> {
    await this.page
      .getByRole('menuitem', { name, exact: true })
      .filter({ visible: true })
      .first()
      .click();
    await waitForSpinners(this.page);
  }

  /** Wait for an OmniScript wizard step heading (subtab) to render. */
  private async expectWizard(title: string): Promise<void> {
    const heading = this.page
      .getByRole('heading', { name: title })
      .or(this.page.getByText(title, { exact: true }))
      .filter({ visible: true })
      .first();
    await expect(heading).toBeVisible({ timeout: 120_000 });
    await waitForSpinners(this.page);
  }

  /** Submit the current wizard step (subtab Submit button). */
  private async submitWizard(): Promise<void> {
    await this.page
      .getByRole('button', { name: 'Submit', exact: true })
      .filter({ visible: true })
      .last()
      .click();
    await waitForSpinners(this.page);
  }

  /** Wait for a Quote record page (opened after CNR/MTA/Renewal submit). */
  private async expectQuoteRecord(): Promise<void> {
    await this.page.waitForURL(/\/Quote\//, { timeout: 150_000 }).catch(() => {});
    await expect(
      this.page.getByRole('tab', { name: 'Selected Binders', exact: true }).first()
    ).toBeVisible({ timeout: 150_000 });
    await waitForSpinners(this.page);
  }

  /**
   * Pick an option in an OmniScript picklist/combobox: click the labelled
   * control, then click the option by exact text (role=option or plain row).
   */
  private async pickOption(label: string, option: string): Promise<void> {
    const input = this.page
      .getByLabel(label, { exact: false })
      .filter({ visible: true })
      .first();
    await input.click();
    const opt: Locator = this.page
      .getByRole('option', { name: option, exact: true })
      .or(this.page.getByText(option, { exact: true }))
      .filter({ visible: true })
      .first();
    await expect(opt).toBeVisible({ timeout: 30_000 });
    await opt.click();
    await waitForSpinners(this.page);
  }

  /**
   * Fill a labelled text field / textarea. Some Oliva fields carry an
   * info-tooltip <button> whose aria-label starts with the field name, so the
   * match is restricted to input/textarea and the visible (non-template) copy.
   */
  private async fillText(label: string, value: string): Promise<void> {
    const input = this.page
      .getByLabel(label, { exact: false })
      .and(this.page.locator('input, textarea'))
      .filter({ visible: true })
      .first();
    await input.click();
    await input.fill(value);
  }

  /**
   * Fill a Vlocity OmniScript date input (DD-MM-YYYY) and commit with Tab.
   * Verified live: typing the slash form is rejected, and pressing Escape
   * reverts the value — so the value is typed, then blurred with Tab, then
   * re-read to confirm it stuck (retry once).
   */
  private async fillOmniDate(label: string, value: string): Promise<void> {
    const input = this.page
      .getByLabel(label, { exact: false })
      .and(this.page.locator('input'))
      .filter({ visible: true })
      .first();
    for (let attempt = 0; attempt < 2; attempt++) {
      await input.click();
      await input.fill('');
      await input.type(value, { delay: 20 });
      await this.page.keyboard.press('Tab');
      await this.page.waitForTimeout(300);
      const current = (await input.inputValue().catch(() => '')).replace(/\//g, '-');
      if (current === value) return;
    }
    // Leave it filled; a required-field validation on Submit will surface if not.
  }
}
