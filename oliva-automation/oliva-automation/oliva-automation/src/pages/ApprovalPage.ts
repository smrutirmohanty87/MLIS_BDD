import { Page, expect } from '@playwright/test';
import { LoginPage } from './LoginPage';
import { waitForSpinners } from '../utils/sf';

/**
 * UAL approver actions — runs in a SECOND browser context logged in as the
 * UW5 approver (`SF_UAL_APPROVER_USERNAME`). Used ONLY inside the conditional
 * UAL branch, when marking the quote stage fails with the UAL error toast.
 */
export class ApprovalPage {
  constructor(private page: Page) {}

  /** Standard Salesforce sandbox login (same flow as the main UW3 context). */
  async login(username: string, password: string): Promise<void> {
    await new LoginPage(this.page).login(username, password);
  }

  /**
   * Approve the pending "UAL Approver" step on the quote's Approval History.
   * The Approve | Reject | Reassign buttons are visible only to the assigned
   * approver. Verifies the step row shows "Approved" (reloading once if the
   * grid is stale).
   */
  async approvePendingUal(quoteId: string): Promise<void> {
    await this.page.goto(`/lightning/r/Quote/${quoteId}/related/ProcessSteps/view`);
    await waitForSpinners(this.page);
    await expect(
      this.page.getByText('Approval History').first()
    ).toBeVisible({ timeout: 60_000 });

    const approveButton = this.page
      .getByRole('button', { name: 'Approve', exact: true })
      .filter({ visible: true })
      .first();
    await expect(approveButton).toBeVisible({ timeout: 60_000 });
    await approveButton.click();

    // Modal "Approve Quote" with a Comments box.
    const dialog = this.page
      .getByRole('dialog')
      .filter({ hasText: 'Approve Quote' })
      .first();
    await expect(dialog).toBeVisible({ timeout: 30_000 });
    const comments = dialog
      .getByLabel(/Comments/i)
      .or(dialog.locator('textarea'))
      .filter({ visible: true })
      .first();
    await comments.fill('UAL Approved');
    await dialog.getByRole('button', { name: 'Approve', exact: true }).last().click();
    await expect(dialog).toBeHidden({ timeout: 60_000 });
    await waitForSpinners(this.page);

    // Grid row "UAL Approver" must show Status "Approved" (reload once if needed).
    const stepRow = () =>
      this.page
        .locator('tr')
        .filter({ hasText: 'UAL Approver' })
        .filter({ visible: true })
        .first();
    try {
      await expect(stepRow()).toContainText('Approved', { timeout: 30_000 });
    } catch {
      await this.page.reload();
      await waitForSpinners(this.page);
      await expect(stepRow()).toContainText('Approved', { timeout: 60_000 });
    }
  }
}
