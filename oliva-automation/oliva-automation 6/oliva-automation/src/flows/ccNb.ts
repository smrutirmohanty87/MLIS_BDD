import { expect, Page } from '@playwright/test';
import { waitForSpinners } from '../utils/sf';
import { CC_EL_TRADE } from '../data/ccData';

/**
 * CC (Contractors Combined NB) flow helpers.
 *
 * EL "Trade Details" grid row requires custom handling (the generic OmniScript
 * form engine mis-targets the row's combobox); this helper fills it directly
 * before the generic forms.fill() is called.
 */

function escapeRx(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Fill EL "Trade Details" grid row: Trade Description picklist + wageroll +
 * headcount. Combobox labels prefixed with asterisk (*) in live org. Row
 * labels are literal: "*Trade Description", "*(Name of trade description)
 * wageroll", "(… ) headcount".
 */
export async function fillElTradeRow(page: Page): Promise<void> {
  const tradeCombo = page.getByLabel(/^\*?\s*Trade Description\s*$/).filter({ visible: true }).first();
  await expect(tradeCombo).toBeVisible({ timeout: 20_000 });
  await tradeCombo.click();
  await page.waitForTimeout(1500);
  const optLoc = page
    .locator('[role="option"]:not(.slds-path__link), lightning-base-combobox-item, [role="listbox"] li')
    .filter({ visible: true })
    .filter({ hasText: new RegExp(`^\\s*${escapeRx(CC_EL_TRADE.tradeDescription)}\\s*$`) })
    .first();
  if (await optLoc.isVisible({ timeout: 5000 }).catch(() => false)) {
    await optLoc.click();
  } else {
    // Type-to-filter combobox fallback (proven path when the list is long).
    await tradeCombo.fill(CC_EL_TRADE.tradeDescription).catch(() => {});
    await page.waitForTimeout(1500);
    if (await optLoc.isVisible({ timeout: 3000 }).catch(() => false)) await optLoc.click();
    else await page.keyboard.press('Enter').catch(() => {});
  }
  await waitForSpinners(page);

  const tradeWage = page
    .getByLabel(/\(Name of trade description\) wageroll/i)
    .and(page.locator('input'))
    .filter({ visible: true })
    .first();
  await expect(tradeWage).toBeVisible({ timeout: 15_000 });
  await tradeWage.click({ clickCount: 3 });
  await tradeWage.fill(CC_EL_TRADE.wageroll);
  if (CC_EL_TRADE.headcount) {
    const head = page
      .getByLabel(/\(Name of trade description\) headcount/i)
      .and(page.locator('input'))
      .filter({ visible: true })
      .first();
    await head.click({ clickCount: 3 });
    await head.fill(CC_EL_TRADE.headcount);
  }
}
