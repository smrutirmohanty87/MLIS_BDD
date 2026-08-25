import { expect, Page } from '@playwright/test';
import { waitForSpinners } from '../utils/sf';

/**
 * The 3-step quote-generation OmniScript wizard
 * (`dualQuoteGenerationInsuredCoverages_Oliva_v2English`):
 * Select Product (prefilled) → Quote Overview (prefilled) → Insurable Detail.
 * Every step is prefilled for the Care Howden scenario, so the wizard is
 * simply advanced and submitted.
 */
export class QuoteWizardPage {
  constructor(private page: Page) {}

  /**
   * Advance through all three prefilled steps, submit, and wait (~20-30s)
   * for the Quote record page: "Coverages" tab and "Enter Premiums" header
   * button both visible.
   */
  async completeWizard(): Promise<void> {
    // Step 1 — Select Product (product prefilled "Care Howden").
    await this.expectStep('Select Product');
    await this.next();

    // Step 2 — Quote Overview (name/Full Quote/In Progress prefilled).
    await this.expectStep('Quote Overview');
    await this.next();

    // Step 3 — Insurable Detail (UK address prefilled from client).
    await this.expectStep('Insurable Detail');
    await this.page.getByRole('button', { name: 'Submit', exact: true }).first().click();

    // Landing on /lightning/r/Quote/<id>/view takes 20-30s.
    await expect(
      this.page.getByRole('tab', { name: 'Coverages' }).first()
    ).toBeVisible({ timeout: 150_000 });
    await expect(
      this.page.getByRole('button', { name: 'Enter Premiums' }).first()
    ).toBeVisible({ timeout: 150_000 });
  }

  // ---------------------------------------------------------------- helpers

  /** Wait for a wizard step heading to be visible. */
  private async expectStep(title: string): Promise<void> {
    const heading = this.page
      .getByRole('heading', { name: title })
      .or(this.page.getByText(title, { exact: true }))
      .first();
    await expect(heading).toBeVisible({ timeout: 90_000 });
  }

  /** Advance to the next wizard step and wait out spinners. */
  private async next(): Promise<void> {
    await this.page.getByRole('button', { name: 'Next', exact: true }).first().click();
    await waitForSpinners(this.page);
  }
}
