import { expect, Page } from '@playwright/test';
import { PremiumEntry } from '../data/testdata';

/**
 * "Edit Premiums" OmniScript (full-page console subtab opened by the quote
 * header "Enter Premiums" button — QuotePage.clickEnterPremiums waits for its
 * heading before this class is used).
 *
 * Verified structure: sections headed "Coverage", "Coverage 2", "Coverage 3"…
 * Each section carries readOnly inputs labelled "Coverage" and "Insurable
 * Name" plus editable "Technical Premium", "Gross Written Premium",
 * "100% Annualized Gross Premium" and "Agreed Intermediary Commission Rate"
 * (all defaulting to "0"). Labels repeat once per section in DOM order, so
 * `.nth(i)` scoping per label is reliable.
 */
export class PremiumPage {
  constructor(private page: Page) {}

  /**
   * Construction "Enter Premiums" starts with a picklist "Is any part of policy
   * Minimum & Deposit?" — answer it before filling the coverage blocks.
   */
  async answerMinimumDeposit(value: string): Promise<void> {
    const combo = this.page
      .getByLabel(/Minimum\s*&?\s*Deposit/i)
      .filter({ visible: true })
      .first();
    await expect(combo).toBeVisible({ timeout: 60_000 });
    await combo.click();
    const option = this.page
      .getByRole('option', { name: value, exact: true })
      .or(
        this.page
          .locator('[role="listbox"] [role="option"], lightning-base-combobox-item')
          .filter({ hasText: value })
      )
      .filter({ visible: true })
      .first();
    await expect(option).toBeVisible({ timeout: 20_000 });
    await option.click();
  }

  /**
   * Fill every premium section from `premiums` (matched by exact coverage
   * name and insurable-name prefix; '' insurable = product-level coverage),
   * then Submit. Submitting triggers a FULL PAGE RELOAD (Salesforce splash):
   * waits for the load state and for the quote page landmark ("Enter
   * Premiums" button or "Coverages" tab) to reappear (up to 120s).
   *
   * @param premiums premium map — panel order varies between runs, so entries
   *                 are looked up per section, never applied by index.
   * @throws if a section's coverage/insurable pair has no matching entry.
   */
  async fillAndSubmit(premiums: PremiumEntry[]): Promise<void> {
    // Filter to visible controls — OmniScript keeps hidden template copies that
    // would otherwise double the section count and skew nth() indexing.
    const coverageInputs = this.page
      .getByLabel('Coverage', { exact: true })
      .filter({ visible: true });
    const insurableInputs = this.page
      .getByLabel('Insurable Name', { exact: true })
      .filter({ visible: true });
    await expect(coverageInputs.first()).toBeVisible({ timeout: 60_000 });

    const sections = await coverageInputs.count();
    if (sections === 0) {
      throw new Error('Enter Premiums: no "Coverage" sections found on the form');
    }

    console.log(`[PremiumPage] NB fillAndSubmit: ${sections} coverage sections found`);

    for (let i = 0; i < sections; i++) {
      const coverage = (await coverageInputs.nth(i).inputValue()).trim();
      const insurable = (await insurableInputs.nth(i).inputValue()).trim();
      const entry = premiums.find(
        (p) =>
          p.coverage === coverage &&
          (p.insurable === '' ? insurable === '' : insurable.startsWith(p.insurable))
      );
      if (!entry) {
        throw new Error(
          `Enter Premiums: no PremiumEntry matches section ${i + 1} ` +
            `(coverage="${coverage}", insurable="${insurable}")`
        );
      }
      console.log(
        `[PremiumPage] NB section ${i}: "${coverage}" (insurable="${insurable}") → technical="${entry.technical}", grossWritten="${entry.grossWritten}", annualized="${entry.annualized}", commissionRate="${entry.commissionRate}"`
      );
      await this.fillNth('Technical Premium', i, entry.technical);
      await this.fillNth('Gross Written Premium', i, entry.grossWritten);
      await this.fillNth('100% Annualized Gross Premium', i, entry.annualized);
      await this.fillNth('Agreed Intermediary Commission Rate', i, entry.commissionRate);
    }

    console.log('[PremiumPage] NB all sections filled, now submitting...');
    await this.submitAndWaitForReload();
  }

  /**
   * Renewal "Enter Premiums": fill the SAME four premium values into every
   * coverage section (the renewal doc uses uniform values across coverages),
   * then Submit. Same full-page-reload landing as {@link fillAndSubmit}.
   */
  async fillUniformAndSubmit(vals: {
    technical: string;
    grossWritten: string;
    annualized: string;
    commissionRate: string;
  }): Promise<void> {
    const coverageInputs = this.page
      .getByLabel('Coverage', { exact: true })
      .filter({ visible: true });
    await expect(coverageInputs.first()).toBeVisible({ timeout: 60_000 });
    const sections = await coverageInputs.count();
    if (sections === 0) {
      throw new Error('Enter Premiums: no "Coverage" sections found on the form');
    }
    for (let i = 0; i < sections; i++) {
      await this.fillNth('Technical Premium', i, vals.technical);
      await this.fillNth('Gross Written Premium', i, vals.grossWritten);
      await this.fillNth('100% Annualized Gross Premium', i, vals.annualized);
      await this.fillNth('Agreed Intermediary Commission Rate', i, vals.commissionRate);
    }
    await this.submitAndWaitForReload();
  }

  /**
   * MTA "Enter Premiums": the only editable control per coverage is
   * "100% MTA Charge Premium" (Technical/Gross Written etc. are carried over
   * read-only). Fill every such input with `chargePremium`, then Submit.
   */
  async fillMtaChargeAndSubmit(chargePremium: string): Promise<void> {
    const escaped = '100% MTA Charge Premium'.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const charges = this.page
      .getByLabel(new RegExp(`^\\*?\\s*${escaped}\\s*$`))
      .filter({ visible: true });
    await expect(charges.first()).toBeVisible({ timeout: 60_000 });
    const count = await charges.count();
    if (count === 0) {
      throw new Error('MTA Enter Premiums: no "100% MTA Charge Premium" inputs found');
    }
    for (let i = 0; i < count; i++) {
      const input = charges.nth(i);
      await input.scrollIntoViewIfNeeded();
      await input.click({ clickCount: 3 });
      await input.fill(chargePremium);
    }
    await this.submitAndWaitForReload();
  }

  /**
   * MTA "Enter Premiums" with coverage-specific charge premiums.
   * @param chargePremiums Array of { coverage, chargePremium } objects
   * Matches each coverage name to the corresponding input and fills with its charge premium.
   */
  async fillMtaChargeAndSubmitByCoverage(
    chargePremiums: Array<{ coverage: string; chargePremium: string }>
  ): Promise<void> {
    const escaped = '100% MTA Charge Premium'.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const charges = this.page
      .getByLabel(new RegExp(`^\\*?\\s*${escaped}\\s*$`))
      .filter({ visible: true });
    await expect(charges.first()).toBeVisible({ timeout: 60_000 });
    const count = await charges.count();
    if (count === 0) {
      throw new Error('MTA Enter Premiums: no "100% MTA Charge Premium" inputs found');
    }

    // Get all coverage names by looking at each section
    const coverageInputs = this.page
      .getByLabel('Coverage', { exact: true })
      .filter({ visible: true });
    const coverageCount = await coverageInputs.count();

    if (coverageCount !== count) {
      console.warn(
        `MTA: coverage sections (${coverageCount}) != charge premium inputs (${count}); attempting to match by order`
      );
    }

    console.log(`[PremiumPage] MTA fillByCoverage: ${count} charge premium inputs found`);
    console.log(
      `[PremiumPage] Expected chargePremiums: ${JSON.stringify(chargePremiums.map((cp) => cp.coverage))}`
    );

    // Fill each charge premium with the corresponding coverage value
    for (let i = 0; i < count; i++) {
      let chargePremium = '';
      let coverage = '';

      // Try to find matching coverage
      if (i < coverageCount) {
        coverage = await coverageInputs.nth(i).inputValue();
        const match = chargePremiums.find((cp) => cp.coverage === coverage);
        if (match) {
          chargePremium = match.chargePremium;
          console.log(`[PremiumPage] MTA row ${i}: "${coverage}" → "${chargePremium}"`);
        } else {
          console.warn(
            `[PremiumPage] MTA row ${i}: coverage "${coverage}" has no matching charge premium entry`
          );
        }
      }

      if (chargePremium !== '') {
        const input = charges.nth(i);
        await input.scrollIntoViewIfNeeded();
        await input.click({ clickCount: 3 });
        await input.fill(chargePremium);
        // Verify the value was set
        const filledValue = await input.inputValue();
        console.log(
          `[PremiumPage] MTA row ${i}: filled "${chargePremium}", verified as "${filledValue}"`
        );
      }
    }

    await this.submitAndWaitForReload();
  }

  /** Submit the OmniScript and wait for the full-page reload back to the quote. */
  private async submitAndWaitForReload(): Promise<void> {
    console.log('[PremiumPage] Clicking Submit button...');
    await this.page.getByRole('button', { name: 'Submit', exact: true }).last().click();
    
    console.log('[PremiumPage] Waiting for page load after Submit...');
    // Wait for navigation to complete
    await this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 120_000 }).catch(() => {
      // Navigation might not happen if we're already on the same page, so ignore errors
    });
    
    console.log('[PremiumPage] Waiting for landmark (Enter Premiums or Coverages tab)...');
    const landmark = this.page
      .getByRole('button', { name: 'Enter Premiums' })
      .or(this.page.getByRole('tab', { name: 'Coverages' }));
    await expect(landmark.first()).toBeVisible({ timeout: 120_000 });
    console.log('[PremiumPage] Page load complete after Submit');
  }

  /** Fill the i-th input for `label` (select-all via triple click first). */
  private async fillNth(label: string, index: number, value: string): Promise<void> {
    // Required fields carry a leading "*" in their accessible name; match either
    // form, anchored so e.g. "Gross Written Premium" ≠ "Annualized Gross Premium".
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const input = this.page
      .getByLabel(new RegExp(`^\\*?\\s*${escaped}\\s*$`))
      .filter({ visible: true })
      .nth(index);
    await input.scrollIntoViewIfNeeded();
    await input.click({ clickCount: 3 });
    await input.fill(value);
    const filledValue = await input.inputValue();
    console.log(
      `[PremiumPage] fillNth("${label}", ${index}): set to "${value}", verified as "${filledValue}"`
    );
  }
}
