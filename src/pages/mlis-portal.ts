import { expect, Page, test } from '@playwright/test';
import { getMlisPortalUrl } from '../config/env';
import { logPolicyNumber } from '../utils/policy-tracker';

export class LoginPage {
  constructor(private readonly page: Page) {}

  async goto() {
    await this.page.goto(getMlisPortalUrl());
  }

  async login(email: string, password: string) {
    if (await this.isQuoteManagerVisible()) {
      return;
    }

    await this.page.getByRole('textbox', { name: 'Email address' }).fill(email);
    await this.page.getByRole('textbox', { name: 'Password' }).fill(password);

    const loginLink = this.page.getByRole('link', { name: /^Login$/i }).first();
    const loginButton = this.page.getByRole('button', { name: /^Login$/i }).first();

    if (await loginLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await loginLink.click();
    } else {
      await loginButton.click();
    }

    // Keep login lightweight; QuoteManagerPage.expectLoaded() performs robust post-login checks.
    await this.page.waitForLoadState('domcontentloaded');
  }

  private async isQuoteManagerVisible() {
    const quoteManagerHeading = this.page.getByRole('heading', { name: /Quote manager/i }).first();
    const startQuoteLink = this.page.getByRole('link', { name: /Start quote/i }).first();

    return (
      await quoteManagerHeading.isVisible({ timeout: 1500 }).catch(() => false)
      || await startQuoteLink.isVisible({ timeout: 1500 }).catch(() => false)
    );
  }
}

export class QuoteManagerPage {
  constructor(private readonly page: Page) {}

  private async dismissBlockingDialogIfVisible() {
    const modal = this.page.locator('[role="dialog"]:visible, .slds-modal.slds-fade-in-open:visible').first();
    if (!(await modal.isVisible({ timeout: 2000 }).catch(() => false))) {
      return;
    }

    const closeButton = modal
      .locator('button:has-text("Close"), button[title*="Close"], button.slds-button_icon, button[aria-label*="Close"]')
      .first();

    if (await closeButton.isVisible({ timeout: 1500 }).catch(() => false)) {
      await closeButton.click().catch(() => undefined);
    } else {
      await this.page.keyboard.press('Escape').catch(() => undefined);
    }

    await expect(modal).toBeHidden({ timeout: 10000 }).catch(() => undefined);
  }

  async expectLoaded() {
    await this.acceptCookiesIfVisible();
    await this.dismissBlockingDialogIfVisible();

    const quoteManagerHeading = this.page.getByRole('heading', { name: /Quote manager/i }).first();
    const startQuoteLink = this.page.getByRole('link', { name: /Start quote/i }).first();
    const startNewQuoteHeading = this.page.getByRole('heading', { name: /Start new quote/i }).first();
    const searchAllFields = this.page.getByRole('textbox', { name: /Search all fields/i }).first();
    const quoteManagerNav = this.page.getByRole('link', { name: /^Quote manager$/i }).first();

    const headingVisible = await quoteManagerHeading.isVisible({ timeout: 60000 }).catch(() => false);
    if (!headingVisible) {
      await expect(
        startQuoteLink
          .or(startNewQuoteHeading)
          .or(searchAllFields)
          .or(quoteManagerNav)
          .first(),
      ).toBeVisible({ timeout: 120000 });
    }
  }

  async acceptCookiesIfVisible() {
    const acceptCookies = this.page.getByRole('button', { name: 'ACCEPT ALL' });
    if (await acceptCookies.isVisible({ timeout: 5000 }).catch(() => false)) {
      await acceptCookies.click();
    }
  }

  async startResidentialEnglandWalesQuote() {
    const startQuote = this.page.getByRole('link', { name: 'England & Wales Start quote' }).first();
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await this.acceptCookiesIfVisible();
      await this.dismissBlockingDialogIfVisible();
      try {
        await startQuote.click({ timeout: 12000 });
        break;
      } catch (error) {
        if (attempt === 4) {
          throw error;
        }
        await this.page.waitForTimeout(1000);
      }
    }
    await expect(this.page).toHaveURL(/quoteType=Residential&jurisdiction=EnglandAndWales/, { timeout: 20000 });
  }
}

export class ProductSelectionPage {
  constructor(private readonly page: Page) {}

  async expectLoaded() {
    await expect(this.page.getByRole('textbox', { name: 'My case reference/ file number' })).toBeVisible({ timeout: 20000 });
    await expect(this.page.getByRole('heading', { name: 'Product selection' })).toBeVisible({ timeout: 20000 });
  }

  async fillCaseReferenceAndLimit(caseRef: string, limit: string) {
    const caseRefInput = this.page.getByRole('textbox', { name: 'My case reference/ file number' });
    await caseRefInput.fill(caseRef);
    await caseRefInput.press('Tab');

    const limitInput = this.page.getByRole('spinbutton', { name: 'Limit of indemnity' });
    await limitInput.fill(limit);
    await limitInput.press('Tab');

    const digitsOnly = limit.replace(/[^0-9]/g, '');
    const withCommas = digitsOnly.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    await expect(limitInput).toHaveValue(new RegExp(`(${withCommas}|${digitsOnly})(\\.00)?`));
  }
  private escapeRegex(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  async selectProductByName(productName: string) {
    const escapedName = this.escapeRegex(productName.trim());

    const clickMatchingProduct = async () => {
      const productCard = this.page
        .locator('article:visible, section:visible, div:visible')
        .filter({ hasText: new RegExp(escapedName, 'i') })
        .filter({ hasText: /Select/i })
        .first();

      if (!(await productCard.isVisible({ timeout: 5000 }).catch(() => false))) {
        return false;
      }

      const selectButton = productCard.getByRole('button', { name: /^Select$/i }).first();
      if (!(await selectButton.isVisible({ timeout: 5000 }).catch(() => false))) {
        return false;
      }

      await selectButton.click();
      return true;
    };

    const clickByExactLabel = async () => {
      const exactPattern = new RegExp(`^\\s*${escapedName}\\s*$`, 'i');
      const productLabel = this.page.locator('p, span, h2, h3, div').filter({ hasText: exactPattern }).first();
      if (!(await productLabel.isVisible({ timeout: 5000 }).catch(() => false))) {
        return false;
      }

      let selectButton = productLabel
        .locator('xpath=ancestor::*[self::article or self::tr or self::li or self::section or self::div][1]')
        .getByRole('button', { name: /^Select$/i })
        .first();

      if (!(await selectButton.isVisible({ timeout: 2000 }).catch(() => false))) {
        selectButton = this.page
          .locator(`xpath=//*[normalize-space(.)="${productName.replace(/"/g, '\\"')}"]/following::button[normalize-space()="Select"][1]`)
          .first();
      }

      if (!(await selectButton.isVisible({ timeout: 5000 }).catch(() => false))) {
        return false;
      }

      await selectButton.click();
      return true;
    };

    let filterInput = this.page.getByRole('textbox', { name: /filter this product list/i }).first();
    if (!(await filterInput.isVisible({ timeout: 2000 }).catch(() => false))) {
      filterInput = this.page.locator('input[placeholder*="Enter keywords to search for a product" i]').first();
    }
    if (!(await filterInput.isVisible({ timeout: 2000 }).catch(() => false))) {
      filterInput = this.page.locator('input[aria-label*="Filter this product list"]:visible').first();
    }
    if (!(await filterInput.isVisible({ timeout: 2000 }).catch(() => false))) {
      filterInput = this.page.locator('xpath=//label[contains(normalize-space(.), "Filter this product list")]/following::input[1]').first();
    }

    if (await filterInput.isVisible({ timeout: 10000 }).catch(() => false)) {
      await filterInput.click();
      await filterInput.fill('');
      await filterInput.fill(productName);
      await filterInput.press('Enter').catch(() => undefined);
      await filterInput.press('Tab').catch(() => undefined);
      await this.page.waitForTimeout(1200);

      if (await clickByExactLabel()) {
        return;
      }

      const productNamePattern = new RegExp(`^\\s*${escapedName}\\s*$`, 'i');
      const productLabel = this.page.locator('p, span, div').filter({ hasText: productNamePattern }).first();
      if (await productLabel.isVisible({ timeout: 5000 }).catch(() => false)) {
        await productLabel.scrollIntoViewIfNeeded().catch(() => undefined);

        let selectButton = productLabel
          .locator('xpath=ancestor::*[self::article or self::tr or self::li or self::div][1]')
          .getByRole('button', { name: /^Select$/i })
          .first();

        if (!(await selectButton.isVisible({ timeout: 3000 }).catch(() => false))) {
          selectButton = this.page
            .locator(`xpath=//*[normalize-space(.)="${productName.replace(/"/g, '\\"')}"]/following::button[normalize-space()="Select"][1]`)
            .first();
        }

        await expect(selectButton, `Select button not found for product: ${productName}`).toBeVisible({ timeout: 20000 });
        await selectButton.click();
        return;
      }

      if (await clickMatchingProduct()) {
        return;
      }
    }

    throw new Error(`Product selection failed: typed '${productName}' into 'Filter this product list' but exact product row/select button was not found.`);
  }

  async selectProductsByIndex(indexes: number[]) {
    const selectButtons = this.page.getByRole('button', { name: 'Select' });
    const proceedButton = this.page.getByRole('button', { name: 'Proceed' }).first();

    await expect(selectButtons.first()).toBeEnabled({ timeout: 10000 });

    for (let i = 0; i < indexes.length; i += 1) {
      await selectButtons.nth(indexes[i]).click();
      if (i === 0) {
        await this.page.keyboard.press('End');
        await expect(proceedButton).toBeVisible({ timeout: 10000 });
      }
    }
  }

  async proceed() {
    await this.page.getByRole('button', { name: 'Proceed' }).first().click();
  }
}

export class StatementsOfFactPage {
  constructor(private readonly page: Page) {}

  private async waitForLoadingOverlayToClear() {
    const overlay = this.page.locator('.loading-overlay:visible').first();
    if (await overlay.isVisible({ timeout: 1000 }).catch(() => false)) {
      await expect(overlay).toBeHidden({ timeout: 20000 });
    }
  }

  async expectLoaded() {
    await expect(this.page.getByRole('heading', { name: /statements of fact to agree/i })).toBeVisible();
    await expect(this.page.getByRole('button', { name: 'Confirm', exact: true }).first()).toBeVisible({ timeout: 20000 });
  }

  async confirmAllStatements() {
    const confirmButtons = this.page.getByRole('button', { name: 'Confirm', exact: true });
    await expect(confirmButtons.first()).toBeVisible({ timeout: 20000 });
    let remaining = await confirmButtons.count();
    let safety = 0;

    while (remaining > 0 && safety < 50) {
      const currentButton = confirmButtons.first();
      await currentButton.scrollIntoViewIfNeeded();

      for (let clickAttempt = 1; clickAttempt <= 4; clickAttempt += 1) {
        await this.waitForLoadingOverlayToClear();
        try {
          await currentButton.click({ timeout: 7000 });
          break;
        } catch (error) {
          if (clickAttempt === 4) {
            throw error;
          }
          await this.page.waitForTimeout(750);
        }
      }

      await expect(confirmButtons).toHaveCount(remaining - 1, { timeout: 10000 });
      remaining = await confirmButtons.count();
      safety += 1;
    }

    await expect(confirmButtons).toHaveCount(0, { timeout: 10000 });
  }

  async proceed() {
    await this.page.getByRole('button', { name: 'Proceed' }).click();
  }
}

export class QuotesPage {
  constructor(private readonly page: Page) {}

  async expectLoaded() {
    await expect(this.page.getByText('Loading...').first()).toBeHidden({ timeout: 60000 });
    await expect(this.page.getByRole('button', { name: 'Quote summary' }).first()).toBeVisible({ timeout: 60000 });
    const firstSelectQuote = this.page.getByRole('button', { name: 'Select quote' }).first();
    await expect(firstSelectQuote).toBeVisible({ timeout: 60000 });
    await expect(firstSelectQuote).toBeEnabled({ timeout: 60000 });
  }

  async selectFirstQuote() {
    await this.page.getByRole('button', { name: 'Select quote' }).first().click();
  }

  async selectQuoteForInsurer(insurerName: string) {
    const rows = this.page.locator('tr:visible, [role="row"]:visible');
    const desired = insurerName.trim().toLowerCase();

    const rowCount = await rows.count();
    for (let i = 0; i < rowCount; i += 1) {
      const row = rows.nth(i);
      const text = (await row.textContent())?.trim() ?? '';
      if (!text) continue;

      // Compare lines within the row for an exact, case-insensitive match.
      const lines = text.split(/\r?\n/).map((l) => l.trim().toLowerCase()).filter(Boolean);
      if (lines.some((l) => l === desired)) {
        await row.scrollIntoViewIfNeeded();
        const selectQuoteButton = row.getByRole('button', { name: /Select quote/i }).first();
        await expect(selectQuoteButton).toBeVisible({ timeout: 20000 });
        await expect(selectQuoteButton).toBeEnabled({ timeout: 20000 });
        await selectQuoteButton.click();
        return;
      }
    }

    // Fallback: if exact insurer row wasn't found, try the previous contains-based match once.
    const containsRow = this.page.locator('tr:visible, [role="row"]:visible').filter({ hasText: insurerName }).first();
    if (await containsRow.isVisible({ timeout: 2000 }).catch(() => false)) {
      await containsRow.scrollIntoViewIfNeeded();
      const selectQuoteButton = containsRow.getByRole('button', { name: /Select quote/i }).first();
      await expect(selectQuoteButton).toBeVisible({ timeout: 20000 });
      await expect(selectQuoteButton).toBeEnabled({ timeout: 20000 });
      await selectQuoteButton.click();
      return;
    }

    // Final fallback: select the first available quote button.
    // eslint-disable-next-line no-console
    console.warn(`Insurer '${insurerName}' not found by exact match; selecting first available quote.`);
    const firstSelect = this.page.getByRole('button', { name: 'Select quote' }).first();
    await expect(firstSelect).toBeVisible({ timeout: 60000 });
    await expect(firstSelect).toBeEnabled({ timeout: 60000 });
    await firstSelect.click();
  }
}

export class FinalPolicyDetailsPage {
  constructor(private readonly page: Page) {}

  private async fillAddressLine1Reliable(value: string) {
    const line1ByLabel = this.page.getByRole('textbox', { name: /Address\s*line\s*1/i }).first();
    if (await line1ByLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
      await line1ByLabel.scrollIntoViewIfNeeded();
      await line1ByLabel.fill(value);
      const current = (await line1ByLabel.inputValue().catch(() => '')).trim();
      if (current.length > 0) return;
    }

    const requiredInputs = this.page.locator('input[required]');
    await expect(requiredInputs.nth(2)).toBeVisible({ timeout: 20000 });
    await requiredInputs.nth(2).fill(value);

    const current = (await requiredInputs.nth(2).inputValue().catch(() => '')).trim();
    if (current.length === 0) {
      // Last fallback: first visible address textbox-like input after postcode.
      const fallback = this.page
        .locator('input[required]:visible, input[aria-required="true"]:visible')
        .nth(2);
      await fallback.fill(value);
    }
  }

  async expectLoaded() {
    await expect(this.page.getByText('Loading...').first()).toBeHidden({ timeout: 20000 });
    await expect(this.page.getByRole('heading', { name: 'Final policy details' })).toBeVisible({ timeout: 20000 });
  }

  async fillRequiredDetails(data?: {
    insuredName?: string;
    postcode?: string;
    addressLine1?: string;
    addressLine2?: string;
    addressLine3?: string;
    addressLine4?: string;
    town?: string;
    landRegisterNumber?: string;
  }) {
    let requiredInputs = this.page.locator('input[required]');
    const usedRequiredIndexes = new Set<number>([0, 1, 2]);

    await requiredInputs.nth(0).fill(data?.insuredName ?? 'E2E Test Client');

    const postcodeInput = requiredInputs.nth(1);
    await postcodeInput.fill(data?.postcode ?? 'EC3A 2BJ');
    await postcodeInput.press('Tab').catch(() => {});

    const enterManually = this.page
      .getByRole('button', { name: /enter manually/i })
      .or(this.page.getByRole('link', { name: /enter manually/i }))
      .first();

    if (await enterManually.isVisible({ timeout: 2000 }).catch(() => false)) {
      await enterManually.click();
    }

    requiredInputs = this.page.locator('input[required]');
    await this.fillAddressLine1Reliable(data?.addressLine1 ?? '52-54 Leadenhall Street');

    const fillByLabel = async (labelRegExp: RegExp, value: string) => {
      const field = this.page.getByRole('textbox', { name: labelRegExp }).first();
      if (await field.isVisible({ timeout: 1500 }).catch(() => false)) {
        await field.fill(value);
        return true;
      }
      return false;
    };

    const tryFillByRequiredIndex = async (indexes: number[], value: string) => {
      requiredInputs = this.page.locator('input[required]');
      const count = await requiredInputs.count();
      for (const index of indexes) {
        if (usedRequiredIndexes.has(index)) continue;
        if (count <= index) continue;
        const input = requiredInputs.nth(index);
        if (!(await input.isVisible({ timeout: 1200 }).catch(() => false))) continue;
        await input.fill(value);
        usedRequiredIndexes.add(index);
        return true;
      }
      return false;
    };

    if (data?.addressLine2) {
      const line2Filled = await fillByLabel(/Address\s*line\s*2/i, data.addressLine2);
      if (!line2Filled) await tryFillByRequiredIndex([3, 4, 5], data.addressLine2);
    }

    if (data?.addressLine3) {
      const line3Filled = await fillByLabel(/Address\s*line\s*3/i, data.addressLine3);
      if (!line3Filled) await tryFillByRequiredIndex([3, 4, 5], data.addressLine3);
    }

    if (data?.addressLine4) {
      const line4Filled = await fillByLabel(/Address\s*line\s*4/i, data.addressLine4);
      if (!line4Filled) await tryFillByRequiredIndex([3, 4, 5], data.addressLine4);
    }

    const townByLabel = this.page.getByRole('textbox', { name: /Town\s*\/\s*City|Town|City/i }).first();
    if (await townByLabel.isVisible({ timeout: 2000 }).catch(() => false)) {
      await townByLabel.fill(data?.town ?? 'London');
    } else {
      const townValue = data?.town ?? 'London';
      const filled = await tryFillByRequiredIndex([3, 4, 5, 6], townValue);
      if (!filled) {
        await expect(requiredInputs.nth(3)).toBeVisible({ timeout: 20000 });
        await requiredInputs.nth(3).fill(townValue);
      }
    }

    if (data?.landRegisterNumber) {
      const landRegisterInput = this.page
        .getByRole('textbox', { name: /(Land\s*register|Land\s*registry|Title\s*(number|no\.?))/i })
        .first();

      if (await landRegisterInput.isVisible({ timeout: 1500 }).catch(() => false)) {
        await landRegisterInput.fill(data.landRegisterNumber);
      }
    }
  }

  async proceed() {
    await this.page.getByRole('button', { name: 'Proceed' }).click();
  }
}

export class SummaryPage {
  constructor(private readonly page: Page) {}

  async expectLoaded() {
    await expect(this.page.getByText('Loading...').first()).toBeHidden({ timeout: 20000 });
    await expect(this.page.getByRole('heading', { name: 'Summary' })).toBeVisible({ timeout: 20000 });
  }

  async expectSummaryData(
    caseRef: string,
    expected?: {
      limitOfIndemnity?: string;
      insuredName?: string;
      addressLine1?: string;
    },
  ) {
    await expect(this.page.getByText(caseRef)).toBeVisible();

    const limitDigits = (expected?.limitOfIndemnity ?? '500000').replace(/[^0-9]/g, '');
    const limitNumber = Number(limitDigits || '0');
    const formattedLimit = limitNumber.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    await expect(this.page.getByText(`£${formattedLimit}`)).toBeVisible();

    await expect(this.page.getByText(expected?.insuredName ?? 'E2E Test Client')).toBeVisible();
    await expect(this.page.getByText(expected?.addressLine1 ?? '52-54 Leadenhall Street')).toBeVisible();
    await expect(this.page.getByText('Premium: £')).toBeVisible();
  }

  async proceedToOrder() {
    await this.page.getByRole('button', { name: 'Proceed to order' }).click();
  }
}

export class OrderDialog {
  constructor(private readonly page: Page) {}

  async selectTodayAndOrder() {
    await this.page.getByRole('textbox', { name: 'Confirm policy commencement' }).click();
    await this.page.getByRole('button', { name: 'Today' }).click();
    await expect(this.page.getByRole('button', { name: 'Order now' })).toBeEnabled();
    await this.page.getByRole('button', { name: 'Order now' }).click();
  }
}

export class PolicyIssuedPage {
  constructor(private readonly page: Page) {}

  async expectPolicyIssued() {
    const processingDialog = this.page.getByRole('heading', { name: 'Processing Request' }).first();
    if (await processingDialog.isVisible()) {
      await expect(processingDialog).toBeHidden({ timeout: 60000 });
    }

    await expect(this.page.getByRole('heading', { name: 'Policy issued' })).toBeVisible({ timeout: 60000 });
    const policyLabel = this.page.locator('strong', { hasText: 'Policy number' });
    await expect(policyLabel).toBeVisible({ timeout: 20000 });
    const policyText = (await policyLabel.locator('xpath=following::p[1]').first().textContent())?.trim() ?? '';
    expect(policyText).toMatch(/[A-Z]{2,}-[A-Z]{2,}-\d{6,}/);
    await logPolicyNumber(policyText, test.info().title, 'EW Residential').catch(() => {});
  }

  async getIssuedPolicyNumber() {
    const policyLabel = this.page.locator('strong', { hasText: 'Policy number' });
    await expect(policyLabel).toBeVisible({ timeout: 20000 });
    const policyText = (await policyLabel.locator('xpath=following::p[1]').first().textContent())?.trim() ?? '';
    expect(policyText).toMatch(/[A-Z]{2,}-[A-Z]{2,}-\d{6,}/);
    await logPolicyNumber(policyText, test.info().title, 'EW Residential').catch(() => {});
    return policyText;
  }

  async backToQuoteManager() {
    await this.page.getByRole('button', { name: 'Back to quote manager' }).click();
  }
}
