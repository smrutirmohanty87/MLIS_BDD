import { Page, expect } from '@playwright/test';
import { BINDER } from '../data/testdata';
import { openRecordTab, waitForSpinners } from '../utils/sf';

/** Per-coverage binder choice for products whose rows need DIFFERENT binders
 *  (e.g. CARA: Accelerant for works/plant rows, ARAG for Legal Expenses).
 *  `coverage` is a substring of the risk-grid row text (prefix-safe — the
 *  grid truncates long names). */
export interface BinderChoice {
  coverage: string;
  name: string;
  section: string;
  nrToBinder: string;
}

/**
 * "Select Binders" tab on the Quote record (no iframes — plain locators
 * pierce the LWC shadow DOM).
 *
 * Verified grid model: one row per Risk Binder Coverage (Risk Name RBC-…),
 * each row carrying a "Select Binders" button and a red "Binders Status" flag.
 */
export class BindersPage {
  /**
   * @param binder binder to select — defaults to the Care (Aviva) binder; the
   *   Construction Renovation flow injects RENO_BINDER (Accelerant Oliva
   *   Construction / Renovation section) here.
   * @param perCoverage when provided, switches to STRICT per-coverage mode:
   *   each risk row is matched to its own binder by coverage text, the Add is
   *   clicked ONLY in the named binder's row (no first-Add fallback — on
   *   multi-binder rows that adds the wrong binder), any already-selected
   *   WRONG binder is removed first, and the N/R save retries until the
   *   success toast fires (all live-diagnosed on CARA, 22/07/2026).
   */
  constructor(
    private page: Page,
    private binder: { name: string; section: string; nrToBinder: string } = BINDER,
    private perCoverage?: BinderChoice[]
  ) {}

  /** Toast filtered by text (verified toast container classes). */
  private toast(text: string) {
    return this.page
      .locator('.slds-notify, [data-key], .toastMessage')
      .filter({ hasText: text })
      .first();
  }

  /**
   * Dismiss a blocking confirmation modal (e.g. the "Success! …removed
   * successfully" dialog) by clicking its OK/Close button. Non-fatal: if no
   * modal is present it returns immediately.
   */
  private async dismissModal(): Promise<void> {
    // Scoped to an actual dialog so a stray page-level "Done"/"Close" (guidance
    // popover, docked composer) can never be clicked by mistake.
    const ok = this.page
      .getByRole('dialog')
      .filter({ visible: true })
      .last()
      .getByRole('button', { name: /^(OK|Close|Done)$/i })
      .filter({ visible: true })
      .first();
    if (await ok.isVisible({ timeout: 2000 }).catch(() => false)) {
      await ok.click().catch(() => {});
      await waitForSpinners(this.page);
    }
  }

  /** Row-level "Select Binders" buttons on the risk grid. */
  private rowButtons() {
    return this.page
      .getByRole('button', { name: 'Select Binders', exact: true })
      .filter({ visible: true });
  }

  /**
   * For every RBC row on the "Select Binders" tab: open the binder view, Add
   * the available binder, set "N/R to Binder" = New Business via the inline
   * cell edit, Save, wait for the success toast and go Back. Finishes with a
   * page reload so the status flags refresh (green flags are logged only,
   * never hard-asserted).
   */
  async selectAllBinders(): Promise<void> {
    await openRecordTab(this.page, 'Select Binders');

    // Dismiss any leftover "Success!" toast/modal (e.g. from a prior binder
    // action) so its overlay doesn't intercept the risk-grid buttons.
    await this.dismissModal();

    // Wait for the risk grid; count rows first, then iterate that many times.
    await expect(this.rowButtons().first()).toBeVisible({ timeout: 60_000 });
    const total = await this.rowButtons().count();
    console.log(`[BindersPage] ${total} risk row(s) need binder selection`);

    // Per-coverage mode: capture each risk row's text UP FRONT so row i can be
    // matched to its own binder (the binder view itself does not restate the
    // coverage reliably).
    const rowTexts: string[] = [];
    if (this.perCoverage) {
      const gridRows = this.page
        .locator('tr, [role="row"]')
        .filter({ has: this.page.getByRole('button', { name: 'Select Binders', exact: true }) })
        .filter({ visible: true });
      const n = await gridRows.count();
      for (let i = 0; i < n; i++) {
        rowTexts.push(
          (((await gridRows.nth(i).innerText().catch(() => '')) || '') as string).replace(/\s+/g, ' ')
        );
      }
    }

    for (let i = 0; i < total; i++) {
      // The "Select Binders" button PERSISTS on every row after processing, so
      // target each DISTINCT row by index (using .first() would re-open row 0).
      const button = this.rowButtons().nth(i);
      await expect(button).toBeVisible({ timeout: 30_000 });
      await button.scrollIntoViewIfNeeded().catch(() => {});

      let choice: BinderChoice | undefined;
      if (this.perCoverage) {
        choice = this.perCoverage.find((b) => (rowTexts[i] ?? '').includes(b.coverage));
        if (!choice) {
          console.log(
            `[BindersPage] row ${i} has no configured binder (row: "${(rowTexts[i] ?? '').slice(0, 80)}") — leaving untouched`
          );
          continue;
        }
        console.log(`[BindersPage] row ${i} "${choice.coverage}" → binder "${choice.name}"`);
      }

      await button.click();
      await waitForSpinners(this.page);
      if (this.perCoverage && choice) {
        await this.reconcileBinderView(choice);
      } else {
        await this.processBinderView();
      }

      // Back on the risk grid.
      await this.page.getByRole('button', { name: 'Back', exact: true }).first().click();
      await waitForSpinners(this.page);
    }

    // Refresh so the "Binders Status" flags re-render. This is purely
    // informational (green-flag check), so it must never fail the run — the
    // binders are already saved above.
    try {
      await this.page.reload();
      await waitForSpinners(this.page);
      await openRecordTab(this.page, 'Select Binders');
      const remaining = await this.rowButtons().count().catch(() => 0);
      console.log(`[BindersPage] after reload: ${remaining} row button(s) still on the grid`);
    } catch (err) {
      console.log(`[BindersPage] post-save flag refresh skipped: ${(err as Error).message}`);
    }
  }

  /** Visible selected-binder rows (each carries a "Remove" button). */
  private selectedRows() {
    return this.page
      .locator('tr, [role="row"]')
      .filter({ has: this.page.getByRole('button', { name: 'Remove', exact: true }) })
      .filter({ visible: true });
  }

  /**
   * STRICT per-coverage binder view (ported from the CARA live-exploration
   * reconciler — idempotent, safe on resumed/polluted quotes):
   * (1) remove any selected binder that is NOT the intended one (a first-Add
   *     fallback or resumed run can leave a wrong/duplicate binder splitting
   *     the RBS allocation 50/50 — live-observed);
   * (2) Add the intended binder BY NAME only — never the first Add;
   * (3) set N/R to Binder on OUR row and Save, retrying until the success
   *     toast fires (a slow org eats the first Save click — live-observed).
   */
  private async reconcileBinderView(choice: BinderChoice): Promise<void> {
    await expect(
      this.page.getByText('Available Binders').first()
    ).toBeVisible({ timeout: 60_000 });
    // Let the tables paint before counting rows (an instant count races 0).
    await this.page
      .getByRole('button', { name: /^(Add|Remove)$/ })
      .filter({ visible: true })
      .first()
      .waitFor({ state: 'visible', timeout: 20_000 })
      .catch(() => {});

    // (1) Remove wrong selected binders.
    for (let guard = 0; guard < 4; guard++) {
      let wrongRow;
      const n = await this.selectedRows().count();
      for (let k = 0; k < n; k++) {
        const t = ((await this.selectedRows().nth(k).innerText().catch(() => '')) || '').replace(/\s+/g, ' ');
        if (t && !t.includes(choice.name)) {
          wrongRow = this.selectedRows().nth(k);
          console.log(`[BindersPage] removing WRONG selected binder: ${t.slice(0, 100)}`);
          break;
        }
      }
      if (!wrongRow) break;
      await wrongRow.getByRole('button', { name: 'Remove', exact: true }).first().click();
      await waitForSpinners(this.page);
      await this.dismissModal();
    }

    // (2) Add by name if not already selected.
    const ourSelected = () => this.selectedRows().filter({ hasText: choice.name });
    let addClicked = false;
    if (!(await ourSelected().first().isVisible().catch(() => false))) {
      const namedAdd = this.page
        .locator('tr, [role="row"]')
        .filter({ hasText: choice.name })
        .filter({ has: this.page.getByRole('button', { name: 'Add', exact: true }) })
        .first()
        .getByRole('button', { name: 'Add', exact: true })
        .first();
      try {
        await namedAdd.waitFor({ state: 'visible', timeout: 15_000 });
        await namedAdd.click();
        addClicked = true;
        await waitForSpinners(this.page);
      } catch {
        console.log(
          `[BindersPage] binder "${choice.name}" NOT offered and not selected — skipping row`
        );
        return;
      }
    } else {
      console.log(`[BindersPage] binder "${choice.name}" already selected`);
    }

    // (3) N/R to Binder on OUR row + retried Save.
    const selectedRow = ourSelected().last();
    if (addClicked) {
      await expect(selectedRow).toBeVisible({ timeout: 60_000 });
    }
    if (
      await selectedRow
        .getByText(choice.nrToBinder, { exact: false })
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      return; // N/R already set (re-opened row).
    }

    const pencil = selectedRow.locator('button[title*="Edit"]').last();
    await expect(pencil).toBeVisible({ timeout: 15_000 });
    await pencil.scrollIntoViewIfNeeded().catch(() => {});
    await pencil.click();

    const cellTrigger = this.page.getByText('Select N/R', { exact: false }).first();
    await expect(cellTrigger).toBeVisible({ timeout: 15_000 });
    await cellTrigger.click();
    await this.page
      .getByRole('option', { name: choice.nrToBinder })
      .or(
        this.page
          .locator('[role="listbox"] [role="option"], lightning-base-combobox-item')
          .filter({ hasText: choice.nrToBinder })
      )
      .first()
      .click();

    // The footer Save must be the VISIBLE one (a hidden Save from a residual
    // "Edit Premiums" subtab exists in the DOM); a slow org can eat the first
    // click, so retry until the toast fires or the footer disappears.
    const toast = this.toast('Selected Binders saved successfully');
    const save = this.page
      .getByRole('button', { name: 'Save', exact: true })
      .filter({ visible: true })
      .last();
    let saved = false;
    for (let attempt = 0; attempt < 3 && !saved; attempt++) {
      await save.scrollIntoViewIfNeeded().catch(() => {});
      await save.click().catch(() => {});
      saved = await toast.isVisible({ timeout: 20_000 }).catch(() => false);
      if (!saved) {
        saved = !(await save.isVisible().catch(() => false));
        if (saved) console.log('[BindersPage] footer gone without toast — treating as saved');
      }
    }
    if (!saved) {
      throw new Error(`Binder N/R save did not commit for "${choice.coverage}"`);
    }
    await waitForSpinners(this.page);
  }

  /** Binder view for one row: Add → inline "N/R to Binder" edit → Save. */
  private async processBinderView(): Promise<void> {
    // "Available Binders" section with the binder row and its Add button.
    await expect(
      this.page.getByText('Available Binders').first()
    ).toBeVisible({ timeout: 60_000 });

    // Add the binder. WAIT for the Add button (an instant isVisible() races
    // false before the Available table paints). It disappears once added; if it
    // never appears, the binder is already selected — proceed either way.
    // Some coverages offer SEVERAL available binders (verified: Contractors
    // Combined's PPL row lists four). Prefer the Add button in the row whose
    // text contains OUR binder's name; fall back to the first Add (Renovation/
    // CARP rows offer exactly one binder).
    const namedRowAdd = this.page
      .locator('tr, [role="row"]')
      .filter({ hasText: this.binder.name })
      .filter({ has: this.page.getByRole('button', { name: 'Add', exact: true }) })
      .first()
      .getByRole('button', { name: 'Add', exact: true })
      .first();
    const firstAdd = this.page.getByRole('button', { name: 'Add', exact: true }).first();
    let addClicked = false;
    try {
      await firstAdd.waitFor({ state: 'visible', timeout: 15_000 });
      const addBtn = (await namedRowAdd.isVisible().catch(() => false)) ? namedRowAdd : firstAdd;
      await addBtn.click();
      addClicked = true;
      await waitForSpinners(this.page);
    } catch {
      /* already under Selected Binders */
    }

    // The selected row (carries a "Remove" button) must exist before editing.
    // Identify the selected binder row by its Remove button — name-agnostic, so
    // it works regardless of which binder a coverage offers (Construction rows
    // vary) and for rows already added on a resumed quote. (Construction binder
    // grids use ARIA roles, not <tr>; match both.)
    const selectedRow = this.page
      .locator('tr, [role="row"]')
      .filter({ has: this.page.getByRole('button', { name: 'Remove', exact: true }) })
      .filter({ visible: true })
      .last();
    if (addClicked) {
      // We actually added a binder — the selected row MUST appear. Hard-assert
      // with a slow-org timeout so a laggy render can't silently skip a
      // required binder (which would fail much later with a misleading error).
      await expect(selectedRow).toBeVisible({ timeout: 60_000 });
    } else if (!(await selectedRow.isVisible({ timeout: 12_000 }).catch(() => false))) {
      // No Add button ever appeared AND nothing is selected: this coverage has
      // no bindable binder (verified on Construction — some rows show an empty
      // "Available Binders" grid). Skip the row rather than fail the run.
      console.log('[BindersPage] no bindable binder for this row — skipping');
      return;
    }

    // If N/R is already set (re-opened row), nothing more to do.
    if (
      await selectedRow
        .getByText(this.binder.nrToBinder, { exact: false })
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      return;
    }

    // The N/R cell's Edit pencil is the LAST edit control in the selected row.
    const pencil = selectedRow.locator('button[title*="Edit"]').last();
    await expect(pencil).toBeVisible({ timeout: 15_000 });
    await pencil.scrollIntoViewIfNeeded().catch(() => {});
    await pencil.click();

    // Cell enters edit mode showing "Select N/R" — click it to open options.
    const cellTrigger = this.page.getByText('Select N/R', { exact: false }).first();
    await expect(cellTrigger).toBeVisible({ timeout: 15_000 });
    await cellTrigger.click();

    // Dropdown options: New Business / Renewal.
    await this.page
      .getByRole('option', { name: this.binder.nrToBinder })
      .or(
        this.page
          .locator('[role="listbox"] [role="option"], lightning-base-combobox-item')
          .filter({ hasText: this.binder.nrToBinder })
      )
      .first()
      .click();

    // Footer Cancel/Save under the table — Save may sit at the very bottom
    // edge of the viewport (verified): scroll it into view before clicking.
    const save = this.page.getByRole('button', { name: 'Save', exact: true }).first();
    await save.scrollIntoViewIfNeeded();
    await save.click();

    await expect(this.toast('Selected Binders saved successfully')).toBeVisible({
      timeout: 60_000,
    });
    await waitForSpinners(this.page);
  }
}
