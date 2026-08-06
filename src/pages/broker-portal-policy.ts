import { expect, Page } from '@playwright/test';
import { getMlisPortalUrl } from '../config/env';

export class BrokerPortalPage {
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
    await this.page.getByRole('link', { name: 'Login' }).click();
    await this.expectQuoteManagerLoaded();
  }

  async expectQuoteManagerLoaded() {
    await this.acceptCookiesIfVisible();
    const heading = this.page.getByRole('heading', { name: /Quote manager/i }).first();
    const startQuote = this.page.getByRole('link', { name: /Start quote/i }).first();
    const headingVisible = await heading.isVisible({ timeout: 60000 }).catch(() => false);
    if (!headingVisible) {
      await expect(startQuote).toBeVisible({ timeout: 60000 });
    }
    await this.waitForQuoteTableToStabilize();
  }

  private async isQuoteManagerVisible() {
    const heading = this.page.getByRole('heading', { name: /Quote manager/i }).first();
    const startQuote = this.page.getByRole('link', { name: /Start quote/i }).first();

    return (
      await heading.isVisible({ timeout: 1500 }).catch(() => false)
      || await startQuote.isVisible({ timeout: 1500 }).catch(() => false)
    );
  }

  async acceptCookiesIfVisible() {
    const acceptCookies = this.page.getByRole('button', { name: 'ACCEPT ALL' });
    if (await acceptCookies.isVisible({ timeout: 5000 }).catch(() => false)) {
      await acceptCookies.click();
    }
  }

  async searchPolicy(policyReference: string) {
    const search = this.page.getByRole('textbox', { name: 'Search all fields' });
    await search.fill(policyReference);
    await this.page.getByRole('link', { name: 'Search' }).click();
    await expect(this.getPolicyRow(policyReference)).toBeVisible({ timeout: 60000 });
  }

  async expectPolicyStatus(policyReference: string, expectedStatus: string) {
    const row = this.getPolicyRow(policyReference);
    await expect(row).toContainText(expectedStatus, { timeout: 60000 });
  }

  private async waitForQuoteTableToStabilize() {
    await expect(this.page.getByRole('table')).toBeVisible({ timeout: 60000 });
    const loading = this.page.getByText('Loading...').first();
    if (await loading.isVisible()) {
      await expect(loading).toBeHidden({ timeout: 60000 });
    }
  }

  private getPolicyRow(policyReference: string) {
    return this.page.getByRole('row', { name: new RegExp(policyReference) }).first();
  }
}
