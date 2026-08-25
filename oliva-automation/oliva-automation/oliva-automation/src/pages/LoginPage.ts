import { expect, Page } from '@playwright/test';

/**
 * Standard Salesforce sandbox login page (`#username` / `#password`).
 * After login the app may deep-link to the last visited page, so callers
 * should always navigate explicitly afterwards.
 */
export class LoginPage {
  constructor(private page: Page) {}

  /**
   * Log in to the SITP sandbox and wait until the Lightning shell is ready
   * (URL contains "lightning" and the global search box or the
   * "Insurance Agent Co" app name is visible).
   */
  async login(username: string, password: string): Promise<void> {
    await this.page.goto('/');

    // This org uses a TWO-STEP branded login (verified live): screen 1 has
    // only Username + "Log In to Sandbox"; the password prompt comes next.
    const usernameInput = this.page
      .locator('#username')
      .or(this.page.getByRole('textbox', { name: 'Username' }))
      .first();
    await usernameInput.fill(username);

    const passwordInput = this.page
      .locator('#password')
      .or(this.page.getByRole('textbox', { name: /Password/i }))
      .or(this.page.locator('input[type="password"]'))
      .first();

    if (!(await passwordInput.isVisible().catch(() => false))) {
      await this.clickLoginButton();
      await passwordInput.waitFor({ state: 'visible', timeout: 30_000 });
    }
    await passwordInput.fill(password);
    await this.clickLoginButton();

    await this.page.waitForURL(/lightning/, { timeout: 120_000 });
    // Verified shell landmarks: global search is a BUTTON ("Search...") and
    // the app name renders as an <h1> heading "Insurance Agent Console".
    const shellReady = this.page
      .getByRole('button', { name: 'Search' })
      .or(this.page.getByRole('heading', { name: /Insurance Agent Console/ }))
      .first();
    await expect(shellReady).toBeVisible({ timeout: 120_000 });
  }

  /** Click whichever login/submit button variant this screen shows. */
  private async clickLoginButton(): Promise<void> {
    const button = this.page
      .getByRole('button', { name: /Log In to Sandbox|Log In|Continue/i })
      .or(this.page.locator('input#Login'))
      .first();
    await button.click();
  }
}
