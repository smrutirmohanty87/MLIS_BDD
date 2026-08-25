import { expect, FrameLocator, Locator, Page } from '@playwright/test';

/**
 * A locator scope: the page itself, or a Visualforce/custom iframe inside a
 * console subtab. Oliva wizard screens (subtabs named "c:dualQ...") may render
 * inside an iframe; record home tabs render directly in the page.
 */
export type Scope = Page | FrameLocator;

/** Wait until no Lightning spinners are visible and network settles briefly. */
export async function waitForSpinners(page: Page): Promise<void> {
  const spinner = page.locator(
    'lightning-spinner, .slds-spinner_container:visible, .slds-spinner:visible'
  );
  await spinner.first().waitFor({ state: 'hidden', timeout: 60_000 }).catch(() => {});
  await page.waitForLoadState('domcontentloaded');
  await page.waitForTimeout(500);
}

/**
 * Resolve the scope of the currently active console workspace/sub tab.
 * Returns a FrameLocator if the active tab hosts an iframe (VF/custom Oliva
 * screens), otherwise the page itself.
 */
export async function activeScope(page: Page): Promise<Scope> {
  const iframe = page.locator(
    '.oneWorkspaceTabWrapper .active iframe, iframe[name^="vfFrameId"]:visible'
  );
  if ((await iframe.count()) > 0 && (await iframe.first().isVisible().catch(() => false))) {
    return page.frameLocator(
      '.oneWorkspaceTabWrapper .active iframe, iframe[name^="vfFrameId"]:visible'
    ).first();
  }
  return page;
}

/** Fill a plain (non-lookup) field located by its floating label text. */
export async function fillByLabel(scope: Scope, label: string, value: string): Promise<void> {
  const input = scope
    .locator('lightning-input, lightning-textarea, .slds-form-element')
    .filter({ hasText: label })
    .first()
    .locator('input, textarea')
    .first();
  await input.click();
  await input.fill(value);
}

/**
 * Fill a Salesforce lookup / search-enabled combobox by label, then choose
 * the option containing `optionText` (defaults to the typed text).
 */
export async function fillLookup(
  page: Page,
  scope: Scope,
  label: string,
  text: string,
  optionText?: string
): Promise<void> {
  const combo = scope
    .locator('lightning-grouped-combobox, lightning-lookup, .slds-form-element')
    .filter({ hasText: label })
    .first()
    .locator('input[role="combobox"], input')
    .first();
  await combo.click();
  await combo.fill(text);
  const option = page
    .locator('[role="listbox"] [role="option"], lightning-base-combobox-item')
    .filter({ hasText: optionText ?? text })
    .first();
  await option.waitFor({ state: 'visible', timeout: 30_000 });
  await option.click();
  await waitForSpinners(page);
}

/** Select a value in a lightning-combobox (button-style picklist) by label. */
export async function pickCombobox(
  page: Page,
  scope: Scope,
  label: string,
  option: string
): Promise<void> {
  const trigger = scope
    .locator('lightning-combobox, .slds-form-element')
    .filter({ hasText: label })
    .first()
    .locator('button[role="combobox"], input[role="combobox"], select')
    .first();
  const tag = await trigger.evaluate((el) => el.tagName.toLowerCase()).catch(() => 'button');
  if (tag === 'select') {
    await trigger.selectOption({ label: option });
    return;
  }
  await trigger.click();
  await page
    .locator('[role="listbox"] [role="option"], lightning-base-combobox-item')
    .filter({ hasText: option })
    .first()
    .click();
}

/**
 * Answer a Yes/No radio-group question found by (partial) question text.
 * Oliva coverage forms are dense radio questionnaires; the group container
 * varies (fieldset, lightning-radio-group, generic form element).
 */
export async function setRadio(
  scope: Scope,
  question: string,
  value: 'Yes' | 'No'
): Promise<void> {
  const group = scope
    .locator('lightning-radio-group, fieldset, .slds-form-element')
    .filter({ hasText: question })
    .first();
  const radio = group.getByRole('radio', { name: value, exact: true }).first();
  if (await radio.count()) {
    await radio.check({ force: true }).catch(async () => {
      await group.locator(`label:has-text("${value}")`).first().click();
    });
  } else {
    await group.locator(`label:has-text("${value}")`).first().click();
  }
}

/** Click a button by accessible name inside a scope and wait out spinners. */
export async function clickButton(page: Page, scope: Scope, name: string): Promise<void> {
  await scope.getByRole('button', { name, exact: false }).first().click();
  await waitForSpinners(page);
}

/** Close every open console workspace tab (fresh-session hygiene). */
export async function closeAllWorkspaceTabs(page: Page): Promise<void> {
  // Workspace/record tab close buttons carry an accessible name "Close <tab>"
  // (e.g. "Close Tab", "Close MARSHALL WOOLDRIDGE… | Account"). Click each in
  // turn; a residual inline edit can raise a save prompt which we discard.
  // Let the console tablist finish restoring remembered tabs before closing —
  // newprodqa2 reopens this user's saved workspace on navigation, and closing
  // too early misses tabs that paint a beat later.
  await page.waitForTimeout(1500);
  // Tolerate transient gaps: only stop after several CONSECUTIVE misses, so a
  // tab that renders slightly late (or the foreground tab whose close button
  // shifts after each close) still gets closed rather than ending the loop.
  let misses = 0;
  for (let i = 0; i < 40 && misses < 3; i++) {
    const closeBtn = page
      .getByRole('button', { name: /^Close / })
      .filter({ visible: true })
      .first();
    if (!(await closeBtn.isVisible().catch(() => false))) {
      misses++;
      await page.waitForTimeout(600);
      continue;
    }
    misses = 0;
    await closeBtn.click().catch(() => {});
    const discard = page
      .getByRole('button', { name: /Don.?t Save|Discard|Leave|No, /i })
      .filter({ visible: true })
      .first();
    if (await discard.isVisible({ timeout: 800 }).catch(() => false)) {
      await discard.click().catch(() => {});
    }
    await page.waitForTimeout(400);
  }
}

/** Click a Path (chevron) stage on a record page, then "Mark Status as Complete". */
export async function completePathStage(page: Page, stage?: string): Promise<void> {
  if (stage) {
    await page
      .locator('.slds-path__item, .slds-tabs_path__item')
      .filter({ hasText: stage })
      .first()
      .click();
    await waitForSpinners(page);
  }
  await page.getByRole('button', { name: /Mark (Status|Stage) as Complete/i }).first().click();
  await waitForSpinners(page);
}

/** Open a record-home tab (Coverages, Details, Clauses...) including under "More". */
export async function openRecordTab(page: Page, tabName: string): Promise<void> {
  // The record tablist may still be settling (e.g. right after the premium
  // full-page reload), so wait for the tab rather than an instant visibility
  // check — only fall back to the "More" overflow if it never appears.
  // Filter to VISIBLE tabs: other (background) console workspace tabs keep
  // their own hidden "<tabName>" tab in the DOM, and `.last()` alone can
  // resolve to one of those (hidden) — waiting on it then wrongly times out.
  const tab = page
    .getByRole('tab', { name: tabName, exact: true })
    .filter({ visible: true })
    .last();
  try {
    await tab.waitFor({ state: 'visible', timeout: 40_000 });
    await tab.click();
  } catch {
    // Overflow fallback — only if a "More" tab actually exists (don't hang).
    const more = page
      .getByRole('button', { name: /More/i })
      .filter({ visible: true })
      .first();
    await more.waitFor({ state: 'visible', timeout: 5_000 });
    await more.click();
    await page
      .getByRole('menuitem', { name: tabName })
      .filter({ visible: true })
      .first()
      .click();
  }
  await waitForSpinners(page);
}

/** Assert a read-only detail field shows the expected value. */
export async function expectDetailField(
  scope: Scope,
  fieldLabel: string,
  expected: string | RegExp
): Promise<void> {
  const item = scope
    .locator('records-record-layout-item, .slds-form-element, force-record-layout-item')
    .filter({ hasText: fieldLabel })
    .first();
  await expect(item).toContainText(expected);
}

/** dd/mm/yyyy for Salesforce UK-locale date inputs. */
export function ukDate(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}/${mm}/${d.getFullYear()}`;
}

/**
 * dd-mm-yyyy (DASHES) for the Vlocity OmniScript date inputs (e.g. the MTA
 * "Enter MTA Information" wizard). Verified live: these fields reject the
 * slash form with "Please use the format DD-MM-YYYY" and the value must be
 * committed with Tab/blur (Escape reverts it) — see PolicyActionsPage.
 */
export function ukDateDash(offsetDays = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  return `${dd}-${mm}-${d.getFullYear()}`;
}
