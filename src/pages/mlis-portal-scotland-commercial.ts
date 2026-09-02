import { expect, Page, test } from '@playwright/test';
import { getMlisPortalUrl } from '../config/env';
import { logPolicyNumber } from '../utils/policy-tracker';

export class ScotlandCommercialLoginPage {
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

export class ScotlandCommercialQuoteManagerPage {
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

  async startCommercialScotlandQuote() {
    const scotlandStartQuoteLink = this.page.getByRole('link', { name: 'Scotland Start quote' }).nth(1);
    await scotlandStartQuoteLink.scrollIntoViewIfNeeded();
    try {
      await scotlandStartQuoteLink.click({ timeout: 20000 });
    } catch {
      const modalCloseButton = this.page.locator('button[title="Close"], .slds-modal__close').first();
      if (await modalCloseButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await modalCloseButton.click();
      }
      await this.page.keyboard.press('Escape').catch(() => undefined);
      await scotlandStartQuoteLink.click({ timeout: 20000, force: true });
    }
    await expect(this.page).toHaveURL(/quoteType=Commercial&jurisdiction=Scotland/, { timeout: 20000 });
  }
}

export class ScotlandCommercialProductSelectionPage {
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

export class ScotlandCommercialStatementsOfFactPage {
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

  async proceed() {
    await this.page.getByRole('button', { name: 'Proceed' }).click();
  }
}

export class ScotlandCommercialQuotesPage {
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

export class ScotlandCommercialFinalPolicyDetailsPage {
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
      .first();

    if (await enterManually.isVisible({ timeout: 2000 }).catch(() => false)) {
      await enterManually.click();
    }

    requiredInputs = this.page.locator('input[required]');
    await expect(requiredInputs.nth(2)).toBeVisible({ timeout: 20000 });
    await requiredInputs.nth(2).fill('52-54 Leadenhall Street');
    await requiredInputs.nth(3).fill('London');
  }

  async proceed() {
    await this.page.getByRole('button', { name: 'Proceed' }).click();
  }
}

export class ScotlandCommercialSummaryPage {
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

  async proceedToOrder() {
    await this.page.getByRole('button', { name: 'Proceed to order' }).click();
  }
}

export class ScotlandCommercialOrderDialog {
  constructor(private readonly page: Page) {}

  async selectTodayAndOrder() {
    await this.page.getByRole('textbox', { name: 'Confirm policy commencement' }).click();
    await this.page.getByRole('button', { name: 'Today' }).click();
    await expect(this.page.getByRole('button', { name: 'Order now' })).toBeEnabled();
    await this.page.getByRole('button', { name: 'Order now' }).click();
  }
}

export class ScotlandCommercialPolicyIssuedPage {
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
    await logPolicyNumber(policyText, test.info().title, 'Scotland Commercial').catch(() => {});
  }

  async backToQuoteManager() {
    await this.page.getByRole('button', { name: 'Back to quote manager' }).click();
  }
}
