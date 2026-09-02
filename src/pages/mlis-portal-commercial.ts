import { expect, Page, test } from '@playwright/test';
import { getMlisPortalUrl } from '../config/env';
import { logPolicyNumber } from '../utils/policy-tracker';

export class CommercialLoginPage {
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

export class CommercialQuoteManagerPage {
  constructor(private readonly page: Page) {}

  async expectLoaded() {
    await this.acceptCookiesIfVisible();
    await expect(this.page.getByRole('heading', { name: 'Quote manager' })).toBeVisible({ timeout: 20000 });
  }

  async acceptCookiesIfVisible() {
    const acceptCookies = this.page.getByRole('button', { name: 'ACCEPT ALL' });
    if (await acceptCookies.isVisible()) {
      await acceptCookies.click();
    }
  }

  async startCommercialEnglandWalesQuote() {
    await this.page.getByRole('link', { name: 'England & Wales Start quote' }).nth(1).click();
    await expect(this.page).toHaveURL(/quoteType=Commercial&jurisdiction=EnglandAndWales/, { timeout: 20000 });
  }
}

export class CommercialProductSelectionPage {
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
    await expect(limitInput).toHaveValue(/500,000\.00|500000/);
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

    if (await clickMatchingProduct()) {
      return;
    }

    let searchInput = this.page.getByRole('textbox', { name: /Filter this product list/i }).first();
    if (!(await searchInput.isVisible({ timeout: 2000 }).catch(() => false))) {
      searchInput = this.page.locator('input[placeholder*="Enter keywords to search for a product"]:visible').first();
    }
    if (!(await searchInput.isVisible({ timeout: 2000 }).catch(() => false))) {
      searchInput = this.page.locator('input[aria-label*="Filter this product list"]:visible').first();
    }
    if (!(await searchInput.isVisible({ timeout: 2000 }).catch(() => false))) {
      searchInput = this.page.locator('xpath=//label[contains(normalize-space(.), "Filter this product list")]/following::input[1]').first();
    }

    if (await searchInput.isVisible({ timeout: 10000 }).catch(() => false)) {
      await searchInput.fill(productName);
      await searchInput.press('Enter').catch(() => undefined);
      await this.page.waitForTimeout(1200);
      if (await clickMatchingProduct()) {
        return;
      }
    }

    const fallbackProductCard = this.page
      .locator('article:visible, section:visible, div:visible')
      .filter({ hasText: new RegExp(escapedName, 'i') })
      .filter({ hasText: /Select/i })
      .first();

    if (await fallbackProductCard.isVisible({ timeout: 10000 }).catch(() => false)) {
      const selectButton = fallbackProductCard.getByRole('button', { name: /^Select$/i }).first();
      await expect(selectButton).toBeVisible({ timeout: 120000 });
      await selectButton.click();
      return;
    }

    throw new Error(`Product selection failed: '${productName}' was not found on the page.`);
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

export class CommercialStatementsOfFactPage {
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
      await confirmButtons.first().scrollIntoViewIfNeeded();
      await confirmButtons.first().click();
      await expect(confirmButtons).toHaveCount(remaining - 1, { timeout: 10000 });
      remaining = await confirmButtons.count();
      safety += 1;
    }

    await expect(confirmButtons).toHaveCount(0, { timeout: 10000 });
  }

  async proceed() {
    await this.page.getByRole('button', { name: 'Proceed' }).click();
  }

  async proceedWithReferral() {
    const cannotConfirmButtons = this.page
      .getByRole('button', { name: /Cannot\s*confirm/i })
      .filter({ hasNotText: /Proceed with referral/i });

    await expect(cannotConfirmButtons.first()).toBeVisible({ timeout: 30000 });
    const totalStatements = await cannotConfirmButtons.count();
    for (let i = 0; i < totalStatements; i += 1) {
      const currentButton = cannotConfirmButtons.nth(i);
      await currentButton.scrollIntoViewIfNeeded();

      for (let clickAttempt = 1; clickAttempt <= 4; clickAttempt += 1) {
        await this.waitForLoadingOverlayToClear();
        try {
          await currentButton.click({ timeout: 10000 });
          break;
        } catch (error) {
          if (clickAttempt === 4) {
            throw error;
          }
          await this.page.waitForTimeout(750);
        }
      }
    }

    const proceedWithReferralButton = this.page
      .getByRole('button', { name: /Proceed\s+with\s+ref+err?al/i })
      .first();

    await proceedWithReferralButton.scrollIntoViewIfNeeded();
    await expect(proceedWithReferralButton).toBeVisible({ timeout: 30000 });
    await expect(proceedWithReferralButton).toBeEnabled({ timeout: 30000 });
    await proceedWithReferralButton.click();
  }
}

export class CommercialReferralDetailsPage {
  constructor(private readonly page: Page) {}

  async expectLoaded() {
    await expect(this.page.getByRole('heading', { name: /Referral details/i })).toBeVisible({ timeout: 30000 });
    await expect(this.page.getByRole('button', { name: /Proceed\s+with\s+ref+err?al/i }).first()).toBeVisible({ timeout: 30000 });
  }

  async fillRequiredDetails() {
    const insuredName = this.page
      .locator('xpath=//*[contains(normalize-space(.), "Insured name(s) or name of mortgage lender if Lender Only cover")]/following::input[1]')
      .first();
    const insuredPostcode = this.page
      .locator('xpath=//*[contains(normalize-space(.), "Insured property postcode")]/following::input[1]')
      .first();
    const addressLine1 = this.page
      .locator('xpath=//*[contains(normalize-space(.), "Address line 1")]/following::input[1]')
      .first();
    const townCity = this.page
      .locator('xpath=//*[contains(normalize-space(.), "Town / city")]/following::input[1]')
      .first();
    const referralNotes = this.page
      .locator('xpath=//*[contains(normalize-space(.), "Let us know why you could not confirm statement")]/following::*[(self::textarea or self::input)][1]')
      .first();

    await expect(insuredName).toBeVisible({ timeout: 30000 });

    await insuredName.scrollIntoViewIfNeeded();
    await insuredName.fill('E2E Referral Client');

    await expect(insuredPostcode).toBeVisible({ timeout: 30000 });
    await insuredPostcode.scrollIntoViewIfNeeded();
    await insuredPostcode.fill('EC3A 2BJ');
    await insuredPostcode.press('Tab');

    const enterManually = this.page
      .getByRole('button', { name: /enter manually/i })
      .or(this.page.getByRole('link', { name: /enter manually/i }))
      .or(this.page.getByText(/^enter manually$/i))
      .first();

    await enterManually
      .waitFor({ state: 'visible', timeout: 7000 })
      .then(async () => {
        await enterManually.scrollIntoViewIfNeeded().catch(() => {});
        await enterManually.click({ timeout: 7000 });
      })
      .catch(() => {});

    await expect(addressLine1).toBeVisible({ timeout: 30000 });
    await addressLine1.scrollIntoViewIfNeeded();
    await addressLine1.fill('52-54 Leadenhall Street');

    await expect(townCity).toBeVisible({ timeout: 30000 });
    await townCity.scrollIntoViewIfNeeded();
    await townCity.fill('London');

    await expect(referralNotes).toBeVisible({ timeout: 30000 });
    await referralNotes.scrollIntoViewIfNeeded();
    await referralNotes.fill('Unable to confirm statements of fact - referral requested by automation test.');

    await expect(this.page.getByText(/Please enter a valid postcode/i)).toBeHidden({ timeout: 15000 });
  }

  async submitReferral() {
    const proceedWithReferralButton = this.page
      .getByRole('button', { name: /Proceed\s+with\s+ref+err?al/i })
      .first();

    await proceedWithReferralButton.scrollIntoViewIfNeeded();
    await expect(proceedWithReferralButton).toBeEnabled({ timeout: 30000 });
    await proceedWithReferralButton.click();
  }

  async expectReferralCompleted() {
    const quoteManagerHeading = this.page.getByRole('heading', { name: /Quote manager/i }).first();
    const submitHeading = this.page.getByRole('heading', { name: /Submit/i }).first();
    const confirmationText = this.page.getByText(/referred|underwriter|submitted/i).first();

    await expect(quoteManagerHeading.or(submitHeading).or(confirmationText).first()).toBeVisible({ timeout: 60000 });
  }
}

export class CommercialReferralSubmitPage {
  constructor(private readonly page: Page) {}

  async expectLoaded() {
    const referralSummaryHeading = this.page.getByRole('heading', { name: /Referral summary/i }).first();
    const submitStepButton = this.page.getByRole('button', { name: /^4\s*Submit$/i }).first();
    await expect(referralSummaryHeading.or(submitStepButton).first()).toBeVisible({ timeout: 30000 });
    await expect(this.page.getByRole('button', { name: /Submit\s+to\s+underwrit/i }).first()).toBeVisible({ timeout: 30000 });
  }

  async submitToUnderwriter() {
    const submitToUnderwriterButton = this.page.getByRole('button', { name: /Submit\s+to\s+underwrit/i }).first();
    await submitToUnderwriterButton.scrollIntoViewIfNeeded();
    await expect(submitToUnderwriterButton).toBeEnabled({ timeout: 30000 });
    await submitToUnderwriterButton.click();
  }
}

export class CommercialReferralSubmittedPage {
  constructor(private readonly page: Page) {}

  async expectLoaded() {
    await expect(this.page.getByRole('heading', { name: /Referral submitted/i }).first()).toBeVisible({ timeout: 60000 });
    await expect(this.page.getByRole('button', { name: /Back to quote manager/i }).first()).toBeVisible({ timeout: 60000 });
  }

  async backToQuoteManager() {
    const backToQuoteManagerButton = this.page.getByRole('button', { name: /Back to quote manager/i }).first();
    await backToQuoteManagerButton.scrollIntoViewIfNeeded();
    await backToQuoteManagerButton.click();
  }
}

export class CommercialQuotesPage {
  constructor(private readonly page: Page) {}

  async expectLoaded() {
    await expect(this.page.getByText('Loading...').first()).toBeHidden({ timeout: 20000 });
    // 'Quote summary' may be disabled for referral quotes — only assert visibility here.
    await expect(this.page.getByRole('button', { name: 'Quote summary' }).first()).toBeVisible({ timeout: 20000 });
    const firstSelectQuote = this.page.getByRole('button', { name: 'Select quote' }).first();
    await expect(firstSelectQuote).toBeVisible({ timeout: 20000 });
    await expect(firstSelectQuote).toBeEnabled({ timeout: 20000 });
  }

  async selectFirstQuote() {
    await this.page.getByRole('button', { name: 'Select quote' }).first().click();
  }

  async selectQuoteByIndex(index: number) {
    const selectQuoteButtons = this.page.getByRole('button', { name: 'Select quote' });
    await expect(selectQuoteButtons.nth(index)).toBeVisible({ timeout: 20000 });
    await expect(selectQuoteButtons.nth(index)).toBeEnabled({ timeout: 20000 });
    await selectQuoteButtons.nth(index).click();
  }
}

export class CommercialFinalPolicyDetailsPage {
  constructor(private readonly page: Page) {}

  async expectLoaded() {
    await expect(this.page.getByText('Loading...').first()).toBeHidden({ timeout: 20000 });
    await expect(this.page.getByRole('heading', { name: 'Final policy details' })).toBeVisible({ timeout: 20000 });
  }

  async fillRequiredDetails() {
    let requiredInputs = this.page.locator('input[required]');

    await requiredInputs.nth(0).fill('E2E Test Client');

    const postcodeInput = requiredInputs.nth(1);
    await postcodeInput.fill('EC3A 2BJ');
    await postcodeInput.press('Tab').catch(() => {});

    const enterManually = this.page
      .getByRole('button', { name: /enter manually/i })
      .or(this.page.getByRole('link', { name: /enter manually/i }))
      .or(this.page.getByText(/^enter manually$/i))
      .first();

    await enterManually
      .waitFor({ state: 'visible', timeout: 7000 })
      .then(async () => {
        await enterManually.scrollIntoViewIfNeeded().catch(() => {});
        await expect(enterManually).toBeEnabled({ timeout: 7000 });
        await enterManually.click({ timeout: 7000 });
      })
      .catch(() => {});

    requiredInputs = this.page.locator('input[required]');
    await expect(requiredInputs.nth(2)).toBeVisible({ timeout: 20000 });
    await requiredInputs.nth(2).fill('52-54 Leadenhall Street');
    await requiredInputs.nth(3).fill('London');
  }

  async fillRequiredDetailsWithAllAddressLinesMax255() {
    const buildAddressText = (prefix: string) => {
      const maxLength = 255;
      const filler = `${prefix} AUTOMATION ADDRESS VALIDATION BLOCK `;
      return filler.repeat(Math.ceil(maxLength / filler.length)).slice(0, maxLength);
    };

    let requiredInputs = this.page.locator('input[required]');
    await requiredInputs.nth(0).fill('E2E Test Client');

    const postcodeInput = requiredInputs.nth(1);
    await postcodeInput.fill('EC3A 2BJ');
    await postcodeInput.press('Tab').catch(() => {});

    const enterManually = this.page
      .getByRole('button', { name: /enter manually/i })
      .or(this.page.getByRole('link', { name: /enter manually/i }))
      .or(this.page.getByText(/^enter manually$/i))
      .first();

    if (await enterManually.isVisible({ timeout: 3000 }).catch(() => false)) {
      await enterManually.click();
    }

    const addressLine1 = buildAddressText('ADDRESS LINE 1');
    const addressLine2 = buildAddressText('ADDRESS LINE 2');
    const addressLine3 = buildAddressText('ADDRESS LINE 3');
    const addressLine4 = buildAddressText('ADDRESS LINE 4');
    const cityValue = buildAddressText('CITY');

    requiredInputs = this.page.locator('input[required]');
    await expect(requiredInputs.nth(2)).toBeVisible({ timeout: 20000 });
    await requiredInputs.nth(2).fill(addressLine1);

    const tryFillByRequiredIndex = async (index: number, value: string) => {
      requiredInputs = this.page.locator('input[required]');
      const count = await requiredInputs.count();
      if (count > index) {
        const input = requiredInputs.nth(index);
        if (await input.isVisible({ timeout: 1500 }).catch(() => false)) {
          await input.fill(value);
          return true;
        }
      }
      return false;
    };

    const fillByLabel = async (labelRegExp: RegExp, value: string) => {
      const field = this.page.getByRole('textbox', { name: labelRegExp }).first();
      if (await field.isVisible({ timeout: 1500 }).catch(() => false)) {
        await field.fill(value);
        return true;
      }
      return false;
    };

    const line2Filled = await fillByLabel(/Address\s*line\s*2/i, addressLine2);
    if (!line2Filled) await tryFillByRequiredIndex(3, addressLine2);

    const line3Filled = await fillByLabel(/Address\s*line\s*3/i, addressLine3);
    if (!line3Filled) await tryFillByRequiredIndex(4, addressLine3);

    const line4Filled = await fillByLabel(/Address\s*line\s*4/i, addressLine4);
    if (!line4Filled) await tryFillByRequiredIndex(5, addressLine4);

    const cityFilled = await fillByLabel(/Town\s*\/\s*city|Town|City/i, cityValue);
    if (!cityFilled) {
      await tryFillByRequiredIndex(3, cityValue)
        || await tryFillByRequiredIndex(4, cityValue)
        || await tryFillByRequiredIndex(5, cityValue)
        || await tryFillByRequiredIndex(6, cityValue);
    }
  }

  async proceed() {
    await this.page.getByRole('button', { name: 'Proceed' }).click();
  }
}

export class CommercialSummaryPage {
  constructor(private readonly page: Page) {}

  async expectLoaded() {
    await expect(this.page.getByText('Loading...').first()).toBeHidden({ timeout: 20000 });
    await expect(this.page.getByRole('heading', { name: 'Summary' })).toBeVisible({ timeout: 20000 });
  }

  async expectSummaryData(caseRef: string) {
    await expect(this.page.getByText(caseRef)).toBeVisible();
    await expect(this.page.getByText('£500,000.00')).toBeVisible();
    await expect(this.page.getByText('E2E Test Client')).toBeVisible();
    await expect(this.page.getByText('52-54 Leadenhall Street')).toBeVisible();
    await expect(this.page.getByText('Premium: £')).toBeVisible();
  }

  async expectSummaryDataWithLongAddress(caseRef: string) {
    await expect(this.page.getByText(caseRef)).toBeVisible();
    await expect(this.page.getByText('£500,000.00')).toBeVisible();
    await expect(this.page.getByText('E2E Test Client')).toBeVisible();
    await expect(this.page.getByText(/ADDRESS LINE 1 AUTOMATION ADDRESS VALIDATION BLOCK/i).first()).toBeVisible();
    await expect(this.page.getByText('Premium: £')).toBeVisible();
  }

  async proceedToOrder() {
    await this.page.getByRole('button', { name: 'Proceed to order' }).click();
  }
}

export class CommercialOrderDialog {
  constructor(private readonly page: Page) {}

  async selectTodayAndOrder() {
    await this.page.getByRole('textbox', { name: 'Confirm policy commencement' }).click();
    await this.page.getByRole('button', { name: 'Today' }).click();
    await expect(this.page.getByRole('button', { name: 'Order now' })).toBeEnabled();
    await this.page.getByRole('button', { name: 'Order now' }).click();
  }
}

export class CommercialPolicyIssuedPage {
  constructor(private readonly page: Page) {}

  async expectPolicyIssued(
    expectedPattern: RegExp = /[A-Z]{2,}-[A-Z]{2,}-\d{6,}/,
    trackPolicy = true,
  ) {
    const processingDialog = this.page.getByRole('heading', { name: 'Processing Request' }).first();
    if (await processingDialog.isVisible()) {
      await expect(processingDialog).toBeHidden({ timeout: 60000 });
    }

    const policyIssuedHeading = this.page.getByRole('heading', { name: /Policy issued/i }).first();
    const referralSubmittedHeading = this.page.getByRole('heading', { name: /Referral submitted/i }).first();
    await expect(policyIssuedHeading.or(referralSubmittedHeading).first()).toBeVisible({ timeout: 60000 });

    const referenceLabel = this.page.locator('strong').filter({ hasText: /Policy number|Quote number/i }).first();
    await expect(referenceLabel).toBeVisible({ timeout: 20000 });
    const policyText = (await referenceLabel.locator('xpath=following::p[1]').first().textContent())?.trim() ?? '';
    expect(policyText).toMatch(expectedPattern);
    if (trackPolicy) {
      await logPolicyNumber(policyText, test.info().title, 'EW Commercial').catch(() => {});
    }
    return policyText;
  }

  async backToQuoteManager() {
    await this.page.getByRole('button', { name: 'Back to quote manager' }).click();
  }
}
