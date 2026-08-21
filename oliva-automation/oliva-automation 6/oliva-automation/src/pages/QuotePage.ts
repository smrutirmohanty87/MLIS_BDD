import { expect, Locator, Page } from '@playwright/test';
import { RiskLocationData } from '../data/testdata';
import { openRecordTab, waitForSpinners } from '../utils/sf';

/**
 * Quote record page (standard Lightning record home — no iframes; plain page
 * locators pierce the LWC shadow DOM).
 *
 * Covers: record tab navigation, the Coverages tab (Risk Locations insurable
 * cards + Product Questions card), the "Add Risk Locations" modal, the
 * "Enter Premiums" header button and the "DUAL Share GWP" header read-back.
 */
export class QuotePage {
  constructor(private page: Page) {}

  /**
   * Innermost card-like container holding `text`. Card order on the
   * Coverages tab is NOT stable, so cards are always located by contained
   * text (insurable name / "Product Questions"), never by index.
   */
  private card(text: string): Locator {
    // VISIBLE filter is essential: closed OmniScript modals leave hidden
    // remnants (e.g. step-chart <li class="slds-progress__item"> items) whose
    // text matches product/insurable names, and `.last()` would grab those.
    return this.page
      .locator('article, li, .slds-card, .slds-box')
      .filter({ hasText: text })
      .filter({ visible: true })
      .last();
  }

  /** The green "+ Add" control on a coverage row (button, link or titled icon). */
  private addControl(scope: Locator | Page): Locator {
    return scope
      .getByRole('button', { name: 'Add', exact: true })
      .or(scope.getByRole('link', { name: 'Add', exact: true }))
      .or(scope.locator('[title="Add"]'));
  }

  /** Click the card's "Show Coverages" toggle link if it is still collapsed. */
  private async expandCoverages(card: Locator): Promise<void> {
    await expect(card).toBeVisible({ timeout: 30_000 });
    
    // Check if card is already expanded by looking for the toggle button and its aria-expanded state
    let show = card.getByText('Show Coverages', { exact: true }).first();
    const isShowVisible = await show.isVisible({ timeout: 5000 }).catch(() => false);
    
    if (isShowVisible) {
      // Check if toggle is collapsed
      const isExpanded = (await show.getAttribute('aria-expanded').catch(() => null)) === 'true';
      if (isExpanded) {
        console.log('[QuotePage] expandCoverages: toggle already expanded (aria-expanded=true)');
        return;
      }
      // Toggle is collapsed - click it
      console.log('[QuotePage] expandCoverages: clicking card-scoped Show Coverages');
      try {
        await show.click({ timeout: 15_000 });
      } catch {
        await waitForSpinners(this.page);
        await this.page.waitForTimeout(2000);
        try {
          await show.click({ timeout: 10_000 });
        } catch {
          console.log('[QuotePage] "Show Coverages" overlay-blocked — force-clicking');
          await show.click({ force: true });
        }
      }
      await waitForSpinners(this.page);
      return;
    }
    
    // Show toggle not in card scope - expand all page-wide toggles that are collapsed
    const allToggles = this.page
      .getByText('Show Coverages', { exact: true })
      .filter({ visible: true });
    const n = await allToggles.count();
    console.log(`[QuotePage] card-scoped toggle missing — found ${n} page-wide toggle(s)`);
    
    for (let i = 0; i < n; i++) {
      const toggle = this.page
        .getByText('Show Coverages', { exact: true })
        .filter({ visible: true })
        .nth(i);
      const isExpanded = (await toggle.getAttribute('aria-expanded').catch(() => null)) === 'true';
      if (!isExpanded) {
        console.log(`[QuotePage] Expanding page-wide toggle ${i + 1}/${n}`);
        await toggle.click().catch(() => {});
        await waitForSpinners(this.page);
      }
    }
  }

  /**
   * Within `card`, click "Add" on the row containing `coverageName`, then
   * wait for the coverage modal (heading with the coverage title) to open.
   */
  private async addCoverageRow(card: Locator, coverageName: string): Promise<void> {
    await expect(card).toBeVisible({ timeout: 30_000 });
    const row = card
      .locator('tr, li, div')
      .filter({ hasText: coverageName })
      .filter({ has: this.addControl(this.page) })
      .last();
    // A just-closed coverage modal can leave a stale INVISIBLE
    // `.slds-modal__container` in the DOM that still intercepts pointer events
    // (observed live). Normal click first; force-click through the dead overlay
    // as fallback (the Add button itself is visible and enabled).
    const add = this.addControl(row).first();
    try {
      await add.click({ timeout: 15_000 });
    } catch {
      await waitForSpinners(this.page);
      console.log(`[QuotePage] Add "${coverageName}" overlay-blocked — force-clicking`);
      await add.click({ force: true });
    }
    // The coverage form opens in a role="dialog" (title varies: "Asset
    // Protection" vs "Coverage Questions"), so wait on the dialog + its
    // Territorial Limits field / Save|Next button rather than a per-coverage title.
    const dialog = this.page.getByRole('dialog').filter({ hasText: 'Territorial Limits' }).first();
    await expect(dialog).toBeVisible({ timeout: 30_000 });
    await waitForSpinners(this.page);
  }

  /**
   * Open a record-home tab (Coverages, Details, Clauses, Select Binders...)
   * by role=tab, falling back to the "More" overflow menu.
   */
  async openTab(tabName: string): Promise<void> {
    await openRecordTab(this.page, tabName);
  }

  /**
   * On the Coverages tab, expand the Risk Locations card whose title contains
   * `insurableName` by clicking its "Show Coverages" link (no-op if already
   * expanded — the link toggles).
   */
  async showInsurableCoverages(insurableName: string): Promise<void> {
    await this.expandCoverages(this.card(insurableName));
  }

  /**
   * Within the insurable card containing `insurableName`, click "Add" on the
   * coverage row containing `coverageName` (e.g. "Asset Protection - Property
   * Damage (Optional)") and wait for the coverage modal heading.
   */
  async addInsurableCoverage(insurableName: string, coverageName: string): Promise<void> {
    await this.addCoverageRow(this.card(insurableName), coverageName);
  }

  /** Expand the Product Questions card via its "Show Coverages" link. */
  async showProductCoverages(): Promise<void> {
    await this.expandCoverages(this.card('Product Questions'));
  }

  /**
   * Within the Product Questions card, click "Add" on the row containing
   * `coverageName` (e.g. "Group Personal Accident (Optional)") and wait for
   * the coverage modal heading.
   */
  async addProductCoverage(coverageName: string): Promise<void> {
    await this.addCoverageRow(this.card('Product Questions'), coverageName);
  }

  /**
   * Add a risk location via the "Add Risk Locations" link:
   * fills Insurable Name, drives the Google Places "Risk Address Search"
   * autocomplete (type, settle ~3s, click suggestion — auto-fills Address
   * Line/Postcode/Country/lat/long), overrides City and County/State,
   * Next -> "Care Specific Questions" (all optional) -> Save, then waits for
   * the modal to close and the new "<name> - <Country>" card to appear.
   */
  async addRiskLocation(d: RiskLocationData): Promise<void> {
    // "Add Risk Locations" renders as a clickable generic (div), not a
    // link/button — target it by text.
    const addLink = this.page
      .getByRole('link', { name: 'Add Risk Locations' })
      .or(this.page.getByRole('button', { name: 'Add Risk Locations' }))
      .or(this.page.getByText('Add Risk Locations', { exact: true }))
      .first();
    await expect(addLink).toBeVisible({ timeout: 30_000 });
    await addLink.click();
    const modalHeading = this.page
      .getByRole('heading', { name: 'Risk Location/Insurable' })
      .first();
    await expect(modalHeading).toBeVisible({ timeout: 30_000 });

    // Match the visible modal input (avoid the hidden OmniScript template copy).
    await this.page
      .getByLabel('Insurable Name')
      .filter({ visible: true })
      .first()
      .fill(d.insurableName);

    // Fill the address fields directly. The "Risk Address Search" is a Google
    // Places autocomplete whose predictions are unreliable to select under
    // automation (Google fetches on real keystrokes and renders in a portal),
    // so we populate the underlying fields with values captured from the app.
    const fillField = async (nameRx: RegExp, value: string): Promise<void> => {
      const input = this.page.getByLabel(nameRx).filter({ visible: true }).first();
      await expect(input).toBeVisible({ timeout: 15_000 });
      await input.click({ clickCount: 3 });
      await input.fill(value);
    };
    await fillField(/^\*?\s*Address Line\s*$/, d.addressLine);
    await fillField(/^\*?\s*City\s*$/, d.city);
    await fillField(/^\*?\s*County\/State\s*$/, d.countyState);
    await fillField(/^\*?\s*Postcode\s*$/, d.postcode);
    await fillField(/^\*?\s*Country\s*$/, d.country);
    await fillField(/^\*?\s*Latitude\s*$/, d.latitude).catch(() => {});
    await fillField(/^\*?\s*Longitude\s*$/, d.longitude).catch(() => {});

    await this.page.getByRole('button', { name: 'Next', exact: true }).last().click();
    // Step 2 "Care Specific Questions" (all optional): wait for its heading,
    // then Save replaces Next.
    await expect(
      this.page.getByRole('heading', { name: 'Care Specific Questions' }).first()
    ).toBeVisible({ timeout: 30_000 });
    const save = this.page.getByRole('button', { name: 'Save', exact: true }).last();
    await expect(save).toBeVisible({ timeout: 15_000 });
    await save.click();

    await expect(modalHeading).toBeHidden({ timeout: 20_000 });
    await expect(this.page.getByText(`${d.insurableName} - `).first()).toBeVisible({
      timeout: 15_000,
    });
    await waitForSpinners(this.page);
  }

  /**
   * Click the "Enter Premiums" header button and wait for the Edit Premiums
   * OmniScript subtab (heading "Enter Premiums") to render (up to 90s).
   */
  async clickEnterPremiums(): Promise<void> {
    await this.page.getByRole('button', { name: 'Enter Premiums' }).first().click();
    await expect(
      this.page.getByRole('heading', { name: 'Enter Premiums' }).first()
    ).toBeVisible({ timeout: 90_000 });
    await waitForSpinners(this.page);
  }

  /**
   * Construction Renovation: on the Coverages tab, open the product-level
   * "Renovation" questionnaire via the Product Questions card's "Edit" control.
   * Waits for the OmniScript's first step ("Oliva Standard Questions"). The
   * caller then drives it with OmniScriptFormPage.fill(RENO_PRODUCT_FORM).
   */
  async editRenovationProductQuestions(productText = 'Renovation'): Promise<void> {
    const card = this.page
      .locator('article, li, .slds-card, .slds-box')
      .filter({ hasText: productText })
      .filter({ has: this.page.getByText('Edit', { exact: true }) })
      .last();
    const edit = card
      .getByRole('button', { name: 'Edit' })
      .or(card.getByText('Edit', { exact: true }))
      .filter({ visible: true })
      .first();
    await expect(edit).toBeVisible({ timeout: 30_000 });
    await edit.click();
    await expect(
      this.page
        .getByText('Oliva Standard Questions', { exact: false })
        .filter({ visible: true })
        .first()
    ).toBeVisible({ timeout: 90_000 });
    await waitForSpinners(this.page);
  }

  /**
   * Construction Renovation: expand the insurable card and click "Add" on the
   * coverage row `coverageName`, opening its "Coverage Questions" OmniScript.
   * Waits for the form's read-only "Territorial Limits" (present on every Reno
   * coverage form) so the caller can drive it with OmniScriptFormPage.fill().
   */
  async addRenoCoverage(insurableName: string, coverageName: string): Promise<void> {
    await this.showInsurableCoverages(insurableName);
    
    const rowText = coverageName;
    
    // Try to find coverage row with extended wait - sometimes toggles disappear
    // after multiple coverages are added, but rows become visible without needing
    // to click the toggle (they may be auto-expanded or scrollable).
    for (let attempt = 0; attempt < 15; attempt++) {
      const covText = this.page
        .getByText(rowText, { exact: false })
        .filter({ visible: true });
      const count = await covText.count();
      
      if (count > 0) {
        console.log(`[QuotePage] Coverage "${coverageName}" text found on page (attempt ${attempt + 1})`);
        break;
      }
      
      // If toggle exists, try clicking it
      if (attempt % 3 === 2) {
        const toggle = this.page
          .getByText('Show Coverages', { exact: true })
          .filter({ visible: true })
          .first();
        const toggleExists = await toggle.isVisible({ timeout: 2000 }).catch(() => false);
        if (toggleExists) {
          const isExpanded = (await toggle.getAttribute('aria-expanded').catch(() => null)) === 'true';
          if (!isExpanded) {
            console.log(`[QuotePage] Clicking "Show Coverages" toggle (attempt ${attempt + 1})`);
            await toggle.click().catch(() => {});
            await waitForSpinners(this.page);
          }
        }
      }
      
      if (attempt < 14) {
        console.log(`[QuotePage] Waiting for coverage "${coverageName}" to appear (attempt ${attempt + 1}/15)`);
        await this.page.waitForTimeout(500);
      }
    }
    
    // Try to scroll the card into view if row is still not found
    const covText = this.page
      .getByText(rowText, { exact: false })
      .filter({ visible: true });
    const count = await covText.count();
    
    if (count === 0) {
      console.log(`[QuotePage] Coverage "${coverageName}" still not visible, scrolling card...`);
      const card = this.card(insurableName);
      await card.scrollIntoViewIfNeeded().catch(() => {});
      await this.page.waitForTimeout(1000);
    }
    
    // Now find and click the Add button
    const targetRow = this.page
      .locator('div.slds-grid.slds-wrap')
      .filter({ hasText: rowText })
      .filter({ visible: true })
      .last();
    
    await expect(targetRow).toBeVisible({ timeout: 30_000 });
    
    const addBtn = targetRow
      .getByRole('button', { name: 'Add', exact: true })
      .first();
    
    // Click with retry logic for overlay blocks
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await addBtn.click({ timeout: 15_000 });
        console.log(`[QuotePage] Clicked Add for "${coverageName}"`);
        break;
      } catch (err) {
        if (attempt === 2) throw err;
        console.log(`[QuotePage] Add button overlay-blocked (attempt ${attempt + 1}) — retrying`);
        await waitForSpinners(this.page);
        await this.page.waitForTimeout(1000);
      }
    }
    
    await waitForSpinners(this.page);
    
    // Wait for coverage modal to open
    await expect(
      this.page
        .getByText('Territorial Limits', { exact: false })
        .filter({ visible: true })
        .first()
    ).toBeVisible({ timeout: 90_000 });
    await waitForSpinners(this.page);
  }

  /**
   * Read the "DUAL Share GWP" value from the quote record highlights header.
   * @returns the displayed value text (e.g. "£28,135.61").
   */
  async dualShareGwp(): Promise<string> {
    const item = this.page
      .locator(
        'records-highlights-details-item, force-highlights-details-item, ' +
          '.slds-page-header__detail-block, .slds-page-header__detail-row li'
      )
      .filter({ hasText: 'DUAL Share GWP' })
      .last();
    await expect(item).toBeVisible({ timeout: 30_000 });
    const lines = (await item.innerText())
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean)
      .filter((l) => !/dual share gwp/i.test(l));
    const value = lines.pop() ?? '';
    if (!value) {
      throw new Error('DUAL Share GWP header item found but no value text present');
    }
    return value;
  }
}
