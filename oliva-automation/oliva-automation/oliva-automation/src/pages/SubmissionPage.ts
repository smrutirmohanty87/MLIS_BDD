import { expect, Page } from '@playwright/test';
import { waitForSpinners } from '../utils/sf';

/** Risk ID format on the submission record — product-agnostic (CAHO, RENO, …),
 *  e.g. DOU/00124099/CAHO/00 or DOU/00124229/RENO/00. */
const RISK_ID_PATTERN = /DOU\/\d+\/[A-Z]+\/\d+/;

/**
 * Submission record page (`/lightning/r/Opportunity/<id>/view`), reached
 * after the submission OmniScript submits. Stage "Underwriting Review";
 * header buttons: Edit Submission / Create New Quote / Sanction Check.
 */
export class SubmissionPage {
  constructor(private page: Page) {}

  /**
   * Read the "Risk ID" value from the record header/details.
   * @returns the matched Risk ID, e.g. "DOU/00124099/CAHO/00".
   */
  async riskId(): Promise<string> {
    const holder = this.page.getByText(RISK_ID_PATTERN).first();
    await expect(holder).toBeVisible({ timeout: 60_000 });
    const text = (await holder.textContent()) ?? '';
    const match = text.match(RISK_ID_PATTERN);
    if (!match) {
      throw new Error(`Risk ID pattern not found in header text: "${text}"`);
    }
    return match[0];
  }

  /**
   * Click "Create New Quote" and wait for the quote OmniScript wizard's
   * first step heading "Select Product" (opens in a console subtab).
   */
  async createNewQuote(): Promise<void> {
    await this.page.getByRole('button', { name: 'Create New Quote' }).first().click();
    await waitForSpinners(this.page);
    const heading = this.page
      .getByRole('heading', { name: 'Select Product' })
      .or(this.page.getByText('Select Product', { exact: true }))
      .first();
    await expect(heading).toBeVisible({ timeout: 90_000 });
  }
}
