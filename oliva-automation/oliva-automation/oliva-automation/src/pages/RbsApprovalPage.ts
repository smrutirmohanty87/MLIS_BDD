import { Page, expect } from '@playwright/test';
import { waitForSpinners, openRecordTab } from '../utils/sf';

/**
 * Risk Binder Section (RBS) approval — opened from the Quote's
 * "Selected Binders" tab as a console workspace subtab
 * (object `Risk_Binder_Section__c`).
 */
export class RbsApprovalPage {
  constructor(private page: Page) {}

  /** Toast filtered by text (verified toast container classes). */
  private toast(text: string | RegExp) {
    return this.page
      .locator('.slds-notify, [data-key], .toastMessage')
      .filter({ hasText: text })
      .first();
  }

  /**
   * Click the VISIBLE record tab with this name. Several console subtabs can
   * each own a "Details" tab in the DOM, so `.first()` is unsafe here.
   */
  private async clickVisibleTab(name: string): Promise<void> {
    const tabs = this.page
      .getByRole('tab', { name, exact: true })
      .filter({ visible: true });
    await expect(tabs.last()).toBeVisible({ timeout: 60_000 });
    await tabs.last().click();
    await waitForSpinners(this.page);
  }

  /**
   * Approve the FIRST Risk Binder Section:
   * ensure "Confirm No Manual Reasons" is checked, tick "Carrier Selected"
   * via the right-hand related-record Edit modal (the inline grid save is
   * verified-flaky), set Approval Status = Approved, then close the subtab.
   */
  /** @param quoteId when provided, used to navigate straight back to the
   *  quote if the console loses it after the RBS subtab closes. */
  async approveFirstRbs(quoteId?: string): Promise<void> {
    await openRecordTab(this.page, 'Selected Binders');
    await expect(
      this.page.getByText('Risk Binder Sections').first()
    ).toBeVisible({ timeout: 60_000 });

    // Open the first RBS record (opens a workspace subtab).
    await this.page.getByRole('link', { name: /^RBS-/ }).first().click();
    await waitForSpinners(this.page);
    await expect(
      this.page.getByText('Risk Binder Section', { exact: false }).first()
    ).toBeVisible({ timeout: 60_000 });

    await this.confirmNoManualReasons();
    await this.tickCarrierSelected();
    await this.setApprovalStatusApproved();
    await this.closeRbsSubtab(quoteId);
  }

  /**
   * Approve EVERY Risk Binder Section on the quote (products like CARA create
   * one RBS per coverage across several binders). Collects the distinct
   * RBS-… names up front, then runs the proven single-RBS sequence per name —
   * reopening the "Selected Binders" tab between iterations because closing an
   * RBS subtab can bounce the console off the quote.
   */
  async approveAllRbs(quoteId?: string): Promise<void> {
    await openRecordTab(this.page, 'Selected Binders');
    await expect(
      this.page.getByText('Risk Binder Sections').first()
    ).toBeVisible({ timeout: 60_000 });

    const links = this.page.getByRole('link', { name: /^RBS-/ }).filter({ visible: true });
    await expect(links.first()).toBeVisible({ timeout: 60_000 });
    const names = Array.from(new Set(await links.allInnerTexts())).filter((n) =>
      /^RBS-/.test(n.trim())
    );
    console.log(`[RbsApprovalPage] approving ${names.length} RBS section(s): ${names.join(', ')}`);

    for (const name of names) {
      await openRecordTab(this.page, 'Selected Binders');
      const link = this.page
        .getByRole('link', { name: name.trim(), exact: true })
        .filter({ visible: true })
        .first();
      await expect(link).toBeVisible({ timeout: 60_000 });
      await link.click();
      await waitForSpinners(this.page);
      await expect(
        this.page.getByText('Risk Binder Section', { exact: false }).first()
      ).toBeVisible({ timeout: 60_000 });

      await this.confirmNoManualReasons();
      await this.tickCarrierSelected();
      await this.setApprovalStatusApproved();
      await this.closeRbsSubtab(quoteId);
    }
  }

  /** (a) Referral Reasons tab: ensure "Confirm No Manual Reasons" is checked. */
  private async confirmNoManualReasons(): Promise<void> {
    await this.clickVisibleTab('Referral Reasons');
    const checkbox = this.page
      .getByRole('checkbox', { name: /Confirm No Manual Reasons/i })
      .first();
    await expect(checkbox).toBeVisible({ timeout: 30_000 });

    if (!(await checkbox.isChecked().catch(() => false))) {
      await checkbox.check({ force: true }).catch(async () => {
        await this.page
          .getByText('Confirm No Manual Reasons', { exact: false })
          .first()
          .click();
      });
      // A Save may appear at the bottom of that grid — click it if visible.
      const gridSave = this.page
        .getByRole('button', { name: 'Save', exact: true })
        .filter({ visible: true })
        .first();
      if (await gridSave.isVisible().catch(() => false)) {
        await gridSave.scrollIntoViewIfNeeded();
        await gridSave.click();
        await waitForSpinners(this.page);
      }
    } else {
      console.log('[RbsApprovalPage] "Confirm No Manual Reasons" already checked');
    }
  }

  /**
   * (b) Tick "Carrier Selected" through the related panel
   * "Carrier Selection Details" → CB-… row dropdown → Edit modal
   * (NOT the inline "Carrier Selection Detail" grid — verified flaky).
   */
  private async tickCarrierSelected(): Promise<void> {
    const relatedCard = this.page
      .locator('article, .slds-card')
      .filter({ hasText: 'Carrier Selection Details' })
      .filter({ hasText: /CB-/ })
      .last();
    await relatedCard.scrollIntoViewIfNeeded().catch(() => {});
    await expect(relatedCard).toBeVisible({ timeout: 60_000 });

    // Record row dropdown ▾ inside the CB-… tile.
    const rowMenu = relatedCard
      .getByRole('button', { name: /show (more|actions)/i })
      .or(relatedCard.locator('lightning-button-menu button'))
      .filter({ visible: true })
      .last();
    await rowMenu.click();
    await this.page.getByRole('menuitem', { name: 'Edit' }).first().click();

    // Standard modal "Edit CB-…".
    const dialog = this.page
      .getByRole('dialog')
      .filter({ hasText: /Edit CB-/ })
      .first();
    await expect(dialog).toBeVisible({ timeout: 30_000 });

    const carrierSelected = dialog
      .getByRole('checkbox', { name: /Carrier Selected/i })
      .first();
    if (!(await carrierSelected.isChecked().catch(() => false))) {
      await carrierSelected.check({ force: true }).catch(async () => {
        await dialog.getByText('Carrier Selected', { exact: true }).first().click();
      });
    }
    await dialog.getByRole('button', { name: 'Save', exact: true }).first().click();
    await expect(this.toast(/was saved/)).toBeVisible({ timeout: 60_000 });
    await waitForSpinners(this.page);
  }

  /** (c) Details tab → inline edit "Approval Status" → Approved → Save. */
  private async setApprovalStatusApproved(): Promise<void> {
    await this.clickVisibleTab('Details');

    // "Approval Status" lives in the "Referral Information" section, whose body
    // is lazy-rendered — scroll that section into view first so the field (and
    // its inline-edit pencil) actually mount.
    const referralSection = this.page
      .getByRole('heading', { name: 'Referral Information' })
      .or(this.page.getByText('Referral Information', { exact: true }))
      .first();
    await referralSection.scrollIntoViewIfNeeded().catch(() => {});
    await this.page.mouse.wheel(0, 600);

    const statusItem = this.page
      .locator('records-record-layout-item, force-record-layout-item, .slds-form-element')
      .filter({ hasText: 'Approval Status' })
      .filter({ visible: true })
      .first();
    await expect(statusItem).toBeVisible({ timeout: 30_000 });
    await statusItem.scrollIntoViewIfNeeded().catch(() => {});
    await statusItem.hover().catch(() => {}); // reveal the inline-edit pencil

    const pencil = this.page
      .getByRole('button', { name: /Edit Approval Status/i })
      .or(statusItem.locator('button[title*="Edit"]'))
      .filter({ visible: true })
      .first();
    await expect(pencil).toBeVisible({ timeout: 15_000 });
    await pencil.click();

    // Picklist: --None-- / Approved / Rejected / Waiting for Approval.
    const picklist = this.page
      .getByRole('combobox', { name: /Approval Status/i })
      .filter({ visible: true })
      .first();
    await picklist.click();
    await this.page.getByRole('option', { name: 'Approved', exact: true }).first().click();

    // Footer Save of the inline record edit.
    const footerSave = this.page
      .locator('button[name="SaveEdit"]')
      .or(this.page.getByRole('button', { name: 'Save', exact: true }))
      .filter({ visible: true })
      .last();
    await footerSave.click();
    await waitForSpinners(this.page);

    // Wait until the field really shows "Approved" (Risk Approval Date auto-fills).
    await expect(
      this.page
        .locator('records-record-layout-item, force-record-layout-item, .slds-form-element')
        .filter({ hasText: 'Approval Status' })
        .filter({ visible: true })
        .first()
    ).toContainText('Approved', { timeout: 60_000 });
  }

  /**
   * (d) Close leftover subtabs (the RBS record AND the earlier "Edit Premiums"
   * form) so the Quote PRIMARY record — with its Coverages/Clauses tabs —
   * becomes the active view again. Closing an RBS subtab may raise a
   * "Save changes?" prompt (residual inline edit) which we persist.
   */
  private async closeRbsSubtab(quoteId?: string): Promise<void> {
    for (let i = 0; i < 6; i++) {
      const closeButton = this.page
        .getByRole('button', { name: /^Close (RBS-|Edit Premiums)/ })
        .filter({ visible: true })
        .first();
      if (!(await closeButton.isVisible().catch(() => false))) break;
      await closeButton.click();

      const saveDialog = this.page
        .getByRole('dialog', { name: /Save changes/i })
        .filter({ visible: true })
        .first();
      if (await saveDialog.isVisible().catch(() => false)) {
        await saveDialog.getByRole('button', { name: /^Save/ }).first().click();
      }
      await waitForSpinners(this.page);
    }

    // Confirm we are back on the Quote record (its tabs are available again).
    // "Clauses" is a top-level tab on the Care quote but sits under the "More ▾"
    // overflow on the Construction Renovation quote — so accept "Coverages"
    // (always top-level) as the equivalent "back on the Quote" signal.
    const quoteTabs = this.page
      .getByRole('tab', { name: 'Clauses', exact: true })
      .or(this.page.getByRole('tab', { name: 'Coverages', exact: true }))
      .filter({ visible: true })
      .last();
    // Self-heal: closing the RBS subtab can land the console somewhere without
    // the quote tabs (verified on Contractors Combined). With a quoteId,
    // navigate straight back instead of failing.
    if (!(await quoteTabs.isVisible({ timeout: 20_000 }).catch(() => false)) && quoteId) {
      console.log('[RbsApprovalPage] quote tabs lost after subtab close — navigating back');
      await this.page.goto(`/lightning/r/Quote/${quoteId}/view`);
      await waitForSpinners(this.page);
    }
    await expect(quoteTabs).toBeVisible({ timeout: 60_000 });
  }
}
