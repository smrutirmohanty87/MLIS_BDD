import { expect, Page } from '@playwright/test';
import { waitForSpinners } from '../utils/sf';

/**
 * Account object home (list views) and the Account record page from which
 * the Oliva submission wizard is launched.
 */
export class AccountsPage {
  constructor(private page: Page) {}

  /**
   * Navigate to the Account list, switch to the "All Intermediary Accounts"
   * list view, search for the account by name and open its record page.
   */
  async openAccount(accountName: string): Promise<void> {
    // Direct deep link to the list view (API name verified from the app's
    // own console nav link) — skips the flaky list-view picker entirely.
    await this.page.goto('/lightning/o/Account/list?filterName=All_Intermediary_Accounts');
    await waitForSpinners(this.page);

    // Filter the grid via the list search box, then open the record.
    const search = this.page.getByPlaceholder(/Search this list/i).first();
    await expect(search).toBeVisible({ timeout: 60_000 });
    await search.click();
    await search.fill(accountName);
    await search.press('Enter');
    await waitForSpinners(this.page);

    const link = this.page.getByRole('link', { name: accountName }).first();
    await expect(link).toBeVisible({ timeout: 60_000 });
    await link.click();
    await waitForSpinners(this.page);
  }

  /**
   * Launch the "New Oliva Submission" OmniScript from the account record
   * header (falls back to the overflow/actions dropdown), then wait for the
   * wizard's first step heading "Submission Source".
   */
  async startNewOlivaSubmission(): Promise<void> {
    // The action lives in the record header; wait for it to paint (the header
    // renders after the record body, so an immediate isVisible() races false).
    const direct = this.page.getByRole('button', { name: 'New Oliva Submission' }).first();
    await expect(direct).toBeVisible({ timeout: 60_000 });
    await direct.click();
    await waitForSpinners(this.page);

    const heading = this.page
      .getByRole('heading', { name: 'Submission Source' })
      .or(this.page.getByText('Submission Source', { exact: true }))
      .first();
    await expect(heading).toBeVisible({ timeout: 90_000 });
  }
}
