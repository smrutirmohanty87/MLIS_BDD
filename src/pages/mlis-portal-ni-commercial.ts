import { expect, Page, test } from '@playwright/test';
import { getMlisPortalUrl } from '../config/env';
import { logPolicyNumber } from '../utils/policy-tracker';

export class NiCommercialLoginPage {
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

export class NiCommercialQuoteManagerPage {
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

  async startCommercialNorthernIrelandQuote() {
    await this.page.getByRole('link', { name: 'Northern Ireland Start quote' }).nth(1).click();
    await expect(this.page).toHaveURL(/quoteType=Commercial&jurisdiction=NorthernIreland/, { timeout: 20000 });
  }
}

export class NiCommercialProductSelectionPage {
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

export class NiCommercialStatementsOfFactPage {
  constructor(private readonly page: Page) {}

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

  async confirmAllStatementsWithClauseAssertions() {
    const confirmButtons = this.page.getByRole('button', { name: 'Confirm', exact: true });
    const statementHeadings = this.page.getByRole('heading', { level: 4 });
    await expect(confirmButtons.first()).toBeVisible({ timeout: 20000 });
    await expect(statementHeadings.first()).toBeVisible({ timeout: 20000 });

    const capturedClauseTexts: string[] = [];
    let remaining = await confirmButtons.count();
    let safety = 0;

    while (remaining > 0 && safety < 50) {
      const currentConfirm = confirmButtons.first();
      await currentConfirm.scrollIntoViewIfNeeded();
      const clauseText = (await statementHeadings.first().innerText().catch(() => ''))
        .replace(/\s+/g, ' ')
        .trim();

      expect(clauseText, `Statement of Fact text should be captured before confirm action #${safety + 1}`).toBeTruthy();
      expect(clauseText.length, `Statement of Fact text should not be truncated before confirm action #${safety + 1}`).toBeGreaterThan(15);
      console.log(`[Broker SOF] #${safety + 1} ${clauseText}`);
      capturedClauseTexts.push(clauseText);

      await currentConfirm.click();
      await expect(confirmButtons).toHaveCount(remaining - 1, { timeout: 10000 });
      remaining = await confirmButtons.count();
      safety += 1;
    }

    await expect(confirmButtons).toHaveCount(0, { timeout: 10000 });
    expect(capturedClauseTexts.length).toBeGreaterThan(0);
    return capturedClauseTexts;
  }

  async proceed() {
    await this.page.getByRole('button', { name: 'Proceed' }).click();
  }
}

export class NiCommercialQuotesPage {
  constructor(private readonly page: Page) {}

  async expectLoaded() {
    await expect(this.page.getByText('Loading...').first()).toBeHidden({ timeout: 20000 });
    await expect(this.page.getByRole('button', { name: 'Quote summary' }).first()).toBeEnabled({ timeout: 20000 });
    const firstSelectQuote = this.page.getByRole('button', { name: 'Select quote' }).first();
    await expect(firstSelectQuote).toBeVisible({ timeout: 20000 });
    await expect(firstSelectQuote).toBeEnabled({ timeout: 20000 });
  }

  async selectFirstQuote() {
    await this.page.getByRole('button', { name: 'Select quote' }).first().click();
  }
}

export class NiCommercialFinalPolicyDetailsPage {
  constructor(private readonly page: Page) {}

  private buildAddressText(prefix: string) {
    const maxLength = 255;
    const filler = `${prefix} AUTOMATION ADDRESS VALIDATION BLOCK `;
    return filler.repeat(Math.ceil(maxLength / filler.length)).slice(0, maxLength);
  }

  private async fillFieldIfVisible(labelPattern: RegExp, value: string) {
    const field = this.page.getByRole('textbox', { name: labelPattern }).first();
    if (await field.isVisible({ timeout: 2500 }).catch(() => false)) {
      await field.scrollIntoViewIfNeeded();
      await field.fill(value);
      return true;
    }
    return false;
  }

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
      .first();

    if (await enterManually.isVisible({ timeout: 2000 }).catch(() => false)) {
      await enterManually.click();
    }

    requiredInputs = this.page.locator('input[required]');
    await expect(requiredInputs.nth(2)).toBeVisible({ timeout: 20000 });
    await requiredInputs.nth(2).fill('52-54 Leadenhall Street');
    await requiredInputs.nth(3).fill('London');
  }

  async fillRequiredDetailsWithLongAddress() {
    let requiredInputs = this.page.locator('input[required]');

    await requiredInputs.nth(0).fill('E2E Test Client');

    const postcodeInput = requiredInputs.nth(1);
    await postcodeInput.fill('EC3A 2BJ');
    await postcodeInput.press('Tab').catch(() => {});

    const enterManually = this.page
      .getByRole('button', { name: /enter manually/i })
      .or(this.page.getByRole('link', { name: /enter manually/i }))
      .first();

    if (await enterManually.isVisible({ timeout: 2000 }).catch(() => false)) {
      await enterManually.click();
    }

    requiredInputs = this.page.locator('input[required]');
    await expect(requiredInputs.nth(2)).toBeVisible({ timeout: 20000 });
    
    // Create a 255 character address for validation
    const longAddress = '52-54 Leadenhall Street Extended Address Building Tower Complex Manor Estate Gardens Park View Road Suite 100 Unit 2 District Centre Commercial Area Industrial Zone Business Park Location Name Place Reference Number Additional Details Information Text London England 12345';
    const addressLine1Value = longAddress.substring(0, 255);
    
    await requiredInputs.nth(2).fill(addressLine1Value);
    await requiredInputs.nth(3).fill('London');
  }

  async fillRequiredDetailsWithAllAddressLinesMax255() {
    let requiredInputs = this.page.locator('input[required]');

    await requiredInputs.nth(0).fill('E2E Test Client');

    const postcodeInput = requiredInputs.nth(1);
    await postcodeInput.fill('EC3A 2BJ');
    await postcodeInput.press('Tab').catch(() => {});

    const enterManually = this.page
      .getByRole('button', { name: /enter manually/i })
      .or(this.page.getByRole('link', { name: /enter manually/i }))
      .first();

    if (await enterManually.isVisible({ timeout: 3000 }).catch(() => false)) {
      await enterManually.click();
    }

    const addressLine1 = this.buildAddressText('ADDRESS LINE 1');
    const addressLine2 = this.buildAddressText('ADDRESS LINE 2');
    const addressLine3 = this.buildAddressText('ADDRESS LINE 3');
    const addressLine4 = this.buildAddressText('ADDRESS LINE 4');
    const cityValue = this.buildAddressText('CITY');

    requiredInputs = this.page.locator('input[required]');
    await expect(requiredInputs.nth(2)).toBeVisible({ timeout: 20000 });
    // Address line 1 is the first manual address field in this NI Commercial flow.
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

    const line2Filled = await this.fillFieldIfVisible(/Address\s*line\s*2/i, addressLine2);
    if (!line2Filled) await tryFillByRequiredIndex(3, addressLine2);

    const line3Filled = await this.fillFieldIfVisible(/Address\s*line\s*3/i, addressLine3);
    if (!line3Filled) await tryFillByRequiredIndex(4, addressLine3);

    const line4Filled = await this.fillFieldIfVisible(/Address\s*line\s*4/i, addressLine4);
    if (!line4Filled) await tryFillByRequiredIndex(5, addressLine4);

    const cityFilled = await this.fillFieldIfVisible(/Town\s*\/\s*city|Town|City/i, cityValue);
    if (!cityFilled) {
      // City is usually the next required field after address lines.
      const cityByIndexFilled = await tryFillByRequiredIndex(3, cityValue)
        || await tryFillByRequiredIndex(4, cityValue)
        || await tryFillByRequiredIndex(5, cityValue)
        || await tryFillByRequiredIndex(6, cityValue);
      if (!cityByIndexFilled) {
        requiredInputs = this.page.locator('input[required]');
        const requiredCount = await requiredInputs.count();
        if (requiredCount > 0) {
          await requiredInputs.nth(requiredCount - 1).fill(cityValue);
        }
      }
    }
  }

  async proceed() {
    await this.page.getByRole('button', { name: 'Proceed' }).click();
  }
}

export class NiCommercialSummaryPage {
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
    // Long address - check for the generated long-address pattern prefix.
    const addressElements = this.page.locator('text=/ADDRESS LINE 1|AUTOMATION ADDRESS VALIDATION BLOCK/i');
    await expect(addressElements.first()).toBeVisible();
    await expect(this.page.getByText('Premium: £')).toBeVisible();
  }

  async proceedToOrder() {
    await this.page.getByRole('button', { name: 'Proceed to order' }).click();
  }
}

export class NiCommercialOrderDialog {
  constructor(private readonly page: Page) {}

  async selectTodayAndOrder() {
    await this.page.getByRole('textbox', { name: 'Confirm policy commencement' }).click();
    await this.page.getByRole('button', { name: 'Today' }).click();
    await expect(this.page.getByRole('button', { name: 'Order now' })).toBeEnabled();
    await this.page.getByRole('button', { name: 'Order now' }).click();
  }
}

export class NiCommercialPolicyIssuedPage {
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
    await logPolicyNumber(policyText, test.info().title, 'NI Commercial').catch(() => {});
  }

  async backToQuoteManager() {
    await this.page.getByRole('button', { name: 'Back to quote manager' }).click();
  }
}
