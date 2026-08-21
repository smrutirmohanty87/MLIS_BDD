import { expect, Locator, Page } from '@playwright/test';
import { CLIENT_INFO, RISK_INFO } from '../data/testdata';
import { ukDate, waitForSpinners } from '../utils/sf';

/**
 * The 4-step "New Oliva Submission" OmniScript wizard
 * (`dualNewSubmissionForOlivaEnglish`). All controls are open shadow DOM —
 * plain page-scoped `getByLabel` / `getByText` locators pierce it natively.
 *
 * NEVER click accordion section headers (e.g. "Risk Details") — they collapse.
 */
export class SubmissionWizardPage {
  constructor(private page: Page) {}

  /** Step 1 — Submission Source: pick the Intermediary Contact, then Next. 
   * Wait for the contact field to be interactive before attempting to fill it.
   */
  async fillSubmissionSource(contact: string): Promise<void> {
    // Wait for the Intermediary Contact field to become visible and interactive
    const contactInput = this.page.getByLabel('Intermediary Contact', { exact: false }).first();
    await expect(contactInput).toBeVisible({ timeout: 60_000 });
    await waitForSpinners(this.page);
    
    await this.pickTypeahead('Intermediary Contact', contact);
    await this.next();
  }

  /** Step 2 — Client Information: existing-client typeahead + lookups + text. */
  async fillClientInformation(d: typeof CLIENT_INFO): Promise<void> {
    // Existing client: the option with the exact insured name appears.
    await this.pickTypeahead('Insured Name', d.insuredName);
    await this.pickOption('Industry Sector', d.industrySector);
    await this.pickOption('Activity Code', d.activityCode);
    await this.pickOption('Product', d.product);
    await this.fillText('Business Description', d.businessDescription);
    await this.pickOption('Year Business Established', d.yearBusinessEstablished);
    await this.fillText('Employee Size', d.employeeSize);
    await this.fillText('Client Turnover', d.clientTurnover);
    await this.pickOption('Client Classification Type', d.clientClassificationType);
    await this.next();
  }

  /** Step 3 — Submission Risk Information: risk type, dates, references. */
  async fillRiskInformation(d: typeof RISK_INFO): Promise<void> {
    await this.pickOption('Risk Type', d.riskType);
    await this.fillDate('Quote Required by Date', ukDate(d.quoteRequiredOffsetDays));
    await this.fillDate('Risk Inception Date/Renewal Date', ukDate(0));
    await this.fillText('Intermediary Reference', d.intermediaryReference);
    // This field sits under the calendar overlay unless Escape was pressed.
    // Optional: some product docs (e.g. Contractors Combined) leave it blank.
    if (d.insurerQuotePolicyReference) {
      await this.fillText('Insurer Quote/Policy Reference', d.insurerQuotePolicyReference);
    }
    await this.next();
  }

  /**
   * Step 4 — Previous Claims History: the combobox defaults to "No" but is
   * set explicitly to be safe, then Submit. Waits (~20-30s) for the
   * Submission record page (button "Create New Quote").
   */
  async submitClaimsHistory(): Promise<void> {
    const claims = this.page.getByLabel(/claims/i).first();
    if (await claims.isVisible().catch(() => false)) {
      await claims.click();
      await this.clickOptionText('No');
      await waitForSpinners(this.page);
    }
    await this.page.getByRole('button', { name: 'Submit', exact: true }).first().click();
    await expect(
      this.page.getByRole('button', { name: 'Create New Quote' }).first()
    ).toBeVisible({ timeout: 120_000 });
  }

  // ---------------------------------------------------------------- helpers

  /** Click the labelled input, type, wait for the async dropdown, pick option. */
  private async pickTypeahead(label: string, text: string): Promise<void> {
    const input = this.page.getByLabel(label, { exact: false }).first();
    await input.click();
    await input.fill(text);
    await this.page.waitForTimeout(2000); // typeahead debounce/remote fetch
    await this.clickOptionText(text);
    await waitForSpinners(this.page);
  }

  /**
   * Lookups and picklist comboboxes behave the same for our purposes:
   * clicking the labelled input opens the options list (typing may not
   * filter lookups), then the option is clicked by exact text.
   */
  private async pickOption(label: string, option: string): Promise<void> {
    const input = this.page.getByLabel(label, { exact: false }).first();
    await input.click();
    await this.clickOptionText(option);
    await waitForSpinners(this.page);
  }

  /** Click a dropdown option by exact text (role=option or plain text row). */
  private async clickOptionText(option: string): Promise<void> {
    // Filter to VISIBLE — the field's prefilled value can render the same text
    // in a hidden span (verified when an existing client pre-populates Industry
    // Sector = Construction), which `.first()` would otherwise grab.
    const opt: Locator = this.page
      .getByRole('option', { name: option, exact: true })
      .or(this.page.getByText(option, { exact: true }))
      .filter({ visible: true })
      .first();
    await expect(opt).toBeVisible({ timeout: 30_000 });
    await opt.click();
  }

  /** Fill a plain labelled text field / textarea. */
  private async fillText(label: string, value: string): Promise<void> {
    const input = this.editableByLabel(label);
    await input.click();
    await input.fill(value);
  }

  /**
   * Resolve a labelled field to the actual editable control. Some Oliva fields
   * carry an info-tooltip <button> whose aria-label starts with the field name,
   * so a plain getByLabel can resolve to the button — restrict to input/textarea.
   */
  private editableByLabel(label: string): Locator {
    return this.page
      .getByLabel(label, { exact: false })
      .and(this.page.locator('input, textarea'))
      .first();
  }

  /**
   * Fill a date input (dd/mm/yyyy) then press Escape — the calendar overlay
   * otherwise blocks the right-hand column of the step.
   */
  private async fillDate(label: string, value: string): Promise<void> {
    const input = this.editableByLabel(label);
    await input.click();
    await input.fill(value);
    await this.page.keyboard.press('Escape');
    await this.page.waitForTimeout(500);
  }

  /** Advance to the next wizard step and wait out spinners. */
  private async next(): Promise<void> {
    await this.page.getByRole('button', { name: 'Next', exact: true }).first().click();
    await waitForSpinners(this.page);
  }
}
