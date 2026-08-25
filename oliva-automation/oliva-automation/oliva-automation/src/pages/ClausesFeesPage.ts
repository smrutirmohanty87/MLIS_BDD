import { Page, expect } from '@playwright/test';
import { FEE } from '../data/testdata';
import { sfQueryOne } from '../auth/sfJwt';
import { openRecordTab, waitForSpinners } from '../utils/sf';

/** FEE shape + optional conditional fields some sub-types require. */
type FeeData = typeof FEE & { dnaPaymentAmount?: string };

/**
 * Clauses tab ("Predefined Binder Clauses" grid) and the "Add Fee"
 * OmniScript subtab (`Du/AddFee`, target `duAddFeeEnglish`).
 * No iframes — plain page locators pierce the LWC shadow DOM.
 */
export class ClausesFeesPage {
  /**
   * @param fee fee to add — defaults to the Care DUAL fee; the Construction
   *   Renovation flow injects RENO_FEE (Third Party / Survey Fee) here.
   */
  constructor(private page: Page, private fee: FeeData = FEE) {}

  /**
   * Tick and save every pending predefined binder clause.
   * Saved clauses disappear from the grid, and several batches can be
   * pending, so loop (max 5 iterations) until no row checkbox remains.
   */
  async savePredefinedClauses(): Promise<void> {
    await openRecordTab(this.page, 'Clauses');
    await expect(
      this.page.getByText('Predefined Binder Clauses').first()
    ).toBeVisible({ timeout: 60_000 });

    for (let iteration = 1; iteration <= 5; iteration++) {
      await waitForSpinners(this.page);

      // Row checkboxes live in body cells (header holds the select-all box).
      const rowChecks = this.page
        .locator('td input[type="checkbox"], tbody tr input[type="checkbox"]')
        .filter({ visible: true });
      const count = await rowChecks.count();
      if (count === 0) {
        console.log(`[ClausesFeesPage] no pending clause rows (iteration ${iteration})`);
        break;
      }
      console.log(`[ClausesFeesPage] iteration ${iteration}: ticking ${count} clause row(s)`);

      for (let i = 0; i < count; i++) {
        const checkbox = rowChecks.nth(i);
        if (!(await checkbox.isChecked().catch(() => false))) {
          await checkbox.check({ force: true }).catch(async () => {
            await checkbox.locator('xpath=..').click();
          });
        }
      }

      const save = this.page
        .getByRole('button', { name: 'Save Predefined Binder Clauses' })
        .first();
      await save.scrollIntoViewIfNeeded();
      await save.click();
      await waitForSpinners(this.page);
      // Documented settle: grid re-renders after save (~5s incl. spinner wait).
      await this.page.waitForTimeout(3000);
    }
  }

  /**
   * Add the DUAL fee via the "Add Fee" header button (OmniScript subtab).
   * "Fee Charged" is re-located by label AFTER the GWP "Yes" pick because the
   * layout shifts (verified). Ends when the quote record is back (Coverages
   * tab visible).
   */
  /** @param verifyUser JWT username for REST verification that the fee record
   *  actually persisted (the OmniScript swallows validation failures silently —
   *  live-diagnosed 22/07/2026: quotes ended up with 0–2 of 3 fees and no
   *  error anywhere). When provided, addFee becomes IDEMPOTENT (skips if the
   *  sub-type already exists on the quote) and retries a failed save once. */
  async addFee(quoteId?: string, verifyUser?: string): Promise<void> {
    if (quoteId) {
      const feeExists = async (): Promise<boolean> => {
        if (!verifyUser) return false;
        const rec = await sfQueryOne(
          verifyUser,
          `SELECT Id FROM Fee__c WHERE Quote__c = '${quoteId}' ` +
            `AND Sub_Type__c = '${this.fee.subType}' LIMIT 1`
        );
        return !!rec?.Id;
      };

      if (verifyUser && (await feeExists())) {
        console.log(`[ClausesFeesPage] fee "${this.fee.subType}" already on quote — skipping`);
        return;
      }

      // Fill the "Du/AddFee" OmniScript on a FRESH page in the same (already
      // authenticated) browser context. Two problems make the in-console paths
      // fail for Reno: (1) as a header-button SUBTAB, Reno's dependent Sub Type
      // triggers an async re-render and the console flips focus to a sibling
      // primary tab (a stale Account), tearing the form out; (2) page.goto to the
      // standalone cmp URL inside the already-loaded console SPA gets intercepted
      // and the fee cmp never becomes the active content. A brand-new page loads
      // the standalone OmniScript cleanly (verified) — no subtab, no SPA
      // interception, nothing to lose focus to.
      const fillOnFreshPage = async (): Promise<void> => {
        const feePage = await this.page.context().newPage();
        try {
          await feePage.goto(
            `/lightning/cmp/vlocity_ins__vlocityLWCOmniWrapper` +
              `?c__target=c%3AduAddFeeEnglish&c__ContextId=${quoteId}&c__layout=lightning`
          );
          await waitForSpinners(feePage);
          await this.isolateFeeTab(feePage);
          await this.fillFeeForm(feePage);
        } finally {
          await feePage.close();
        }
      };

      await fillOnFreshPage();
      if (verifyUser && !(await feeExists())) {
        console.log(
          `[ClausesFeesPage] fee "${this.fee.subType}" did NOT persist — retrying once`
        );
        await fillOnFreshPage();
        if (!(await feeExists())) {
          throw new Error(
            `Fee "${this.fee.type} / ${this.fee.subType}" did not persist on quote ` +
              `${quoteId} after 2 attempts (OmniScript swallows validation errors — ` +
              `check required conditional fields for this sub-type)`
          );
        }
      }
      // Back on the quote record for the subsequent steps.
      await this.page.goto(`/lightning/r/Quote/${quoteId}/view`);
      await waitForSpinners(this.page);
    } else {
      // Care path — header button opens the OmniScript as a console subtab.
      await this.page
        .getByRole('button', { name: 'Add Fee', exact: true })
        .filter({ visible: true })
        .first()
        .click();
      await waitForSpinners(this.page);
      await this.fillFeeForm(this.page);
    }

    await expect(
      this.page
        .getByRole('tab', { name: 'Coverages', exact: true })
        .filter({ visible: true })
        .last()
    ).toBeVisible({ timeout: 60_000 });
    await waitForSpinners(this.page);
  }

  /**
   * The console (newprodqa2) restores this user's stale sibling PRIMARY tabs
   * (e.g. a leftover DUALGROUPTEST.COM Account) even on a fresh page and makes
   * one ACTIVE, hiding the fee form in a background "c:duAddFeeEnglish" tab. The
   * fee tab has a UNIQUE title, so close every OTHER workspace tab, then activate
   * it — isolating the fee form so nothing can steal focus during a re-render.
   */
  private async isolateFeeTab(page: Page): Promise<void> {
    await page.waitForTimeout(3000); // let the console finish restoring tabs
    for (let i = 0; i < 30; i++) {
      // Close buttons named "Close <title>" — but NOT the fee tab's.
      const closeBtn = page
        .getByRole('button', { name: /^Close (?!c:duAddFeeEnglish)/ })
        .filter({ visible: true })
        .first();
      if (!(await closeBtn.isVisible({ timeout: 1000 }).catch(() => false))) break;
      await closeBtn.click().catch(() => {});
      const discard = page
        .getByRole('button', { name: /Don.?t Save|Discard|Leave/i })
        .filter({ visible: true })
        .first();
      if (await discard.isVisible({ timeout: 800 }).catch(() => false)) {
        await discard.click().catch(() => {});
      }
      await page.waitForTimeout(400);
    }
    await this.focusFeeTab(page);
  }

  /**
   * Re-activate the fee tab if the console has stolen focus (it asynchronously
   * re-restores a stale primary Account tab every few seconds). Called before
   * every field interaction so the form is foreground each time we touch it.
   */
  private async focusFeeTab(page: Page): Promise<void> {
    const feeTab = page
      .getByRole('tab', { name: 'c:duAddFeeEnglish' })
      .filter({ visible: true })
      .last();
    if (!(await feeTab.isVisible({ timeout: 1000 }).catch(() => false))) return;
    if ((await feeTab.getAttribute('aria-selected').catch(() => null)) === 'true') return;
    // Close the intruding tab(s) first, then activate the fee tab.
    const intruder = page
      .getByRole('button', { name: /^Close (?!c:duAddFeeEnglish)/ })
      .filter({ visible: true })
      .first();
    if (await intruder.isVisible({ timeout: 500 }).catch(() => false)) {
      await intruder.click().catch(() => {});
      await page.waitForTimeout(300);
    }
    await feeTab.click().catch(() => {});
    await page.waitForTimeout(400);
  }

  /** Fill the Add Fee OmniScript (Type → Sub Type → payer/admin → GWP → amount
   *  → description) and Save, on whichever `page` hosts the form. */
  private async fillFeeForm(page: Page): Promise<void> {
    // OmniScript form ready when the "Type" combobox is on screen.
    await expect(this.omniCombobox('Type', page)).toBeVisible({ timeout: 60_000 });

    await this.pickOmniCombobox('Type', this.fee.type, page);
    // Sub Type is a required dependent picklist. It auto-fills readonly for some
    // types (Care "DUAL Fee" → "DUAL Policy/Admin Fee") but NOT others
    // ("Third Party Fee" → must pick "Survey Fee"). Set it only when it isn't
    // already the target value and the control is actually settable.
    await this.pickSubTypeIfSettable(this.fee.subType, page);
    await this.pickOmniCombobox('Fee Payable by', this.fee.payableBy, page);
    await this.pickOmniCombobox('Fee Administered by', this.fee.administeredBy, page);

    // DIAGNOSTIC — capture the real fee-form state before the field that fails.
    if (process.env.FEE_DIAG === '1') {
      await page.screenshot({ path: 'test-results/fee-diag.png', fullPage: true }).catch(() => {});
      const dump = await page.evaluate(() => {
        const out: unknown[] = [];
        const walk = (root: Document | ShadowRoot) => {
          root.querySelectorAll('label').forEach((l) => {
            if (/Gross Written/i.test(l.textContent || '')) {
              const forId = l.getAttribute('for');
              let inp: Element | null = null;
              if (forId) {
                try { inp = (root as ShadowRoot).querySelector?.(`#${CSS.escape(forId)}`) ?? null; } catch { /* */ }
              }
              const rec: Record<string, unknown> = { label: (l.textContent || '').trim(), for: forId, found: !!inp };
              if (inp) {
                const r = (inp as HTMLElement).getBoundingClientRect();
                const st = getComputedStyle(inp as HTMLElement);
                rec.role = inp.getAttribute('role');
                rec.display = st.display;
                rec.visibility = st.visibility;
                rec.w = Math.round(r.width);
                rec.h = Math.round(r.height);
                rec.offsetParent = !!(inp as HTMLElement).offsetParent;
              }
              out.push(rec);
            }
          });
          root.querySelectorAll('*').forEach((e) => {
            if ((e as HTMLElement).shadowRoot) walk((e as HTMLElement).shadowRoot!);
          });
        };
        walk(document);
        return out;
      });
      console.log('[fee-diag] GWP: ' + JSON.stringify(dump));
    }

    await this.pickOmniCombobox(
      'Fee Charged Included in Gross Written Premium?',
      this.fee.includedInGwp,
      page
    );

    // Layout shifts after the GWP pick — RE-LOCATE "Fee Charged" by label.
    // Constrain to the actual input (an info-tooltip button can share the name).
    const editable = page.locator('input, textarea');
    // Required field → accessible name may be "*Fee Charged"; match either,
    // anchored so it can't hit "Fee Charged Included in Gross Written Premium?".
    await this.focusFeeTab(page);
    const feeCharged = page.getByLabel(/^\*?\s*Fee Charged\s*$/).and(editable).first();
    await expect(feeCharged).toBeVisible({ timeout: 30_000 });
    await feeCharged.click();
    await feeCharged.fill(this.fee.charged);

    await this.focusFeeTab(page);
    const description = page.getByLabel('Fee Description', { exact: false }).and(editable).first();
    await description.click();
    await description.fill(this.fee.description);

    // Conditional REQUIRED field for the "DUAL DNA+ Fee" sub-type: the form
    // labels it "Fee Cost" (validation "*Fee Cost Error: Fee Cost is
    // required." — live-caught 22/07/2026) and it lands in
    // Fee__c.DNA_Payment_Amount__c (successful org records all carry 50).
    // Without it the Save silently fails and no Fee__c record is created.
    if (this.fee.dnaPaymentAmount) {
      await this.focusFeeTab(page);
      const dnaField = page
        .getByLabel(/^\*?\s*Fee Cost\s*$/)
        .or(page.getByLabel(/DNA\+? Payment/i))
        .and(editable)
        .first();
      if (await dnaField.isVisible({ timeout: 8000 }).catch(() => false)) {
        await dnaField.click();
        await dnaField.fill(this.fee.dnaPaymentAmount);
        console.log(`[ClausesFeesPage] Fee Cost (DNA+) = ${this.fee.dnaPaymentAmount}`);
      } else {
        console.log('[ClausesFeesPage] Fee Cost (DNA+) field not visible — proceeding without it');
      }
    }

    // AUDIT before saving: OmniScript re-renders (dependent Sub Type, GWP
    // layout shift) can silently REVERT an already-picked combobox — live on
    // JCT the "Fee Administered by" pick never stuck ("*Fee Administered by
    // Error: … is required" after Save, twice). Verify every combo holds its
    // value and re-pick any that reverted.
    const comboAudit: Array<[string, string]> = [
      ['Type', this.fee.type],
      ['Fee Payable by', this.fee.payableBy],
      ['Fee Administered by', this.fee.administeredBy],
      ['Fee Charged Included in Gross Written Premium?', this.fee.includedInGwp],
    ];
    for (const [label, expected] of comboAudit) {
      for (let attempt = 0; attempt < 2; attempt++) {
        await this.focusFeeTab(page);
        const combo = await this.resolveCombo(label, page);
        const current = ((await combo.inputValue().catch(() => '')) ?? '').trim();
        if (current === expected) break;
        console.log(
          `[ClausesFeesPage] combo "${label}" holds "${current}" (want "${expected}") — re-picking`
        );
        await this.pickOmniCombobox(label, expected, page);
      }
    }

    await this.focusFeeTab(page);
    await page.getByRole('button', { name: 'Save and Exit' }).first().click();
    await waitForSpinners(page);

    // The OmniScript stays open on validation failure with the button still
    // enabled. Give it a moment and log any visible error text — persistence
    // itself is REST-verified by addFee when a verifyUser is provided.
    await page.waitForTimeout(2000);
    const errorText = await page
      .locator('.slds-has-error, [role="alert"], .vlocity-error, .omniscript-error')
      .filter({ visible: true })
      .allInnerTexts()
      .catch(() => [] as string[]);
    const clean = (errorText || []).map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
    if (clean.length) {
      console.log(`[ClausesFeesPage] post-save validation text: ${JSON.stringify(clean)}`);
    }
  }

  /**
   * Set "Sub Type" to `option` only if needed: skip when it already holds the
   * value (auto-filled readonly, e.g. Care) or when the control won't open an
   * options list (readonly). Picks the option when it IS a live dependent
   * picklist (e.g. Third Party Fee → Survey Fee).
   */
  private async pickSubTypeIfSettable(option: string, page: Page = this.page): Promise<void> {
    await this.focusFeeTab(page);
    const combo = this.omniCombobox('Sub Type', page);
    if (!(await combo.isVisible({ timeout: 8000 }).catch(() => false))) return;
    const current = (await combo.inputValue().catch(() => '')) ?? '';
    if (current.trim() === option) return;
    await combo.click().catch(() => {});
    const opt = page
      .getByRole('option', { name: option })
      .or(
        page
          .locator('[role="listbox"] [role="option"], lightning-base-combobox-item')
          .filter({ hasText: option })
      )
      .filter({ visible: true })
      .first();
    if (await opt.isVisible({ timeout: 6000 }).catch(() => false)) {
      await opt.click();
      await waitForSpinners(page);
      // Sub Type is a DEPENDENT picklist: selecting it rebuilds the OmniScript
      // DOM. Let the re-render settle before the next action.
      await page.waitForTimeout(2000);
      await waitForSpinners(page);
    } else {
      // No options list appeared → readonly auto-fill; leave the value as-is.
      await page.keyboard.press('Escape').catch(() => {});
    }
  }

  /** Visible OmniScript combobox input for a label (accessible-name match). */
  private omniCombobox(label: string, page: Page = this.page) {
    return page
      .getByRole('combobox', { name: label })
      .or(page.getByLabel(label, { exact: true }))
      .filter({ visible: true })
      .first();
  }

  /**
   * Resolve a combobox, falling back to a label-substring match when the
   * accessible-name selector finds nothing. The "Fee Charged Included in Gross
   * Written Premium?" combobox carries no aria-label/name, so getByRole/exact
   * getByLabel miss it — but getByLabel with a substring resolves it via the
   * `<label for>` association (which pierces shadow DOM).
   */
  private async resolveCombo(label: string, page: Page) {
    await this.focusFeeTab(page);
    const primary = this.omniCombobox(label, page);
    if (await primary.isVisible({ timeout: 5000 }).catch(() => false)) return primary;
    return page.getByLabel(label, { exact: false }).filter({ visible: true }).first();
  }

  /**
   * Click an OmniScript c-combobox open and choose an option by text.
   *
   * The option click is SCOPED to the combobox's own listbox (aria-controls):
   * a page-wide option locator can hit an unrelated stray listbox — live on a
   * JCT fee page a hidden recent-records list (28 date-stamped rows) became
   * visible on combo click, the page-wide locator clicked a "DUAL"-texted row
   * in it, and the resulting record NAVIGATION tore the fee form down, which
   * is why "Fee Administered by" never held its value. Falls back to keyboard
   * entry when the scoped list never shows options.
   */
  private async pickOmniCombobox(label: string, option: string, page: Page = this.page): Promise<void> {
    const combo = await this.resolveCombo(label, page);
    // Wait for the control to be attached AND settled before clicking (the
    // OmniScript re-renders on dependent picklists).
    await combo.waitFor({ state: 'visible', timeout: 30_000 });
    await combo.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(400);

    const listId = await combo.getAttribute('aria-controls').catch(() => null);
    const scopedOptions = listId
      ? page.locator(
          `[id="${listId}"] [role="option"], [id="${listId}"] lightning-base-combobox-item`
        )
      : null;

    for (let attempt = 0; attempt < 2; attempt++) {
      await combo.click();
      if (scopedOptions) {
        const target = scopedOptions.filter({ hasText: option }).filter({ visible: true }).first();
        if (await target.isVisible({ timeout: 8000 }).catch(() => false)) {
          await target.click();
          await waitForSpinners(page);
          await page.waitForTimeout(800);
          return;
        }
        console.log(
          `[ClausesFeesPage] "${label}": own listbox (${listId}) showed no "${option}" option (attempt ${attempt + 1})`
        );
      } else {
        // No aria-controls (e.g. the unnamed GWP combobox) — page-wide match,
        // but ONLY inside a visible listbox, never bare page text.
        const target = page
          .locator('[role="listbox"] [role="option"], lightning-base-combobox-item')
          .filter({ hasText: option })
          .filter({ visible: true })
          .first();
        if (await target.isVisible({ timeout: 8000 }).catch(() => false)) {
          await target.click();
          await waitForSpinners(page);
          await page.waitForTimeout(800);
          return;
        }
      }
    }

    // Keyboard fallback: type the option and commit with Enter.
    console.log(`[ClausesFeesPage] "${label}": falling back to keyboard entry of "${option}"`);
    await combo.click();
    await combo.pressSequentially(option, { delay: 80 }).catch(() => {});
    await page.waitForTimeout(800);
    await page.keyboard.press('Enter').catch(() => {});
    await waitForSpinners(page);
    await page.waitForTimeout(800);
  }
}
