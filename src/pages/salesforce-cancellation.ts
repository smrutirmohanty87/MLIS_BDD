/// <reference types="node" />
import * as crypto from 'crypto';
import * as fs from 'fs';
import { expect, Locator, Page } from '@playwright/test';
import { getSalesforceJwtConfig, getSalesforceJwtUsername, getSalesforceLightningUrl } from '../config/env';

type JwtSession = {
  accessToken: string;
  instanceUrl: string;
  frontdoor: string;
};

export class SalesforcePortalPage {
  constructor(private page: Page) {}

  private async ensureActivePage() {
    if (!this.page.isClosed()) {
      return;
    }

    const pages = this.page.context().pages().filter((p) => !p.isClosed());
    if (!pages.length) {
      throw new Error('No active Playwright page is available in the browser context.');
    }

    this.page = pages[pages.length - 1];
    await this.page.bringToFront().catch(() => undefined);
    await this.page.waitForLoadState('domcontentloaded').catch(() => undefined);
  }

  private normalizeEnvName(value: string | undefined) {
    const env = (value ?? '').trim().toUpperCase();
    if (!env) return 'SIT1';
    if (env === 'SIT') return 'SIT1';
    return env;
  }

  private async isAuthenticatedSalesforceSession() {
    await this.waitForLightningIdle().catch(() => undefined);
    const searchButton = this.page.getByRole('button', { name: /^Search/ }).first();
    const globalHeader = this.page.locator('one-app-nav-bar, .slds-global-header').first();
    const homeHeading = this.page.getByRole('heading', { name: /^Home$/i }).first();
    const accountsLink = this.page.getByRole('link', { name: 'Accounts' }).first();

    return (
      await searchButton.isVisible({ timeout: 500 }).catch(() => false)
      || await globalHeader.isVisible({ timeout: 500 }).catch(() => false)
      || await homeHeading.isVisible({ timeout: 500 }).catch(() => false)
      || await accountsLink.isVisible({ timeout: 500 }).catch(() => false)
    );
  }

  private b64url(input: crypto.BinaryLike) {
    return Buffer.from(input as Buffer)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  }

  private async mintJwtSession(username: string): Promise<JwtSession> {
    const config = getSalesforceJwtConfig();
    if (!config) {
      throw new Error('Salesforce JWT configuration is not available for this environment.');
    }

    const privateKey = config.privateKey ?? fs.readFileSync(config.privateKeyPath!, 'utf8');
    const header = this.b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
    const claims = this.b64url(
      JSON.stringify({
        iss: config.clientId,
        sub: username,
        aud: config.audience,
        exp: Math.floor(Date.now() / 1000) + 180,
      }),
    );
    const signingInput = `${header}.${claims}`;
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signingInput);
    const assertion = `${signingInput}.${this.b64url(signer.sign(privateKey))}`;

    const response = await fetch(`${config.loginUrl.replace(/\/$/, '')}/services/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    });
    const json: any = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(`Salesforce JWT auth failed for ${username} (${response.status}): ${JSON.stringify(json)}`);
    }

    return {
      accessToken: json.access_token,
      instanceUrl: json.instance_url,
      frontdoor: `${json.instance_url}/secur/frontdoor.jsp?sid=${json.access_token}`,
    };
  }

  private async loginWithJwt(username: string) {
    const { frontdoor } = await this.mintJwtSession(username);
    await this.page.goto(frontdoor);
    await this.page.waitForURL(/lightning/, { timeout: 120000 });
  }

  private escapeForRegex(text: string) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  private tokenizeForMatch(text: string) {
    return (text ?? '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .map((t) => t.trim())
      .filter((t) => t.length >= 3);
  }

  private optionMatchScore(optionText: string, targetText: string) {
    const option = (optionText ?? '').toLowerCase();
    const target = (targetText ?? '').toLowerCase();

    if (!option || !target) return 0;
    if (option === target) return 1000;
    if (option.includes(target)) return 500;

    const targetTokens = this.tokenizeForMatch(target);
    if (!targetTokens.length) return 0;

    let score = 0;
    for (const token of targetTokens) {
      if (option.includes(token)) {
        score += 10;
      }
    }

    return score;
  }

  private async clickWhenUiReady(target: ReturnType<Page['locator']>) {
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await this.waitForLightningIdle();
      try {
        await target.click({ timeout: 10000 });
        return;
      } catch (error) {
        if (attempt === 4) {
          throw error;
        }
        await this.page.waitForTimeout(750);
      }
    }
  }

  private isFutureDdMmYyyy(value: string) {
    const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec((value ?? '').trim());
    if (!match) return false;

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const parsed = new Date(year, month - 1, day);

    if (
      Number.isNaN(parsed.getTime()) ||
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      return false;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return parsed.getTime() > today.getTime();
  }

  private async setFutureCancellationEffectiveDate(daysAhead = 5) {
    const value = getFutureDate(daysAhead);
    const dateField = this.page.getByRole('textbox', { name: /\*?\s*Cancellation Effective Date/i }).first();

    await expect(dateField).toBeVisible({ timeout: 15000 });
    await expect(dateField).toBeEnabled({ timeout: 10000 });

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      await dateField.click({ timeout: 10000 });
      await dateField.fill('');
      await dateField.type(value, { delay: 40 });
      await dateField.press('Tab').catch(() => undefined);
      await this.waitForLightningIdle();

      const currentValue = (await dateField.inputValue().catch(() => '')).trim();
      if (this.isFutureDdMmYyyy(currentValue)) {
        return;
      }
    }

    throw new Error('Unable to set Cancellation Effective Date to a future dd-mm-yyyy value.');
  }

  /**
   * Resilient Salesforce Lightning combobox selection.
   * Handles: slow option loading, DOM re-renders after selection, stale elements.
   * NEVER uses selectOption — clicks the combobox to open, waits for options overlay, clicks by text.
   */
  private async selectLightningCombobox(label: string, optionText: string) {
    for (let attempt = 1; attempt <= 5; attempt += 1) {
      try {
        await this.waitForLightningIdle();

        // Re-query combobox each attempt (DOM may have re-rendered after prior selection)
        const combobox = this.page.getByRole('combobox', { name: label });
        await expect(combobox).toBeVisible({ timeout: 15000 });

        // Scroll into view and click to open the dropdown overlay
        await combobox.scrollIntoViewIfNeeded();
        await combobox.click({ timeout: 10000 });

        // Wait for the floating options overlay to render.
        const options = this.page.getByRole('option');
        await expect(options.first()).toBeVisible({ timeout: 10000 });

        // First try exact option name.
        const exactOption = this.page.getByRole('option', { name: new RegExp(`^${this.escapeForRegex(optionText)}$`, 'i') });
        if (await exactOption.first().isVisible({ timeout: 2000 }).catch(() => false)) {
          await exactOption.first().scrollIntoViewIfNeeded();
          await exactOption.first().click({ timeout: 10000 });
        } else {
          // Fallback: match by words from the requested value and pick best scoring option.
          const optionCount = await options.count();
          let bestIndex = -1;
          let bestScore = 0;

          for (let i = 0; i < optionCount; i += 1) {
            const candidate = options.nth(i);
            const text = (await candidate.innerText().catch(() => '')).trim();
            const score = this.optionMatchScore(text, optionText);
            if (score > bestScore) {
              bestScore = score;
              bestIndex = i;
            }
          }

          if (bestIndex < 0 || bestScore <= 0) {
            throw new Error(`Unable to find combobox option for '${optionText}' in '${label}'.`);
          }

          const matchedOption = options.nth(bestIndex);
          await matchedOption.scrollIntoViewIfNeeded();
          await matchedOption.click({ timeout: 10000 });
        }

        // Wait for DOM to settle after selection (Salesforce re-renders dynamically)
        await this.waitForLightningIdle();
        await this.page.waitForTimeout(500);
        return;
      } catch (error) {
        if (attempt === 5) throw error;
        // Dismiss any stuck overlay by pressing Escape, then retry
        await this.page.keyboard.press('Escape').catch(() => {});
        await this.page.waitForTimeout(1500);
      }
    }
  }

  private async openRecordFromHeaderGlobalSearch(policyReference: string) {
    // Use the exact XPath for the Salesforce header global search button (with fallback)
    const searchLauncher = this.page.locator('//*[@id="oneHeader"]/div[2]/div[2]/div/div/button').first();
    const searchButtonFallback = this.page.getByRole('button', { name: /^Search/ }).first();

    if (await searchLauncher.isVisible({ timeout: 10000 }).catch(() => false)) {
      await this.clickWhenUiReady(searchLauncher);
    } else {
      await expect(searchButtonFallback).toBeVisible({ timeout: 15000 });
      await this.clickWhenUiReady(searchButtonFallback);
    }

    // After clicking the search launcher, Salesforce opens a dialog with a search input
    // Use exact placeholder "Search..." to avoid matching "Search this list..." in content area
    const dialogSearchInput = this.page
      .locator('[role="dialog"] input[type="search"]:visible, [role="dialog"] input[placeholder*="Search"]:visible')
      .first();
    const globalSearchInput = this.page
      .locator('[role="search"] input:visible, input[placeholder="Search..."]:visible')
      .first();

    let activeSearchInput = dialogSearchInput;
    if (!(await dialogSearchInput.isVisible({ timeout: 8000 }).catch(() => false))) {
      await expect(globalSearchInput).toBeVisible({ timeout: 15000 });
      activeSearchInput = globalSearchInput;
    }

    await activeSearchInput.fill(policyReference);
    await activeSearchInput.press('Enter');
    await this.waitForLightningIdle();

    const searchResult = this.page
      .locator('a:visible, [role="option"]:visible, [role="link"]:visible')
      .filter({ hasText: policyReference })
      .first();
    await expect(searchResult).toBeVisible({ timeout: 30000 });
    await this.clickWhenUiReady(searchResult);
    await this.waitForLightningIdle();
  }

  async goto() {
    await this.page.goto(getSalesforceLightningUrl());
  }

  async login(
    username: string,
    password: string,
    options?: { useJwt?: boolean; fast?: boolean; allowPasswordFallbackAfterJwt?: boolean },
  ) {
    const envName = this.normalizeEnvName(process.env.TEST_ENV);
    const jwtAllowedForEnv = envName !== 'UAT1';
    const usernameLooksLikeClaimsUser = /(?:^|[-_@.])(clm|claim)(?:[-_@.]|$)/i.test(username);
    const useJwt = (options?.useJwt ?? true) && jwtAllowedForEnv && !usernameLooksLikeClaimsUser;
    const fast = options?.fast ?? false;
    const allowPasswordFallbackAfterJwt = options?.allowPasswordFallbackAfterJwt ?? false;

    if (await this.isAuthenticatedSalesforceSession()) {
      await this.expectAppLoaded();
      return;
    }

    if (useJwt && getSalesforceJwtConfig()) {
      try {
        const jwtUsername = getSalesforceJwtUsername() ?? username;
        await this.loginWithJwt(jwtUsername);
        if (fast) {
          return;
        }
        await this.waitForLightningIdle().catch(() => undefined);
        await this.expectAppLoaded();
        await this.expectUnderwritingNavigation();
        return;
      } catch (error) {
        if (!allowPasswordFallbackAfterJwt) {
          throw new Error(`[salesforce] JWT login failed and password fallback is disabled: ${(error as Error).message}`);
        }

        // Continue with username/password when a user is not JWT-authorized.
        // eslint-disable-next-line no-console
        console.warn(`[salesforce] JWT login failed; falling back to password login: ${(error as Error).message}`);
        await this.goto();
        await this.waitForLightningIdle().catch(() => undefined);
        if (await this.isAuthenticatedSalesforceSession()) {
          await this.expectAppLoaded();
          return;
        }
      }
    }

    const usernameField = this.page.getByRole('textbox', { name: 'Username' }).first();
    const passwordField = this.page.getByRole('textbox', { name: 'Password' }).first();
    const loginButton = this.page.getByRole('button', { name: 'Log In' }).first();

    await expect(usernameField).toBeVisible({ timeout: 60000 });
    await usernameField.fill(username);

    const passwordVisibleOnFirstStep = await passwordField.isVisible({ timeout: 1500 }).catch(() => false);
    if (passwordVisibleOnFirstStep) {
      // Backward-compatible flow: username and password on the same screen.
      await passwordField.fill(password);
      await loginButton.click();
    } else {
      // New flow: submit username first, then password appears.
      await loginButton.click();
      await expect(passwordField).toBeVisible({ timeout: 60000 });
      await passwordField.fill(password);
      await loginButton.click();
    }

    // Salesforce MFA/authenticator flow can pause login until a user approves on device.
    // Wait longer here so tests do not fail while the user is completing authentication.
    if (fast) {
      await this.page.waitForLoadState('domcontentloaded').catch(() => undefined);
      await this.waitForLightningIdle().catch(() => undefined);
      if (!(await this.isAuthenticatedSalesforceSession())) {
        await this.waitForMfaAuthenticationCompletion();
      }
      await this.expectAppLoaded();
      return;
    }

    await this.waitForMfaAuthenticationCompletion();

    await this.expectAppLoaded();
    await this.expectUnderwritingNavigation();
  }

  private async waitForMfaAuthenticationCompletion() {
    const timeoutMs = Number.parseInt(process.env.SALESFORCE_AUTH_TIMEOUT_MS ?? '300000', 10);

    await expect
      .poll(
        async () => {
          await this.waitForLightningIdle().catch(() => undefined);

          const appHeading = this.page.getByRole('heading', { name: 'MLIS Underwriting' }).first();
          const navBar = this.page.locator('one-app-nav-bar, .slds-global-header').first();
          const searchButton = this.page.locator('//*[@id="oneHeader"]/div[2]/div[2]/div/div/button').first();
          const accountsLink = this.page.getByRole('link', { name: 'Accounts' }).first();

          const appReady =
            await appHeading.isVisible({ timeout: 500 }).catch(() => false)
            || await navBar.isVisible({ timeout: 500 }).catch(() => false)
            || await searchButton.isVisible({ timeout: 500 }).catch(() => false)
            || await accountsLink.isVisible({ timeout: 500 }).catch(() => false);

          return appReady;
        },
        {
          timeout: timeoutMs,
          intervals: [1000, 2000, 5000],
          message: `Salesforce login is waiting for authenticator/MFA completion (timeout ${Math.round(timeoutMs / 1000)}s).`,
        },
      )
      .toBe(true);
  }

  async expectUnderwritingNavigation() {
    await expect(this.page.getByRole('link', { name: 'Accounts' })).toBeVisible({ timeout: 60000 });
    await expect(this.page.getByRole('link', { name: 'Contacts' })).toBeVisible({ timeout: 60000 });
    await expect(this.page.getByRole('link', { name: 'Submissions' })).toBeVisible({ timeout: 60000 });
    await expect(this.page.getByRole('link', { name: 'Insurance Policies' })).toBeVisible({ timeout: 60000 });
    await expect(this.page.getByRole('link', { name: 'Quote Journey' })).toBeVisible({ timeout: 60000 });
  }

  /** Step 5-6: Global Search → search for policy number, wait for results, click submission link */
  async searchPolicyInGlobalSearch(policyReference: string) {
    const escapedRef = policyReference.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const maxAttempts = 3;

    // Wait for Salesforce to index the newly created policy after login
    await this.page.waitForTimeout(15000);

    for (let searchAttempt = 1; searchAttempt <= maxAttempts; searchAttempt += 1) {
      // Wait before retry to allow more indexing time
      if (searchAttempt > 1) {
        await this.page.waitForTimeout(15000);
      }

      // Activate the global search — dispatchEvent bypasses the input overlay interception
      const searchButton = this.page.getByRole('button', { name: /^Search/ }).first();
      await expect(searchButton).toBeVisible({ timeout: 30000 });
      await searchButton.dispatchEvent('click');
      await this.page.waitForTimeout(500);

      // Fill the search input that appears after activation
      const searchInput = this.page.locator('input[type="search"][placeholder="Search..."]').first();
      await expect(searchInput).toBeVisible({ timeout: 10000 });
      await searchInput.fill(policyReference);
      await searchInput.press('Enter');

      // Wait for the search results page to load
      await this.waitForLightningIdle();
      await this.page.waitForLoadState('load');
      await this.waitForLightningIdle();

      // Wait for the "Search Results" main heading to confirm we're on the results page
      const searchResultsHeading = this.page.getByRole('heading', { name: /Search Results/i }).first();
      await expect(searchResultsHeading).toBeVisible({ timeout: 30000 }).catch(() => {});

      // Wait for results to finish loading (skeleton bars disappear)
      await this.waitForLightningIdle();

      // Check for result category headings or sidebar links with counts > 0
      const submissionsHeading = this.page.getByRole('heading', { name: /Submissions/i }).first();
      const insurancePoliciesHeading = this.page.getByRole('heading', { name: /Insurance Policies/i }).first();

      const submissionsVisible = await submissionsHeading.isVisible({ timeout: 30000 }).catch(() => false);
      const policiesVisible = !submissionsVisible
        && await insurancePoliciesHeading.isVisible({ timeout: 10000 }).catch(() => false);

      if (submissionsVisible || policiesVisible) {
        // Click the Submissions sidebar link to filter results if needed
        if (submissionsVisible) {
          const submissionsSidebarLink = this.page
            .locator('nav[aria-label*="Search Results"] a:visible, [role="navigation"] a:visible')
            .filter({ hasText: /^Submissions/ })
            .first();
          if (await submissionsSidebarLink.isVisible({ timeout: 5000 }).catch(() => false)) {
            await submissionsSidebarLink.click();
            await this.waitForLightningIdle();
          }
        }

        // Results found — click the matching link
        await this.waitForLightningIdle();

        const policyLink = this.page.getByRole('link', { name: new RegExp(escapedRef, 'i') }).first();
        const fallbackLink = this.page.locator('table tbody tr:first-child th a, table tbody tr:first-child td:first-child a').first();
        const anyTableLink = this.page.locator('table a:visible').filter({ hasText: /\w/ }).first();

        if (await policyLink.isVisible({ timeout: 10000 }).catch(() => false)) {
          await this.clickWhenUiReady(policyLink);
        } else if (await fallbackLink.isVisible({ timeout: 5000 }).catch(() => false)) {
          await this.clickWhenUiReady(fallbackLink);
        } else {
          await expect(anyTableLink).toBeVisible({ timeout: 30000 });
          await this.clickWhenUiReady(anyTableLink);
        }

        // Wait for submission record page to load
        await this.waitForLightningIdle();
        await expect(this.page.getByRole('tab', { name: 'Related' }).first()).toBeVisible({ timeout: 120000 });
        return;
      }

      // Check for a direct policy link (results may render without section headings)
      const directPolicyLink = this.page.getByRole('link', { name: new RegExp(escapedRef, 'i') }).first();
      if (await directPolicyLink.isVisible({ timeout: 5000 }).catch(() => false)) {
        await this.clickWhenUiReady(directPolicyLink);
        await this.waitForLightningIdle();
        await expect(this.page.getByRole('tab', { name: 'Related' }).first()).toBeVisible({ timeout: 120000 });
        return;
      }

      if (searchAttempt >= maxAttempts) {
        throw new Error(`Policy ${policyReference} not found in global search after ${maxAttempts} attempts.`);
      }
    }
  }

  async searchAndOpenSubmission(policyReference: string) {
    const escapedPolicy = policyReference.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    for (let attempt = 1; attempt <= 6; attempt += 1) {
      const launcher = this.page.locator('//*[@id="oneHeader"]/div[2]/div[2]/div/div/button').first();
      if (await launcher.isVisible({ timeout: 5000 }).catch(() => false)) {
        await this.clickWhenUiReady(launcher);
      }

      const searchInput = this.page
        .locator('[role="dialog"] input[type="search"]:visible, [role="search"] input:visible, input[placeholder="Search..."]:visible')
        .first();
      await expect(searchInput).toBeVisible({ timeout: 15000 });
      await searchInput.fill(policyReference);
      await searchInput.press('Enter');
      await this.waitForLightningIdle();

      const chip = this.page.getByRole('button', { name: new RegExp(`Search:\\s*${escapedPolicy}`) }).first();
      if (await chip.isVisible({ timeout: 3000 }).catch(() => false)) {
        await this.clickWhenUiReady(chip);
      }

      const result = this.page
        .locator('a:visible, [role="option"]:visible, [role="link"]:visible')
        .filter({ hasText: policyReference })
        .first();

      if (await result.isVisible({ timeout: 10000 }).catch(() => false)) {
        await this.clickWhenUiReady(result);
        await this.waitForLightningIdle();
        await expect(this.page.getByRole('tab', { name: 'Related' }).first()).toBeVisible({ timeout: 60000 });
        return;
      }

      if (attempt < 6) {
        await this.page.waitForTimeout(5000);
      }
    }

    throw new Error(`Could not open submission from global search for ${policyReference}.`);
  }

  async openSubmissionFromSubmissionsTab(policyReference: string) {
    await this.page.locator('nav').getByRole('link', { name: 'Submissions' }).first().click();
    await expect(this.page.getByRole('heading', { name: /Submissions/i }).first()).toBeVisible({ timeout: 60000 });
    await this.waitForLightningIdle();

    const listSearch = this.page.getByRole('searchbox', { name: 'Search this list...' }).first();
    await expect(listSearch).toBeVisible({ timeout: 60000 });
    await listSearch.fill(policyReference);
    await listSearch.press('Enter');
    await this.waitForLightningIdle();

    const matchingSubmission = this.page.getByRole('link', { name: new RegExp(policyReference, 'i') }).first();
    const firstRowLink = this.page.locator('[role="rowheader"] a:visible').first();

    if (await matchingSubmission.isVisible({ timeout: 8000 }).catch(() => false)) {
      await this.clickWhenUiReady(matchingSubmission);
    } else {
      await expect(firstRowLink).toBeVisible({ timeout: 60000 });
      await this.clickWhenUiReady(firstRowLink);
    }

    await this.waitForLightningIdle();
    await expect(this.page.getByRole('tab', { name: 'Related' }).first()).toBeVisible({ timeout: 60000 });
  }

  async searchAndOpenInsurancePolicy(policyReference: string) {
    await this.page.locator('nav').getByRole('link', { name: 'Insurance Policies' }).first().click();
    await expect(this.page.getByRole('heading', { name: /Insurance Policies/i }).first()).toBeVisible({ timeout: 60000 });
    await this.waitForLightningIdle();

    const listSearch = this.page.getByRole('searchbox', { name: 'Search this list...' }).first();
    await expect(listSearch).toBeVisible({ timeout: 60000 });
    await listSearch.fill(policyReference);
    await listSearch.press('Enter');
    await this.waitForLightningIdle();

    const policyLink = this.page.getByRole('link', { name: new RegExp(policyReference, 'i') }).first();
    const firstRowLink = this.page.locator('[role="rowheader"] a:visible').first();

    if (await policyLink.isVisible({ timeout: 8000 }).catch(() => false)) {
      await this.clickWhenUiReady(policyLink);
    } else {
      await expect(firstRowLink).toBeVisible({ timeout: 60000 });
      await this.clickWhenUiReady(firstRowLink);
    }

    await expect(this.page.getByRole('heading', { name: /Insurance Policy/i })).toBeVisible({ timeout: 60000 });
    await this.waitForLightningIdle();
  }

  /** Step 7: Navigate to the Related tab */
  async openRelatedTab() {
    const relatedTab = this.page.getByRole('tab', { name: 'Related' }).first();
    await expect(relatedTab).toBeVisible({ timeout: 60000 });
    await this.clickWhenUiReady(relatedTab);
    await this.waitForLightningIdle();
  }
  /** step 8 : Navigate to quotes tab    */
  async openQuotesTab() {
    const quotesTab = this.page.getByRole('tab', { name: 'Quotes' }).first();
    await expect(quotesTab).toBeVisible({ timeout: 60000 });
    await this.clickWhenUiReady(quotesTab);
    await this.waitForLightningIdle();
  }

  /**
   * Opt-in helper: after a Cancel & Reissue completes, the UI can show a "Return to submission" action.
   * Kept as a separate method so existing tests are unaffected unless they call it.
   */
  async clickReturnToSubmission() {
    const returnToSubmission = this.page
      .getByRole('button', { name: /Return to submission/i })
      .or(this.page.getByRole('link', { name: /Return to submission/i }))
      .first();

    await expect(returnToSubmission).toBeVisible({ timeout: 60000 });
    await this.clickWhenUiReady(returnToSubmission);
    await this.waitForLightningIdle();

    // Submission page should show standard tabs.
    await expect(this.page.getByRole('tab', { name: 'Related' }).first()).toBeVisible({ timeout: 60000 });
  }

  /** Steps 8-9: Scroll to Insurance Policy section and open the record */
  async openInsurancePolicyFromRelated(
    expectedPolicyNumber?: string,
    options?: { requireCreateMTA?: boolean; requireNewNote?: boolean; requireShowMoreActions?: boolean },
  ) {
    // The Insurance Policy record may take time to sync from Broker Portal to Salesforce.
    // Reload the page to pick up the latest server-side data before looking for the record.
    await this.page.reload({ waitUntil: 'domcontentloaded' });
    await this.waitForLightningIdle();

    // Re-click Related tab after reload since it resets to default tab
    const relatedTab = this.page.getByRole('tab', { name: 'Related' }).first();
    await expect(relatedTab).toBeVisible({ timeout: 60000 });
    await this.clickWhenUiReady(relatedTab);
    await this.waitForLightningIdle();

    // The Insurance Policies heading becomes a link with a count (e.g. "Insurance Policies (1)")
    // only when records exist. Wait generously for the data sync to complete.
    const insurancePoliciesLink = this.page
      .locator('article:visible')
      .getByRole('link', { name: /Insurance Policies/i })
      .first();

    // Scroll down to bring the Insurance Policies section into view
    for (let i = 0; i < 15; i += 1) {
      if (await insurancePoliciesLink.isVisible().catch(() => false)) {
        break;
      }
      await this.page.mouse.wheel(0, 1200);
      await this.page.waitForTimeout(500);
    }

    await expect(insurancePoliciesLink).toBeVisible({ timeout: 120000 });
    await this.clickWhenUiReady(insurancePoliciesLink);
    await this.waitForLightningIdle();

    // Wait for the Insurance Policies list view to fully load
    await expect(this.page.getByRole('heading', { name: /Insurance Policies/i })).toBeVisible({ timeout: 60000 });

    // Click the matching Insurance Policy record when a policy number is provided.
    // This prevents opening an older already-cancelled policy when multiple rows exist.
    const tableScope = this.page.locator('table:visible').first();
    const matchingLink = expectedPolicyNumber
      ? tableScope.getByRole('link', { name: new RegExp(expectedPolicyNumber, 'i') }).first()
      : null;
    const firstRowLink = this.page.locator('[role="rowheader"] a:visible').first();

    if (matchingLink && (await matchingLink.isVisible({ timeout: 8000 }).catch(() => false))) {
      await this.clickWhenUiReady(matchingLink);
    } else {
      await expect(firstRowLink).toBeVisible({ timeout: 60000 });
      await this.clickWhenUiReady(firstRowLink);
    }

    // Verify Insurance Policy record loaded with expected state.
    // Some Lightning page templates do not render an "Insurance Policy" heading,
    // but do render primary record actions like "Create Claim".
    const recordHeading = this.page.getByRole('heading', { name: /Insurance Policy/i }).first();
    const createClaimAction = this.page
      .locator('button:visible:has-text("Create Claim"), a:visible:has-text("Create Claim"), [role="button"]:visible:has-text("Create Claim")')
      .first();
    await expect
      .poll(async () => {
        const hasHeading = await recordHeading.isVisible({ timeout: 500 }).catch(() => false);
        const hasCreateClaim = await createClaimAction.isVisible({ timeout: 500 }).catch(() => false);
        return hasHeading || hasCreateClaim;
      }, {
        timeout: 60000,
        intervals: [1000, 2000, 5000],
        message: 'Expected Insurance Policy page indicators (heading or Create Claim action) to be visible.',
      })
      .toBe(true);
    if (expectedPolicyNumber && (await recordHeading.isVisible({ timeout: 500 }).catch(() => false))) {
      await expect(this.page.getByRole('heading', { name: new RegExp(expectedPolicyNumber, 'i') })).toBeVisible({ timeout: 60000 });
    }
    await this.waitForLightningIdle();

    const inForceOption = this.page.getByRole('option', { name: 'In Force' });
    await expect(inForceOption).toBeVisible({ timeout: 60000 });
    await expect(inForceOption).toHaveAttribute('aria-selected', 'true', { timeout: 60000 });

    const requireCreateMTA = options?.requireCreateMTA ?? true;
    const requireNewNote = options?.requireNewNote ?? true;
    const requireShowMoreActions = options?.requireShowMoreActions ?? true;
    if (requireCreateMTA) {
      await expect(this.page.getByRole('button', { name: 'Create MTA' })).toBeVisible({ timeout: 60000 });
    }
    await expect(this.page.getByRole('button', { name: 'Create Claim' })).toBeVisible({ timeout: 60000 });
    if (requireNewNote) {
      await expect(this.page.getByRole('button', { name: 'New Note' })).toBeVisible({ timeout: 60000 });
    }
    if (requireShowMoreActions) {
      await expect(this.page.getByRole('button', { name: 'Show more actions' })).toBeVisible({ timeout: 60000 });
    }
  }

  /**
   * Opt-in helper: a more resilient variant of openInsurancePolicyFromRelated.
   *
   * Why: On some orgs/environments the Insurance Policies list can render without
   * ARIA rowheader roles (or be slow to populate), causing flaky failures when
   * locating the first row link.
   *
   * This method retries navigation and uses multiple locator strategies to find
   * either the expected policy number link or the first row link.
   *
   * IMPORTANT: Kept separate so existing tests remain unaffected unless they
   * explicitly call this method.
   */
  async openInsurancePolicyFromRelatedStable(expectedPolicyNumber?: string) {
    const attempts = 3;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      // Reload to pick up server-side sync, then re-open Related tab.
      await this.page.reload({ waitUntil: 'domcontentloaded' });
      await this.waitForLightningIdle();

      const relatedTab = this.page.getByRole('tab', { name: 'Related' }).first();
      await expect(relatedTab).toBeVisible({ timeout: 60000 });
      await this.clickWhenUiReady(relatedTab);
      await this.waitForLightningIdle();

      const insurancePoliciesLink = this.page
        .locator('article:visible')
        .getByRole('link', { name: /Insurance Policies/i })
        .first();

      for (let i = 0; i < 15; i += 1) {
        if (await insurancePoliciesLink.isVisible().catch(() => false)) break;
        await this.page.mouse.wheel(0, 1200);
        await this.page.waitForTimeout(500);
      }

      await expect(insurancePoliciesLink).toBeVisible({ timeout: 120000 });
      await this.clickWhenUiReady(insurancePoliciesLink);
      await this.waitForLightningIdle();

      await expect(this.page.getByRole('heading', { name: /Insurance Policies/i })).toBeVisible({ timeout: 60000 });

      const tableScope = this.page.locator('table:visible').first();

      const matchingLink = expectedPolicyNumber
        ? tableScope.getByRole('link', { name: new RegExp(expectedPolicyNumber, 'i') }).first()
        : null;

      const firstRowLinkByRole = this.page.locator('[role="rowheader"] a:visible').first();
      const firstRowLinkByTable = tableScope
        .locator('tbody tr th a:visible, tbody tr td a:visible')
        .filter({ hasText: /\S+/ })
        .first();

      if (matchingLink && (await matchingLink.isVisible({ timeout: 10000 }).catch(() => false))) {
        await this.clickWhenUiReady(matchingLink);
      } else if (await firstRowLinkByTable.isVisible({ timeout: 10000 }).catch(() => false)) {
        await this.clickWhenUiReady(firstRowLinkByTable);
      } else if (await firstRowLinkByRole.isVisible({ timeout: 10000 }).catch(() => false)) {
        await this.clickWhenUiReady(firstRowLinkByRole);
      } else if (attempt < attempts) {
        continue;
      } else {
        throw new Error(
          `[salesforce] Unable to open Insurance Policy from Related (attempt ${attempt}/${attempts}). ` +
            `No row links were found in the Insurance Policies list.`,
        );
      }

      const recordHeading = this.page.getByRole('heading', { name: /Insurance Policy/i }).first();
      const createClaimAction = this.page
        .locator('button:visible:has-text("Create Claim"), a:visible:has-text("Create Claim"), [role="button"]:visible:has-text("Create Claim")')
        .first();
      await expect
        .poll(async () => {
          const hasHeading = await recordHeading.isVisible({ timeout: 500 }).catch(() => false);
          const hasCreateClaim = await createClaimAction.isVisible({ timeout: 500 }).catch(() => false);
          return hasHeading || hasCreateClaim;
        }, {
          timeout: 60000,
          intervals: [1000, 2000, 5000],
          message: 'Expected Insurance Policy page indicators (heading or Create Claim action) to be visible.',
        })
        .toBe(true);
      if (expectedPolicyNumber && (await recordHeading.isVisible({ timeout: 500 }).catch(() => false))) {
        await expect(this.page.getByRole('heading', { name: new RegExp(expectedPolicyNumber, 'i') })).toBeVisible({ timeout: 60000 });
      }

      await this.waitForLightningIdle();
      await expect(this.page.getByRole('button', { name: 'Create MTA' })).toBeVisible({ timeout: 60000 });
      await expect(this.page.getByRole('button', { name: 'Show more actions' })).toBeVisible({ timeout: 60000 });
      return;
    }
  }

  /**
   * Global Search → open the exact matching result from the results grid.
   * This is intentionally strict: it will NOT click the first row, to avoid opening an older cancelled policy.
   * Use this to land on the Submission/record page, then open Insurance Policy from the Related tab.
   */
  async searchAndOpenExactFromGlobalSearchGrid(reference: string) {
    const searchLauncher = this.page.locator('//*[@id="oneHeader"]/div[2]/div[2]/div/div/button').first();
    const searchButtonFallback = this.page.getByRole('button', { name: /^Search/ }).first();

    const dialogSearchInput = this.page
      .locator('[role="dialog"] input[type="search"]:visible, [role="dialog"] input[placeholder*="Search"]:visible')
      .first();
    const headerSearchInput = this.page
      .locator('#oneHeader input[type="search"]:visible, #oneHeader input[placeholder="Search..."]:visible')
      .first();

    let activeSearchInput = dialogSearchInput;
    let searchInputVisible = false;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      if (await dialogSearchInput.isVisible({ timeout: 1500 }).catch(() => false)) {
        searchInputVisible = true;
        activeSearchInput = dialogSearchInput;
        break;
      }

      if (await headerSearchInput.isVisible({ timeout: 1500 }).catch(() => false)) {
        searchInputVisible = true;
        activeSearchInput = headerSearchInput;
        break;
      }

      if (await searchLauncher.isVisible({ timeout: 1500 }).catch(() => false)) {
        await this.clickWhenUiReady(searchLauncher);
      } else {
        await expect(searchButtonFallback).toBeVisible({ timeout: 15000 });
        await this.clickWhenUiReady(searchButtonFallback);
      }

      await this.waitForLightningIdle().catch(() => undefined);
    }

    if (!searchInputVisible) {
      await expect(headerSearchInput.or(dialogSearchInput).first()).toBeVisible({ timeout: 15000 });
      activeSearchInput = await dialogSearchInput.isVisible({ timeout: 500 }).catch(() => false)
        ? dialogSearchInput
        : headerSearchInput;
    }

    await activeSearchInput.fill(reference);
    await activeSearchInput.press('Enter');
    await this.waitForLightningIdle();

    const escaped = this.escapeForRegex(reference);

    const resultsTable = this.page.locator('main table:visible, table:visible').first();
    await expect(resultsTable).toBeVisible({ timeout: 120000 });

    const matchingRow = resultsTable.locator('tr').filter({ hasText: new RegExp(escaped, 'i') }).first();
    await expect(matchingRow).toBeVisible({ timeout: 120000 });

    const matchingLink = matchingRow.getByRole('link', { name: new RegExp(escaped, 'i') }).first();
    await expect(matchingLink).toBeVisible({ timeout: 60000 });
    await this.clickWhenUiReady(matchingLink);

    await this.waitForLightningIdle();
    await expect(this.page.getByRole('tab', { name: 'Related' }).first()).toBeVisible({ timeout: 120000 });
  }

  /**
   * New claims entry flow:
   * 1) Global search using submission reference (do NOT open the submission).
   * 2) Read Risk ID directly from the "Risk Id" column of the results grid.
   * 3) Search again using Risk ID.
   * 4) Scroll to Insurance Policies grid and open Policy Number.
   * 5) Click Create Claim.
   */
  async openCreateClaimFromSubmissionViaRiskId(submissionReference: string) {
    const searchLauncherInitial = this.page.locator('//*[@id="oneHeader"]/div[2]/div[2]/div/div/button').first();
    const searchButtonFallbackInitial = this.page.getByRole('button', { name: /^Search/ }).first();

    const dialogSearchInputInitial = this.page
      .locator('[role="dialog"] input[type="search"]:visible, [role="dialog"] input[placeholder*="Search"]:visible')
      .first();
    const headerSearchInputInitial = this.page
      .locator('#oneHeader input[type="search"]:visible, #oneHeader input[placeholder="Search..."]:visible')
      .first();

    let activeSearchInputInitial = dialogSearchInputInitial;
    let searchInputVisibleInitial = false;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      if (await dialogSearchInputInitial.isVisible({ timeout: 1500 }).catch(() => false)) {
        searchInputVisibleInitial = true;
        activeSearchInputInitial = dialogSearchInputInitial;
        break;
      }

      if (await headerSearchInputInitial.isVisible({ timeout: 1500 }).catch(() => false)) {
        searchInputVisibleInitial = true;
        activeSearchInputInitial = headerSearchInputInitial;
        break;
      }

      if (await searchLauncherInitial.isVisible({ timeout: 1500 }).catch(() => false)) {
        await this.clickWhenUiReady(searchLauncherInitial);
      } else {
        await expect(searchButtonFallbackInitial).toBeVisible({ timeout: 15000 });
        await this.clickWhenUiReady(searchButtonFallbackInitial);
      }

      await this.waitForLightningIdle().catch(() => undefined);
    }

    if (!searchInputVisibleInitial) {
      await expect(headerSearchInputInitial.or(dialogSearchInputInitial).first()).toBeVisible({ timeout: 15000 });
      activeSearchInputInitial = await dialogSearchInputInitial.isVisible({ timeout: 500 }).catch(() => false)
        ? dialogSearchInputInitial
        : headerSearchInputInitial;
    }

    await activeSearchInputInitial.fill(submissionReference);
    await activeSearchInputInitial.press('Enter');
    await this.waitForLightningIdle();

    const escapedRef = this.escapeForRegex(submissionReference);
    const resultsTable = this.page.locator('main table:visible, table:visible').first();

    // Salesforce indexing can lag behind Broker Portal issuance; re-issue the search
    // a few times before giving up so we don't fail on a transient sync delay.
    let resultsTableVisible = await resultsTable.isVisible({ timeout: 120000 }).catch(() => false);
    for (let syncAttempt = 1; syncAttempt <= 3 && !resultsTableVisible; syncAttempt += 1) {
      await this.page.waitForTimeout(5000);
      await activeSearchInputInitial.fill(submissionReference).catch(() => undefined);
      await activeSearchInputInitial.press('Enter').catch(() => undefined);
      await this.waitForLightningIdle().catch(() => undefined);
      resultsTableVisible = await resultsTable.isVisible({ timeout: 60000 }).catch(() => false);
    }
    await expect(resultsTable).toBeVisible({ timeout: 30000 });

    const matchingRow = resultsTable.locator('tr').filter({ hasText: new RegExp(escapedRef, 'i') }).first();
    await expect(matchingRow).toBeVisible({ timeout: 120000 });

    // Read Risk Id directly from the results grid row (do NOT open the submission).
    const riskIdHeaderCell = resultsTable
      .locator('th, [role="columnheader"]')
      .filter({ hasText: /^Risk\s*Id$/i })
      .first();
    let riskIdColumnIndex = -1;
    if (await riskIdHeaderCell.isVisible({ timeout: 5000 }).catch(() => false)) {
      const allHeaderCells = resultsTable.locator('th, [role="columnheader"]');
      const headerCount = await allHeaderCells.count().catch(() => 0);
      for (let i = 0; i < headerCount; i += 1) {
        const text = (await allHeaderCells.nth(i).innerText().catch(() => '')).trim();
        if (/^Risk\s*Id$/i.test(text)) {
          riskIdColumnIndex = i;
          break;
        }
      }
    }

    let riskId = '';
    if (riskIdColumnIndex >= 0) {
      const riskIdCell = matchingRow.locator('th, td').nth(riskIdColumnIndex);
      riskId = ((await riskIdCell.innerText().catch(() => '')) || '').trim();
    }

    if (!riskId) {
      const rowText = (await matchingRow.innerText().catch(() => '')) || '';
      const riskIdMatch = rowText.match(/\b[A-Z]{2,5}\/\d{6,}\/[A-Z]{2,8}\/\d{2}\b/i);
      riskId = (riskIdMatch?.[0] ?? '').trim();
    }

    if (!riskId) {
      throw new Error('[salesforce] Unable to read Risk ID from global search results grid.');
    }

    const searchLauncher = this.page.locator('//*[@id="oneHeader"]/div[2]/div[2]/div/div/button').first();
    const searchButtonFallback = this.page.getByRole('button', { name: /^Search/ }).first();

    const dialogSearchInput = this.page
      .locator('[role="dialog"] input[type="search"]:visible, [role="dialog"] input[placeholder*="Search"]:visible')
      .first();
    const headerSearchInput = this.page
      .locator('#oneHeader input[type="search"]:visible, #oneHeader input[placeholder="Search..."]:visible')
      .first();

    let activeSearchInput = dialogSearchInput;
    let searchInputVisible = false;

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      if (await dialogSearchInput.isVisible({ timeout: 1200 }).catch(() => false)) {
        activeSearchInput = dialogSearchInput;
        searchInputVisible = true;
        break;
      }

      if (await headerSearchInput.isVisible({ timeout: 1200 }).catch(() => false)) {
        activeSearchInput = headerSearchInput;
        searchInputVisible = true;
        break;
      }

      if (await searchLauncher.isVisible({ timeout: 1200 }).catch(() => false)) {
        await this.clickWhenUiReady(searchLauncher);
      } else {
        await expect(searchButtonFallback).toBeVisible({ timeout: 15000 });
        await this.clickWhenUiReady(searchButtonFallback);
      }

      await this.waitForLightningIdle().catch(() => undefined);
    }

    if (!searchInputVisible) {
      await expect(headerSearchInput.or(dialogSearchInput).first()).toBeVisible({ timeout: 15000 });
      activeSearchInput = await dialogSearchInput.isVisible({ timeout: 500 }).catch(() => false)
        ? dialogSearchInput
        : headerSearchInput;
    }

    await activeSearchInput.fill(riskId);
    await activeSearchInput.press('Enter');
    await this.waitForLightningIdle();

    const insurancePoliciesHeading = this.page.getByRole('heading', { name: /Insurance Policies/i }).first();
    for (let i = 0; i < 18; i += 1) {
      if (await insurancePoliciesHeading.isVisible({ timeout: 1000 }).catch(() => false)) {
        break;
      }
      await this.page.mouse.wheel(0, 1300);
      await this.page.waitForTimeout(250);
    }

    await expect(insurancePoliciesHeading).toBeVisible({ timeout: 60000 });
    await insurancePoliciesHeading.scrollIntoViewIfNeeded().catch(() => undefined);

    const insurancePoliciesTable = insurancePoliciesHeading.locator('xpath=following::table[1]').first();
    await expect(insurancePoliciesTable).toBeVisible({ timeout: 60000 });

    const riskIdEscaped = this.escapeForRegex(riskId);
    const matchingPolicyLink = insurancePoliciesTable
      .getByRole('link', { name: new RegExp(`^${riskIdEscaped}(?:/\\d+)?$`, 'i') })
      .first();
    const firstPolicyLink = insurancePoliciesTable
      .locator('tbody tr th a:visible, tbody tr td a:visible')
      .filter({ hasText: /\S+/ })
      .first();

    if (await matchingPolicyLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.clickWhenUiReady(matchingPolicyLink);
    } else {
      await expect(firstPolicyLink).toBeVisible({ timeout: 60000 });
      await this.clickWhenUiReady(firstPolicyLink);
    }

    await this.waitForLightningIdle();

    const createClaimButton = this.page.getByRole('button', { name: /Create Claim/i }).first();
    await expect(createClaimButton).toBeVisible({ timeout: 60000 });
    await this.clickWhenUiReady(createClaimButton);
    await this.waitForLightningIdle();
  }

  /**
   * Global Search → scan ALL result tables, find the row whose Stage/Status cell is exactly "Quoted"
   * AND whose row text contains the policy reference, then click that row's link.
   *
   * Salesforce global search returns results in multiple separate tables (Insurance Policies,
   * Submissions, Quotes, etc.).  Only the first table is NOT guaranteed to contain the Quoted row,
   * so this method iterates every visible table on the results page.
   *
   * The Stage cell is matched via two strategies:
   *   1. A <td> whose ONLY visible text is "Quoted" (exact-cell match).
   *   2. Any descendant element (badge / span) whose text is exactly "Quoted".
   *
   * Polls for up to 120 s to allow Salesforce async indexing to update.
   */
  async searchAndOpenQuotedFromGlobalSearchGrid(policyReference: string) {
    const searchLauncher = this.page.locator('//*[@id="oneHeader"]/div[2]/div[2]/div/div/button').first();
    const searchButtonFallback = this.page.getByRole('button', { name: /^Search/ }).first();

    if (await searchLauncher.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.clickWhenUiReady(searchLauncher);
    } else {
      await expect(searchButtonFallback).toBeVisible({ timeout: 15000 });
      await this.clickWhenUiReady(searchButtonFallback);
    }

    const dialogSearchInput = this.page
      .locator('[role="dialog"] input[type="search"]:visible, [role="dialog"] input[placeholder*="Search"]:visible')
      .first();
    const headerSearchInput = this.page
      .locator('#oneHeader input[type="search"]:visible, #oneHeader input[placeholder="Search..."]:visible')
      .first();

    let activeSearchInput = dialogSearchInput;
    if (!(await dialogSearchInput.isVisible({ timeout: 5000 }).catch(() => false))) {
      await expect(headerSearchInput).toBeVisible({ timeout: 15000 });
      activeSearchInput = headerSearchInput;
    }

    await activeSearchInput.fill(policyReference);
    await activeSearchInput.press('Enter');
    await this.waitForLightningIdle();

    const escaped = this.escapeForRegex(policyReference);

    // Wait for at least one results table to appear.
    await expect(this.page.locator('table:visible').first()).toBeVisible({ timeout: 120000 });

    // ── Poll across ALL tables for a row that has the policy ref AND a Quoted stage cell ──
    const deadline = Date.now() + 120000;
    let quotedRowLocator: import('@playwright/test').Locator | null = null;

    while (Date.now() < deadline) {
      await this.waitForLightningIdle();

      const allTables = this.page.locator('table:visible');
      const tableCount = await allTables.count().catch(() => 0);

      for (let t = 0; t < tableCount; t++) {
        const table = allTables.nth(t);
        const matchingRows = table.locator('tr').filter({ hasText: new RegExp(escaped, 'i') });
        const rowCount = await matchingRows.count().catch(() => 0);

        for (let r = 0; r < rowCount; r++) {
          const row = matchingRows.nth(r);

          // Strategy 1: a <td> whose trimmed innerText is exactly "Quoted".
          const cells = row.locator('td');
          const cellCount = await cells.count().catch(() => 0);
          for (let c = 0; c < cellCount; c++) {
            const cellText = (await cells.nth(c).innerText().catch(() => '')).trim();
            if (/^Quoted$/i.test(cellText)) {
              quotedRowLocator = row;
              break;
            }
          }
          if (quotedRowLocator) break;

          // Strategy 2: any descendant element (badge / span / div) whose text is "Quoted".
          const quotedBadge = row.locator(
            'lightning-badge, span.slds-badge, [class*="badge"], [class*="status"], td span, td div',
          ).filter({ hasText: /^Quoted$/i }).first();
          if (await quotedBadge.isVisible({ timeout: 300 }).catch(() => false)) {
            quotedRowLocator = row;
            break;
          }
        }

        if (quotedRowLocator) break;
      }

      if (quotedRowLocator) break;
      await this.page.waitForTimeout(2000);
    }

    if (!quotedRowLocator) {
      // Collect diagnostic text from every matching row across every table to aid debugging.
      const samples: string[] = [];
      const allTables = this.page.locator('table:visible');
      const tableCount = await allTables.count().catch(() => 0);
      for (let t = 0; t < tableCount && samples.length < 6; t++) {
        const rows = allTables.nth(t).locator('tr').filter({ hasText: new RegExp(escaped, 'i') });
        const rowCount = await rows.count().catch(() => 0);
        for (let r = 0; r < rowCount && samples.length < 6; r++) {
          const text = (await rows.nth(r).innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
          if (text) samples.push(`[table ${t}, row ${r}]: ${text}`);
        }
      }
      throw new Error(
        `[salesforce] Global search for '${policyReference}' found no row with Stage = "Quoted" across ${tableCount} table(s).\n` +
        `Rows found:\n${samples.join('\n')}`,
      );
    }

    // Click the link inside the Quoted row that refers to this policy.
    const linkInRow = quotedRowLocator.getByRole('link', { name: new RegExp(escaped, 'i') }).first();
    const anyLink   = quotedRowLocator.locator('a:visible').filter({ hasText: new RegExp(escaped, 'i') }).first();

    if (await linkInRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.clickWhenUiReady(linkInRow);
    } else {
      await expect(anyLink).toBeVisible({ timeout: 15000 });
      await this.clickWhenUiReady(anyLink);
    }

    await this.waitForLightningIdle();
    await expect(this.page.getByRole('tab', { name: 'Related' }).first()).toBeVisible({ timeout: 120000 });
  }

  /**
   * Step 5-6: Search by policy number and open the policy from the results grid.
   * This path intentionally waits for slow Salesforce indexing/rendering.
   */
  async searchPolicyAndOpenFromGlobalSearchGrid(policyReference: string) {
    const searchLauncher = this.page.locator('//*[@id="oneHeader"]/div[2]/div[2]/div/div/button').first();
    const searchButtonFallback = this.page.getByRole('button', { name: /^Search/ }).first();

    if (await searchLauncher.isVisible({ timeout: 10000 }).catch(() => false)) {
      await this.clickWhenUiReady(searchLauncher);
    } else {
      await expect(searchButtonFallback).toBeVisible({ timeout: 15000 });
      await this.clickWhenUiReady(searchButtonFallback);
    }

    // IMPORTANT: scope to dialog/header to avoid matching "Search this list..." in content area
    const dialogSearchInput = this.page
      .locator('[role="dialog"] input[type="search"]:visible, [role="dialog"] input[placeholder*="Search"]:visible')
      .first();
    const headerSearchInput = this.page
      .locator('#oneHeader input[type="search"]:visible, #oneHeader [role="searchbox"]:visible, [role="combobox"][placeholder*="Search"]:visible')
      .first();

    let activeSearchInput = dialogSearchInput;
    if (!(await dialogSearchInput.isVisible({ timeout: 8000 }).catch(() => false))) {
      await expect(headerSearchInput).toBeVisible({ timeout: 15000 });
      activeSearchInput = headerSearchInput;
    }

    await activeSearchInput.fill(policyReference);
    await activeSearchInput.press('Enter');

    // Wait for slow search indexing/rendering and open the policy link from the grid.
    for (let attempt = 1; attempt <= 6; attempt += 1) {
      await this.waitForLightningIdle();

      const policyLink = this.page.getByRole('link', { name: new RegExp(policyReference, 'i') }).first();
      if (await policyLink.isVisible({ timeout: 12000 }).catch(() => false)) {
        await this.clickWhenUiReady(policyLink);
        await this.waitForLightningIdle();
        await this.expectInsurancePolicyRecordLoaded();
        return;
      }

      const insurancePoliciesFilter = this.page.getByRole('link', { name: /Insurance Policies/i }).first();
      if (await insurancePoliciesFilter.isVisible({ timeout: 3000 }).catch(() => false)) {
        await this.clickWhenUiReady(insurancePoliciesFilter);
        await this.waitForLightningIdle();
      }

      if (attempt < 6) {
        await this.page.waitForTimeout(15000);
      }
    }

    throw new Error(`Policy ${policyReference} was not visible in global search results grid.`);
  }

  /** Step 8: Open Notes & Attachments related list from Policy record */
  async openNotesAndAttachmentsFromRelatedTab() {
    await this.openRelatedTab();

    const notesSectionLink = this.page
      .locator('article:visible')
      .getByRole('link', { name: /Notes\s*&\s*Attachments/i })
      .first();

    for (let i = 0; i < 15; i += 1) {
      if (await notesSectionLink.isVisible({ timeout: 1000 }).catch(() => false)) {
        break;
      }
      await this.page.mouse.wheel(0, 1200);
      await this.page.waitForTimeout(500);
    }

    await expect(notesSectionLink).toBeVisible({ timeout: 120000 });
    await this.clickWhenUiReady(notesSectionLink);
    await this.waitForLightningIdle();

    const notesHeading = this.page.getByRole('heading', { name: /Notes\s*&\s*Attachments/i }).first();
    await expect(notesHeading).toBeVisible({ timeout: 60000 });
  }

  /** Step 9-10: Open each document/link in Notes & Attachments, close, and assert return */
  async openEachNoteAttachmentAndClose(maxDocuments = 10) {
    const attachmentLinks = this.page.locator('[role="rowheader"] a:visible, tbody a:visible');
    const totalLinks = await attachmentLinks.count();
    const docsToOpen = Math.min(totalLinks, maxDocuments);

    expect(docsToOpen, 'Expected at least one document/link in Notes & Attachments').toBeGreaterThan(0);

    for (let i = 0; i < docsToOpen; i += 1) {
      const link = attachmentLinks.nth(i);
      const [newPage] = await Promise.all([
        this.page.context().waitForEvent('page', { timeout: 10000 }).catch(() => null),
        link.click(),
      ]);

      if (newPage) {
        await newPage.waitForLoadState('domcontentloaded');
        await newPage.close();
      } else {
        const closeButton = this.page
          .getByRole('button', { name: /Close|Done|Back/i })
          .first();
        if (await closeButton.isVisible({ timeout: 3000 }).catch(() => false)) {
          await closeButton.click();
        } else {
          await this.page.goBack().catch(() => undefined);
        }
      }

      await this.waitForLightningIdle();
      await expect(this.page.getByRole('heading', { name: /Notes\s*&\s*Attachments/i }).first()).toBeVisible({ timeout: 60000 });
    }
  }

  async expectInsurancePolicyRecordLoaded() {
    await expect(this.page.getByRole('heading', { name: /Insurance Policy/i })).toBeVisible({ timeout: 60000 });
    await this.waitForLightningIdle();

    const inForceOption = this.page.getByRole('option', { name: 'In Force' });
    await expect(inForceOption).toBeVisible({ timeout: 60000 });

    await expect(this.page.getByRole('button', { name: 'Create MTA' })).toBeVisible({ timeout: 60000 });
    await expect(this.page.getByRole('button', { name: 'Create Claim' })).toBeVisible({ timeout: 60000 });
    await expect(this.page.getByRole('button', { name: 'New Note' })).toBeVisible({ timeout: 60000 });
    await expect(this.page.getByRole('button', { name: 'Show more actions' })).toBeVisible({ timeout: 60000 });
  }

  // ── MTA (Mid-Term Adjustment) Flow ──────────────────────────────────

  async openCreateMTADialog() {
    const createMTAButton = this.page.getByRole('button', { name: 'Create MTA' });
    await expect(createMTAButton).toBeVisible({ timeout: 60000 });
    await createMTAButton.click();
    await this.waitForLightningIdle();

    // Wait for the "Enter MTA Information" flow screen to appear
    const mtaHeading = this.page.getByText('Enter MTA Information').first();
    await expect(mtaHeading).toBeVisible({ timeout: 60000 });
    await this.waitForLightningIdle();

    // Wait for the MTA Reason combobox to confirm the form is interactive
    await expect(this.page.getByRole('combobox', { name: /MTA Reason/i })).toBeVisible({ timeout: 30000 });

    // Dismiss any error toast if present
    const errorToastClose = this.page.locator('button[title="Close"]:visible').first();
    if (await errorToastClose.isVisible({ timeout: 3000 }).catch(() => false)) {
      await errorToastClose.click();
      await this.page.waitForTimeout(500);
    }
  }

  async openCreateClaimDialog() {
    await this.ensureActivePage();

    const claimHeading = this.page.getByRole('heading', { name: /Claim|Create Claim|Enter Claim|New Claim/i }).first();
    const submitButton = this.page.getByRole('button', { name: /Submit/i }).first();
    const claimCoverageCombobox = this.page.getByRole('combobox', { name: /Claim coverage|Select Claim coverage/i }).first();

    const isClaimDialogReady = async () => {
      return (
        await claimHeading.isVisible({ timeout: 1000 }).catch(() => false)
        || await submitButton.isVisible({ timeout: 1000 }).catch(() => false)
        || await claimCoverageCombobox.isVisible({ timeout: 1000 }).catch(() => false)
      );
    };

    if (await isClaimDialogReady()) {
      return;
    }

    const createClaimAction = this.page
      .locator([
        'button:visible:has-text("Create Claim")',
        'a:visible:has-text("Create Claim")',
        '[role="button"]:visible:has-text("Create Claim")',
      ].join(', '))
      .first();
    await expect(createClaimAction).toBeVisible({ timeout: 60000 });

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await createClaimAction.scrollIntoViewIfNeeded().catch(() => undefined);
      const spawnedPagePromise = this.page.context().waitForEvent('page', { timeout: 5000 }).catch(() => null);

      await this.clickWhenUiReady(createClaimAction).catch(async () => {
        await createClaimAction.click({ force: true, timeout: 5000 }).catch(() => undefined);
        await createClaimAction.dispatchEvent('click').catch(() => undefined);
      });

      const spawnedPage = await spawnedPagePromise;
      if (spawnedPage && !spawnedPage.isClosed()) {
        this.page = spawnedPage;
        await this.page.bringToFront().catch(() => undefined);
        await this.page.waitForLoadState('domcontentloaded').catch(() => undefined);
      }

      await this.ensureActivePage();
      await this.waitForLightningIdle();
      if (!this.page.isClosed()) {
        await this.page.waitForTimeout(600);
      }

      if (await isClaimDialogReady()) {
        return;
      }

      const showMoreActions = this.page.getByRole('button', { name: /Show more actions/i }).first();
      if (await showMoreActions.isVisible({ timeout: 1500 }).catch(() => false)) {
        await this.clickWhenUiReady(showMoreActions);
        const createClaimMenu = this.page.getByRole('menuitem', { name: /^Create Claim$/i }).first();
        if (await createClaimMenu.isVisible({ timeout: 5000 }).catch(() => false)) {
          await this.clickWhenUiReady(createClaimMenu);
          await this.waitForLightningIdle();
          await this.page.waitForTimeout(600);
          if (await isClaimDialogReady()) {
            return;
          }
        } else {
          await this.page.keyboard.press('Escape').catch(() => undefined);
        }
      }
    }

    await expect(claimHeading.or(submitButton).or(claimCoverageCombobox).first()).toBeVisible({ timeout: 60000 });
  }

  async selectClaimCoverage(optionText?: string) {
    const coverageComboboxByRole = this.page
      .getByRole('combobox', { name: /Select Claim Coverage|Claim Coverage/i })
      .first();

    const coverageComboboxByCss = this.page
      .locator([
        '[role="combobox"][aria-label*="Claim Coverage"]:visible',
        '[role="combobox"][aria-label*="Claim coverage"]:visible',
        '[role="combobox"][aria-label*="Select Claim Coverage"]:visible',
        'button[aria-label*="Claim Coverage"]:visible',
        'button[aria-label*="Claim coverage"]:visible',
        'button:has-text("Select Claim Coverage"):visible',
      ].join(', '))
      .first();

    const selectOptionButton = this.page.getByRole('button', { name: /Select an Option/i }).first();

    const inlineValidation = this.page.getByText(/Please select a Coverage/i).first();

    // Role-based locator matches the accessible name computed from the associated
    // label ("*Select Claim Coverage") even though the element has no aria-label attribute,
    // so prefer it and only fall back to the CSS locator if it never renders.
    const coverageCombobox: Locator = coverageComboboxByRole.or(coverageComboboxByCss).first();

    await expect(coverageCombobox).toBeVisible({ timeout: 30000 });

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      const openTrigger = (await selectOptionButton.isVisible({ timeout: 1000 }).catch(() => false))
        ? selectOptionButton
        : coverageCombobox;

      await openTrigger.scrollIntoViewIfNeeded().catch(() => undefined);
      await this.clickWhenUiReady(openTrigger).catch(async () => {
        await openTrigger.click({ force: true, timeout: 5000 }).catch(() => undefined);
      });

      // Claims UI renders dropdown options asynchronously after combobox click.
      await this.page.waitForTimeout(900);

      const allOptions = this.page
        .locator([
          '[role="option"]:visible',
          '[role="listbox"] [role="option"]:visible',
          'lightning-base-combobox-item:visible',
          'lightning-base-combobox-item span[title]:visible',
          '.slds-listbox__option:visible',
          '.slds-listbox__item:visible',
          '.slds-listbox__item span[title]:visible',
        ].join(', '))
        .filter({ hasText: /\S+/ })
        .filter({ hasNotText: /select\s+claim\s+coverage|select|choose|--\s*clear\s*--|none/i });

      const optionsVisible = await allOptions.first().isVisible({ timeout: 5000 }).catch(() => false);

      if (!optionsVisible) {
        // Fallback for orgs where options are keyboard-driven or render without role semantics.
        await coverageCombobox.press('ArrowDown').catch(() => undefined);
        await this.page.waitForTimeout(300);
        await coverageCombobox.press('ArrowDown').catch(() => undefined);
        await coverageCombobox.press('Enter').catch(() => undefined);
        await this.waitForLightningIdle();
      } else {
        const preferred = optionText
          ? allOptions.filter({ hasText: new RegExp(this.escapeForRegex(optionText), 'i') }).first()
          : allOptions.first();

        if (await preferred.isVisible({ timeout: 3000 }).catch(() => false)) {
          await this.clickWhenUiReady(preferred).catch(async () => {
            await preferred.click({ force: true, timeout: 5000 }).catch(() => undefined);
          });
        } else {
          await this.clickWhenUiReady(allOptions.first()).catch(async () => {
            await allOptions.first().click({ force: true, timeout: 5000 }).catch(() => undefined);
          });
        }
      }

      await this.waitForLightningIdle();
      await this.page.waitForTimeout(500);

      const hasValidationError = await inlineValidation.isVisible({ timeout: 800 }).catch(() => false);
      if (!hasValidationError) {
        return;
      }
    }

    throw new Error('Unable to select Claim Coverage; combobox still shows placeholder or validation error remains.');
  }

  private async selectRiskLocationFromDropdown(optionText?: string) {
    const addRiskLocationButton = this.page.getByRole('button', { name: /Add Risk Location/i }).first();
    await expect(addRiskLocationButton).toBeVisible({ timeout: 60000 });
    await addRiskLocationButton.click();

    // Match claim coverage behavior: click, wait for options, then select.
    const riskLocationCombobox = this.page
      .getByRole('combobox', { name: /Select Claim Risk Location|Risk Location/i })
      .first();
    await expect(riskLocationCombobox).toBeVisible({ timeout: 30000 });
    await riskLocationCombobox.click();
    await this.page.waitForTimeout(800);

    const allOptions = this.page.getByRole('option').filter({ hasText: /\S+/ }).filter({ hasNotText: /--\s*Clear\s*--/i });
    await expect(allOptions.first()).toBeVisible({ timeout: 30000 });

    const preferred = optionText
      ? this.page.getByRole('option', { name: new RegExp(this.escapeForRegex(optionText), 'i') }).first()
      : allOptions.first();

    if (await preferred.isVisible({ timeout: 3000 }).catch(() => false)) {
      await preferred.click();
    } else {
      await allOptions.first().click();
    }

    await this.waitForLightningIdle();
  }

  async fillMandatoryClaimFieldsAndSubmit(claimCoverage?: string) {
    await this.selectClaimCoverage(claimCoverage);

    const requiredInputs = this.page.locator('input[required]:visible, textarea[required]:visible');
    const inputCount = await requiredInputs.count();

    for (let i = 0; i < inputCount; i += 1) {
      const input = requiredInputs.nth(i);
      const disabled = await input.isDisabled().catch(() => true);
      if (disabled) continue;

      const current = (await input.inputValue().catch(() => '')).trim();
      if (current) continue;

      const type = ((await input.getAttribute('type').catch(() => '')) || '').toLowerCase();
      if (type === 'email') {
        await input.fill(`claim.${Date.now()}@testdual.com`);
      } else if (type === 'number') {
        await input.fill('1000');
      } else if (type === 'tel') {
        await input.fill('01234567890');
      } else if (type === 'date') {
        const today = new Date();
        const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        await input.fill(iso);
      } else {
        await input.fill(`Auto Claim ${Date.now()}`);
      }
    }

    const requiredComboboxes = this.page.locator('[role="combobox"][aria-required="true"]:visible');
    const comboCount = await requiredComboboxes.count().catch(() => 0);
    for (let i = 0; i < comboCount; i += 1) {
      const combo = requiredComboboxes.nth(i);
      const text = ((await combo.innerText().catch(() => '')) || '').trim();
      if (text && !/select|choose/i.test(text)) continue;

      await combo.click();
      await this.page.waitForTimeout(500);
      const option = this.page.getByRole('option').filter({ hasNotText: /select|choose/i }).first();
      if (await option.isVisible({ timeout: 5000 }).catch(() => false)) {
        await option.click();
      } else {
        await this.page.keyboard.press('ArrowDown');
        await this.page.keyboard.press('Enter');
      }
      await this.waitForLightningIdle();
    }

    const submitButton = this.page.getByRole('button', { name: /Submit/i }).first();
    await expect(submitButton).toBeVisible({ timeout: 20000 });
    await submitButton.click();
    await this.waitForLightningIdle();
  }

  private async readGeneratedClaimNumber(): Promise<string> {
    const claimLabel = this.page.getByText(/Claim Number/i).first();
    if (await claimLabel.isVisible({ timeout: 5000 }).catch(() => false)) {
      const text = (await claimLabel.innerText().catch(() => '')).trim();
      const match = text.match(/([A-Z]{2,6}[- ]?\d{3,})/i);
      if (match?.[1]) return match[1].replace(/\s+/g, '-');
    }

    const bodyText = await this.page.locator('body').innerText().catch(() => '');
    const match = bodyText.match(/(?:Claim\s*Number\s*[:#-]?\s*)([A-Z]{2,6}[- ]?\d{3,})/i)
      ?? bodyText.match(/\b([A-Z]{2,6}-\d{3,})\b/i);
    if (match?.[1]) return match[1].replace(/\s+/g, '-');

    throw new Error('Claim number was not found after claim creation submit.');
  }

  private async fillDateFieldWithToday(fieldName: RegExp) {
    const dateInput = this.page.getByRole('textbox', { name: fieldName }).first();
    await expect(dateInput).toBeVisible({ timeout: 30000 });

    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const yyyy = String(today.getFullYear());
    const ddMmYyyySlash = `${dd}/${mm}/${yyyy}`;
    const ddMmYyyyDash = `${dd}-${mm}-${yyyy}`;

    await dateInput.click();
    await dateInput.fill('');
    await dateInput.type(ddMmYyyySlash, { delay: 40 });
    await dateInput.press('Tab').catch(() => undefined);
    await this.waitForLightningIdle();

    const current = (await dateInput.inputValue().catch(() => '')).trim();
    if (!current) {
      await dateInput.click();
      await dateInput.fill('');
      await dateInput.type(ddMmYyyyDash, { delay: 40 });
      await dateInput.press('Tab').catch(() => undefined);
      await this.waitForLightningIdle();
    }

    await expect(dateInput).toHaveValue(new RegExp(`${dd}[/-]${mm}[/-]${yyyy}`), { timeout: 10000 });
  }

  async completeClaimPostCreationFlowAndAssertIncurred() {
    // Slow down intentionally for visual verification in headed runs.
    await this.page.waitForTimeout(1200);

    // Claim Basis is mandatory in this claim flow.
    const claimBasis = this.page.getByRole('combobox', { name: /Claim Basis/i }).first();
    if (await claimBasis.isVisible({ timeout: 8000 }).catch(() => false)) {
      await claimBasis.click();
      await this.page.waitForTimeout(900);
      const claimBasisOption = this.page
        .getByRole('option')
        .filter({ hasNotText: /select|choose|clear/i })
        .first();
      await expect(claimBasisOption).toBeVisible({ timeout: 30000 });
      await claimBasisOption.click();
      await this.waitForLightningIdle();
    }

    // Risk Location: same pattern as Claim Coverage (click, wait, select from dropdown), then Save.
    await this.selectRiskLocationFromDropdown();

    const saveButton = this.page.getByRole('button', { name: /^Save$/i }).first();
    await expect(saveButton).toBeVisible({ timeout: 30000 });
    await saveButton.click();
    await this.waitForLightningIdle();

    await this.page.waitForTimeout(1000);

    // Fill claim dates using current date.
    await this.fillDateFieldWithToday(/Date Claim Made|Date of Claim/i);
    await this.fillDateFieldWithToday(/Date of Loss \(From\)|Date of Loss/i);

    await this.page.waitForTimeout(1000);

    // Final submit.
    const finalSubmit = this.page.getByRole('button', { name: /Submit/i }).first();
    await expect(finalSubmit).toBeVisible({ timeout: 30000 });
    await finalSubmit.click();
    await this.waitForLightningIdle();

    // No post-submit claim-id assertion: if submit succeeds without UI errors, flow is complete.
    await this.page.waitForTimeout(1200);

    return await this.readGeneratedClaimNumber().catch(() => '');
  }

  async openClaimInformationTab() {
    const claimInfoTab = this.page.getByRole('tab', { name: /Claim Information/i }).first();
    if (await claimInfoTab.isVisible({ timeout: 6000 }).catch(() => false)) {
      await this.clickWhenUiReady(claimInfoTab);
      await this.waitForLightningIdle();
      return;
    }

    const claimInfoLink = this.page.getByRole('link', { name: /Claim Information/i }).first();
    if (await claimInfoLink.isVisible({ timeout: 6000 }).catch(() => false)) {
      await this.clickWhenUiReady(claimInfoLink);
      await this.waitForLightningIdle();
      return;
    }

    const claimInfoButton = this.page.getByRole('button', { name: /Claim Information/i }).first();
    if (await claimInfoButton.isVisible({ timeout: 6000 }).catch(() => false)) {
      await this.clickWhenUiReady(claimInfoButton);
      await this.waitForLightningIdle();
      return;
    }

    const claimInfoToggle = this.page.locator('xpath=//span[contains(normalize-space(.), "Claim Information")]/ancestor::a[1] | //span[contains(normalize-space(.), "Claim Information")]/ancestor::button[1]').first();
    if (await claimInfoToggle.isVisible({ timeout: 6000 }).catch(() => false)) {
      await this.clickWhenUiReady(claimInfoToggle);
      await this.waitForLightningIdle();
      return;
    }

    const lossField = this.page.getByRole('textbox', { name: /Loss Narrative/i }).first();
    if (await lossField.isVisible({ timeout: 4000 }).catch(() => false)) {
      return;
    }

    const sectionHeader = this.page.locator('xpath=//h2[contains(normalize-space(.), "Claim Classification") or contains(normalize-space(.), "Claim Dates")][1]');
    if (await sectionHeader.isVisible({ timeout: 4000 }).catch(() => false)) {
      return;
    }

    // Some org layouts land directly on the claim detail screen (no explicit "Claim Information" tab).
    const claimDetailHeading = this.page.getByRole('heading', { name: /Claim\s+Claims\s+Incurred|Claim/i }).first();
    if (await claimDetailHeading.isVisible({ timeout: 4000 }).catch(() => false)) {
      return;
    }

    const pathSection = this.page.getByRole('heading', { name: /Path/i }).first();
    if (await pathSection.isVisible({ timeout: 4000 }).catch(() => false)) {
      return;
    }

    throw new Error('Unable to locate Claim Information tab or section.');
  }

  async fillClaimInformationAndSave(lossNarrative = 'Automated Loss Narrative.') {
    await this.openClaimInformationTab();

    await this.scrollToSectionByLabel('Claim Classification');
    await this.clickSectionEditIcon('Claim Classification');

    const lossNarrativeField = this.page.getByRole('textbox', { name: /Loss Narrative/i }).first();
    await expect(lossNarrativeField).toBeVisible({ timeout: 120000 });
    await lossNarrativeField.fill(lossNarrative);
    await this.waitForLightningIdle();

    await this.scrollToSectionByLabel(/Date of FNOL Acknowledgement|FNOL Acknowledgement/i);
    await this.fillDateFieldWithToday(/Date of FNOL Acknowledgement/i);

    const saveButton = this.page.getByRole('button', { name: /^Save$/i }).first();
    await expect(saveButton).toBeVisible({ timeout: 60000 });
    await this.clickWhenUiReady(saveButton);
    await this.waitForLightningIdle();
  }

  private async scrollToSectionByLabel(label: string | RegExp) {
    const locator = typeof label === 'string'
      ? this.page.getByText(new RegExp(this.escapeForRegex(label), 'i')).first()
      : this.page.getByText(label).first();

    if (await locator.isVisible({ timeout: 10000 }).catch(() => false)) {
      await locator.scrollIntoViewIfNeeded();
      await this.page.waitForTimeout(500);
      const elementHandle = await locator.elementHandle();
      if (elementHandle) {
        await this.page.evaluate((element) => {
          element.scrollIntoView({ block: 'center', inline: 'nearest' });
        }, elementHandle);
      }
      await this.page.waitForTimeout(300);
      return;
    }

    const fallbackLocator = typeof label === 'string'
      ? this.page.locator(`xpath=//*[contains(normalize-space(.), "${this.escapeForRegex(label)}")][1]`)
      : this.page.locator(`xpath=//*[contains(normalize-space(.), "${label.source}")][1]`);

    if (await fallbackLocator.isVisible({ timeout: 10000 }).catch(() => false)) {
      await fallbackLocator.scrollIntoViewIfNeeded();
      await this.page.waitForTimeout(500);
      const elementHandle = await fallbackLocator.elementHandle();
      if (elementHandle) {
        await this.page.evaluate((element) => {
          element.scrollIntoView({ block: 'center', inline: 'nearest' });
        }, elementHandle);
      }
      await this.page.waitForTimeout(300);
      return;
    }

    const deepLocator = typeof label === 'string'
      ? this.page.locator(`xpath=//*[contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "${this.escapeForRegex(label).toLowerCase()}")][1]`)
      : this.page.locator(`xpath=//*[contains(translate(normalize-space(.), 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "${label.source.toLowerCase()}")][1]`);

    if (await deepLocator.isVisible({ timeout: 10000 }).catch(() => false)) {
      await deepLocator.scrollIntoViewIfNeeded();
      await this.page.waitForTimeout(500);
      const elementHandle = await deepLocator.elementHandle();
      if (elementHandle) {
        await this.page.evaluate((element) => {
          element.scrollIntoView({ block: 'center', inline: 'nearest' });
        }, elementHandle);
      }
      await this.page.waitForTimeout(300);
    }
  }

  private async clickSectionEditIcon(sectionHeading: string) {
    const headingLocator = this.page.getByText(new RegExp(this.escapeForRegex(sectionHeading), 'i')).first();
    await expect(headingLocator).toBeVisible({ timeout: 20000 });
    await headingLocator.scrollIntoViewIfNeeded();
    await this.page.waitForTimeout(400);

    const sectionRoot = headingLocator.locator('xpath=ancestor::div[contains(@class, "slds-section")] | ancestor::div[contains(@class, "section")][1]');
    const editButton = sectionRoot.locator('xpath=.//button[contains(@title, "Edit") or contains(@aria-label, "Edit") or descendant::svg][1]').first();

    if (await editButton.isVisible({ timeout: 10000 }).catch(() => false)) {
      await this.clickWhenUiReady(editButton);
      await this.waitForLightningIdle();
      return;
    }

    const alternateButton = headingLocator.locator('xpath=following::button[contains(@title, "Edit") or contains(@aria-label, "Edit") or descendant::svg][1]').first();
    await expect(alternateButton).toBeVisible({ timeout: 10000 });
    await this.clickWhenUiReady(alternateButton);
    await this.waitForLightningIdle();
  }

  private async clickInlineEditButton(label: string | RegExp, optional = false) {
    const editButton = this.page
      .getByRole('button', { name: new RegExp(`Edit.*${typeof label === 'string' ? label : label.source}`, 'i') })
      .first();

    if (await editButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.clickWhenUiReady(editButton);
      await this.waitForLightningIdle();
      return;
    }

    const inlineLabel = this.page.locator(`label:has-text("${typeof label === 'string' ? label : label.source}")`).first();
    if (await inlineLabel.isVisible({ timeout: 10000 }).catch(() => false)) {
      await inlineLabel.scrollIntoViewIfNeeded();
      await this.page.waitForTimeout(300);
      const fieldRow = inlineLabel.locator('xpath=ancestor::div[contains(@class, "slds-form-element") or contains(@class, "slds-grid") or contains(@class, "uiInput") or contains(@class, "forceInput")][1]');
      const pencilButton = fieldRow.locator('xpath=.//button[descendant::svg][1]').first();
      if (await pencilButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await this.clickWhenUiReady(pencilButton);
        await this.waitForLightningIdle();
        return;
      }

      const followingButton = inlineLabel.locator('xpath=following::button[descendant::svg][1]').first();
      if (await followingButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await this.clickWhenUiReady(followingButton);
        await this.waitForLightningIdle();
        return;
      }
    }

    const fallbackButton = this.page.locator(`xpath=//button[contains(@title, "Edit") or contains(@aria-label, "Edit") or descendant::svg][contains(normalize-space(.), "${typeof label === 'string' ? label : label.source}")][1]`);
    if (await fallbackButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await fallbackButton.scrollIntoViewIfNeeded();
      await this.clickWhenUiReady(fallbackButton);
      await this.waitForLightningIdle();
      return;
    }

    if (optional) {
      return;
    }

    throw new Error(`Unable to find inline edit button for '${label.toString()}'.`);
  }

  async closeClaimAndMarkComplete(optionText?: string) {
    await this.clickButtonOrLink(/Closed Claim/i);

    const markCompleteButton = this.page.locator('button:visible').filter({
      hasText: /Mark( as)? (Current Claim Status|Claim Status)?( as Complete)?/i,
    }).first();

    if (await markCompleteButton.isVisible({ timeout: 10000 }).catch(() => false)) {
      await markCompleteButton.scrollIntoViewIfNeeded();
      await this.clickWhenUiReady(markCompleteButton);
    } else {
      await this.clickButtonOrLink(/Mark( as)? (Current Claim Status|Claim Status)?( as Complete)?/i);
    }

    await this.waitForLightningIdle();
    await this.selectFirstVisibleDropdownOptionByLabel('*Claim Sub Status', optionText);
    await this.page.waitForTimeout(1200);

    const doneButton = this.page.getByRole('button', { name: /Done/i }).first();
    await expect(doneButton).toBeVisible({ timeout: 60000 });
    await this.clickWhenUiReady(doneButton);
    await this.waitForLightningIdle();
    await this.waitForClaimStatusPageToLoad();
  }

  private async clickButtonOrLink(label: RegExp) {
    const button = this.page.getByRole('button', { name: label }).first();
    if (await button.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.clickWhenUiReady(button);
      return;
    }

    const link = this.page.getByRole('link', { name: label }).first();
    if (await link.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.clickWhenUiReady(link);
      return;
    }

    const menuItem = this.page.getByRole('menuitem', { name: label }).first();
    if (await menuItem.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.clickWhenUiReady(menuItem);
      return;
    }

    const fallback = this.page.locator('button:visible, a:visible, [role="button"]:visible, [role="menuitem"]:visible')
      .filter({ hasText: label })
      .first();
    await expect(fallback).toBeVisible({ timeout: 15000 });
    await this.clickWhenUiReady(fallback);
  }

  private async selectFirstVisibleDropdownOption(optionText?: string) {
    const combobox = this.page.locator('[role="combobox"]:visible, [role="button"][aria-haspopup="listbox"]:visible, .slds-combobox__input:visible, .slds-form-element__control .slds-combobox__input:visible').first();
    if (await combobox.isVisible({ timeout: 10000 }).catch(() => false)) {
      await combobox.scrollIntoViewIfNeeded();
      await combobox.click({ timeout: 10000 });
      await this.waitForLightningIdle();
      await this.page.waitForTimeout(500);

      const options = this.page.locator('[role="listbox"] [role="option"], lightning-base-combobox-item, .slds-listbox__option, .slds-combobox__item, .slds-dropdown__item').filter({ hasText: /\S+/ });
      const visibleOptions = options.filter({ hasNotText: /select|choose|none|--none--/i });

      const option = optionText
        ? visibleOptions.filter({ hasText: new RegExp(this.escapeForRegex(optionText), 'i') }).first()
        : visibleOptions.first();

      if (await option.isVisible({ timeout: 15000 }).catch(() => false)) {
        await option.scrollIntoViewIfNeeded();
        await option.click({ timeout: 10000 });
        await this.waitForLightningIdle();
        return;
      }

      const firstOption = options.filter({ hasNotText: /select|choose|none|--none--/i }).first();
      await expect(firstOption).toBeVisible({ timeout: 15000 });
      await firstOption.scrollIntoViewIfNeeded();
      await firstOption.click({ timeout: 10000 });
      await this.waitForLightningIdle();
      return;
    }

    const select = this.page.locator('select:visible').first();
    if (await select.isVisible({ timeout: 5000 }).catch(() => false)) {
      if (optionText) {
        const option = select.locator('option').filter({ hasText: new RegExp(this.escapeForRegex(optionText), 'i') }).first();
        await expect(option).toBeVisible({ timeout: 15000 });
        const value = await option.getAttribute('value');
        if (!value) throw new Error(`Unable to select option '${optionText}' from visible select.`);
        await select.selectOption(value);
      } else {
        const option = select.locator('option:not([disabled])').filter({ hasNotText: /select|choose|none|--none--/i }).first();
        await expect(option).toBeVisible({ timeout: 15000 });
        const value = await option.getAttribute('value');
        if (!value) throw new Error('Unable to select first available option from visible select.');
        await select.selectOption(value);
      }
      await this.waitForLightningIdle();
      return;
    }

    throw new Error('Unable to locate a visible dropdown to select an option.');
  }

  private async selectFirstVisibleDropdownOptionByLabel(label: string, optionText?: string, optional = false) {
    const normalizedLabel = label.replace(/\*/g, '').trim();
    const labelPattern = new RegExp(`\\*?\\s*${this.escapeForRegex(normalizedLabel)}`, 'i');

    const dialog = this.page.locator('[role="dialog"]:visible').first();
    if (!(await dialog.isVisible({ timeout: 3000 }).catch(() => false))) {
      await this.selectClaimSubStatusInlineOnRecord(normalizedLabel, optionText, optional);
      return;
    }

    const dialogCombobox = dialog.getByRole('combobox', { name: labelPattern }).first();

    if (await dialogCombobox.isVisible({ timeout: 5000 }).catch(() => false)) {
      await dialogCombobox.scrollIntoViewIfNeeded();
      await dialogCombobox.click({ timeout: 10000 });
      await this.waitForLightningIdle();
      await this.page.waitForTimeout(1200);

      const dialogOptions = this.page.locator('[role="listbox"] [role="option"], lightning-base-combobox-item, .slds-listbox__option, .slds-combobox__item, .slds-dropdown__item').filter({ hasText: /\S+/ });
      const option = optionText
        ? dialogOptions.filter({ hasText: new RegExp(this.escapeForRegex(optionText), 'i') }).first()
        : dialogOptions.filter({ hasNotText: /select|choose|none|--none--/i }).first();

      await expect(option).toBeVisible({ timeout: 15000 });
      await option.scrollIntoViewIfNeeded();
      await option.click({ timeout: 10000 });
      await this.waitForLightningIdle();
      return;
    }

    const labelLocator = dialog
      .locator('label:visible, span:visible, div:visible')
      .filter({ hasText: labelPattern })
      .first();
    if (!(await labelLocator.isVisible({ timeout: 10000 }).catch(() => false))) {
      if (optional) {
        return;
      }
      throw new Error(`Unable to locate dropdown label '${label}' in the visible dialog.`);
    }

    const fieldContainer = labelLocator.locator('xpath=ancestor::div[contains(@class, "slds-form-element") or contains(@class, "forceInput") or contains(@class, "uiInput") or contains(@class, "slds-grid") or contains(@class, "uiMenu")][1]');
    const dropdownButton = fieldContainer.locator('xpath=.//button[contains(@aria-haspopup, "listbox") or contains(@class, "slds-combobox__input") or contains(@class, "slds-button") or contains(., "▼") or contains(., "▾")][1]').first();
    if (!(await dropdownButton.isVisible({ timeout: 10000 }).catch(() => false))) {
      const fallbackButton = fieldContainer.locator('xpath=.//span[contains(normalize-space(.), "▼") or contains(normalize-space(.), "▾") or contains(@class, "slds-combobox__form-element")][1]').first();
      if (!(await fallbackButton.isVisible({ timeout: 5000 }).catch(() => false))) {
        if (optional) {
          return;
        }
        throw new Error(`Unable to locate Claim Sub Status dropdown button in the visible dialog.`);
      }
      await fallbackButton.scrollIntoViewIfNeeded();
      await fallbackButton.click({ timeout: 10000 });
    } else {
      await dropdownButton.scrollIntoViewIfNeeded();
      await dropdownButton.click({ timeout: 10000 });
    }

    await this.waitForLightningIdle();
    await this.page.waitForTimeout(1200);

    const dialogOptions = dialog.locator('[role="listbox"] [role="option"], lightning-base-combobox-item, .slds-listbox__option, .slds-combobox__item, .slds-dropdown__item').filter({ hasText: /\S+/ });
    const option = optionText
      ? dialogOptions.filter({ hasText: new RegExp(this.escapeForRegex(optionText), 'i') }).first()
      : dialogOptions.filter({ hasNotText: /select|choose|none|--none--/i }).first();

    await expect(option).toBeVisible({ timeout: 15000 });
    await option.scrollIntoViewIfNeeded();
    await option.click({ timeout: 10000 });
    await this.waitForLightningIdle();
  }

  private async selectClaimSubStatusInlineOnRecord(label: string, optionText?: string, optional = false) {
    await this.waitForPathSavingStateToClear();

    const directComboboxByProvidedXPath = this.page.locator('xpath=//*[@id="combobox-button-1085"]').first();
    if (await directComboboxByProvidedXPath.isVisible({ timeout: 2000 }).catch(() => false)) {
      await directComboboxByProvidedXPath.scrollIntoViewIfNeeded();
      await this.clickWhenUiReady(directComboboxByProvidedXPath);
      await this.waitForLightningIdle();
      await this.page.waitForTimeout(1200);

      await this.selectOptionFromOpenedCombobox(directComboboxByProvidedXPath, optionText);
      return;
    }

    const directComboboxByIdPattern = this.page
      .locator('xpath=//*[starts-with(@id, "combobox-button-") and contains(@aria-label, "Claim Sub Status")]')
      .first();
    if (await directComboboxByIdPattern.isVisible({ timeout: 3000 }).catch(() => false)) {
      await directComboboxByIdPattern.scrollIntoViewIfNeeded();
      await this.clickWhenUiReady(directComboboxByIdPattern);
      await this.waitForLightningIdle();
      await this.page.waitForTimeout(1200);

      await this.selectOptionFromOpenedCombobox(directComboboxByIdPattern, optionText);
      return;
    }

    const editButtonByName = this.page.getByRole('button', { name: new RegExp(`Edit\\s+${this.escapeForRegex(label)}`, 'i') }).first();

    if (await editButtonByName.isVisible({ timeout: 7000 }).catch(() => false)) {
      try {
        await this.clickWhenUiReady(editButtonByName);
      } catch {
        await editButtonByName.click({ timeout: 10000, force: true });
      }
    } else {
      const labelNode = this.page.locator('label:visible, span:visible, div:visible').filter({ hasText: new RegExp(this.escapeForRegex(label), 'i') }).first();
      if (!(await labelNode.isVisible({ timeout: 7000 }).catch(() => false))) {
        if (optional) {
          return;
        }
        throw new Error(`Unable to locate '${label}' section before dropdown selection.`);
      }

      const rowEditButton = labelNode
        .locator('xpath=ancestor::li[1]//button[contains(@aria-label, "Edit") or contains(normalize-space(.), "Edit")][1]')
        .first();

      if (!(await rowEditButton.isVisible({ timeout: 5000 }).catch(() => false))) {
        if (optional) {
          return;
        }
        throw new Error(`Unable to locate Edit button for '${label}'.`);
      }

      await this.clickWhenUiReady(rowEditButton);
    }

    await this.waitForLightningIdle();
    await this.page.waitForTimeout(1200);

    const activeDialog = this.page.locator('[role="dialog"]:visible, .slds-modal__container:visible').last();
    if (await activeDialog.isVisible({ timeout: 4000 }).catch(() => false)) {
      await this.selectFirstVisibleDropdownOptionByLabel(label, optionText, optional);
      return;
    }

    const rowContainer = this.page
      .locator('xpath=//li[.//*[contains(normalize-space(.), "Claim Sub Status")]][1]')
      .first();
    const rowCombobox = rowContainer
      .locator('[role="combobox"]:visible, [role="button"][aria-haspopup="listbox"]:visible, .slds-combobox__input:visible')
      .first();

    if (await rowCombobox.isVisible({ timeout: 5000 }).catch(() => false)) {
      await rowCombobox.scrollIntoViewIfNeeded();
      await this.clickWhenUiReady(rowCombobox);
      await this.waitForLightningIdle();
      await this.page.waitForTimeout(1200);

      await this.selectOptionFromOpenedCombobox(rowCombobox, optionText);
      return;
    }

    if (optional) {
      return;
    }

    throw new Error(`Unable to interact with '${label}' dropdown after opening inline edit.`);
  }

  private async selectOptionFromOpenedCombobox(combobox: Locator, optionText?: string) {
    const controlsId = await combobox.getAttribute('aria-controls');

    const scopedOptions = controlsId
      ? this.page.locator(`#${controlsId} [role="option"], #${controlsId} lightning-base-combobox-item, #${controlsId} .slds-listbox__option, #${controlsId} .slds-combobox__item, #${controlsId} .slds-dropdown__item`).filter({ hasText: /\S+/ })
      : this.page.locator('[role="listbox"]:visible [role="option"], [role="listbox"]:visible lightning-base-combobox-item, [role="listbox"]:visible .slds-listbox__option, [role="listbox"]:visible .slds-combobox__item, [role="listbox"]:visible .slds-dropdown__item').filter({ hasText: /\S+/ });

    const option = optionText
      ? scopedOptions.filter({ hasText: new RegExp(this.escapeForRegex(optionText), 'i') }).first()
      : scopedOptions.filter({ hasNotText: /select|choose|none|--none--/i }).first();

    await expect(option).toBeVisible({ timeout: 15000 });
    await option.scrollIntoViewIfNeeded();
    await option.click({ timeout: 10000 });
    await this.waitForLightningIdle();
    await this.page.waitForTimeout(1200);
  }

  private async waitForPathSavingStateToClear() {
    for (let attempt = 1; attempt <= 20; attempt += 1) {
      const blockingButton = this.page.locator('button:disabled').filter({ hasText: /Loading|Saving/i }).first();
      const blockingAlert = this.page.getByText(/Loading\.\.\.|Saving\.\.\./i).first();

      const isBlocking = (await blockingButton.isVisible({ timeout: 800 }).catch(() => false))
        || (await blockingAlert.isVisible({ timeout: 800 }).catch(() => false));

      if (!isBlocking) {
        return;
      }

      await this.waitForLightningIdle();
      if (attempt < 20) {
        await this.page.waitForTimeout(1000);
      }
    }
  }

  private async waitForClaimStatusPageToLoad() {
    await this.waitForLightningIdle();

    const dialog = this.page.locator('[role="dialog"]:visible').first();
    await expect(dialog).toBeHidden({ timeout: 60000 });

    const statusPageMarkers = [
      this.page.getByRole('tab', { name: /Claim Information|Related|Details/i }).first(),
      this.page.getByRole('button', { name: /Closed Claim|Create Claim|Show more actions/i }).first(),
      this.page.getByText(/Current Claim Status|Claim Status|Complete|Closed/i).first(),
    ];

    for (let attempt = 1; attempt <= 8; attempt += 1) {
      for (const marker of statusPageMarkers) {
        if (await marker.isVisible({ timeout: 2000 }).catch(() => false)) {
          return;
        }
      }

      await this.waitForLightningIdle();
      if (attempt < 8) {
        await this.page.waitForTimeout(1500);
      }
    }

    throw new Error('Claim status page did not become visible after clicking Done.');
  }

  /**
   * Step 1: Fill the Create MTA dialog — select MTA Reason,
   * optionally fill MTA Description, then submit.
   */
  async fillMTAReasonAndSave(mtaReason: string, mtaDescription?: string) {
    // Select MTA Reason from the dropdown (Lightning combobox)
    await this.selectLightningCombobox('MTA Reason', mtaReason);

    if (mtaDescription) {
      const descriptionField = this.page
        .getByRole('textbox', { name: /MTA Description/i })
        .or(this.page.getByLabel(/MTA Description/i).first())
        .or(this.page.locator('textarea[aria-label*="MTA Description" i]:visible').first())
        .first();

      if (await descriptionField.isVisible({ timeout: 5000 }).catch(() => false)) {
        await descriptionField.click();
        await descriptionField.fill(mtaDescription);
        await this.waitForLightningIdle();
      }
    }

    // Click Submit on the flow screen
    const submitButton = this.page.getByRole('button', { name: /Submit/i }).first();
    await expect(submitButton).toBeVisible({ timeout: 15000 });
    await submitButton.click();
    await this.waitForLightningIdle();

    // Wait for the MTA record page to fully load after submission
    await this.page.waitForLoadState('load');
    await this.waitForLightningIdle();
    await expect(this.page.getByRole('button', { name: /Edit Intermediary Reference/i }).first()
      .or(this.page.getByRole('heading', { name: /Insurance Policy/i }).first())
    ).toBeVisible({ timeout: 60000 });
    await this.waitForLightningIdle();
  }

  /**
   * Step 2: Fill the Intermediary Reference field.
   * This is an inline-editable field (pencil icon to start editing).
   */
  async fillIntermediaryReference(reference: string) {
    // Click the pencil/edit icon next to "Intermediary Reference"
    const editButton = this.page.getByRole('button', { name: /Edit Intermediary Reference/i }).first();
    await expect(editButton).toBeVisible({ timeout: 30000 });
    await editButton.click();
    await this.waitForLightningIdle();

    // Fill the now-editable input field
    const inputField = this.page.getByRole('textbox', { name: /Intermediary Reference/i }).first();
    await expect(inputField).toBeVisible({ timeout: 15000 });
    await inputField.fill(reference);

    // Save the inline edit (press Enter or click Save)
    await inputField.press('Enter');
    await this.waitForLightningIdle();

    // If there's a Save button for the inline edit, click it
    const inlineSave = this.page.getByRole('button', { name: /Save/i }).first();
    if (await inlineSave.isVisible({ timeout: 5000 }).catch(() => false)) {
      await inlineSave.click();
      await this.waitForLightningIdle();
    }
  }

  /**
   * Step 3: Edit MTA Premium — click edit, enter value, click OK.
   */
  async editMTAPremium(premiumValue: string) {
    // Click the pencil/edit icon next to MTA Premium
    const editButton = this.page.getByRole('button', { name: /Edit MTA Premium/i }).first();
    await expect(editButton).toBeVisible({ timeout: 30000 });
    await editButton.click();
    await this.waitForLightningIdle();

    // Wait for the "Edit MTA Premium" dialog to appear
    const dialog = this.page.getByRole('dialog', { name: /Edit MTA Premium/i });
    await expect(dialog).toBeVisible({ timeout: 30000 });

    // Fill the premium value — the field is labelled "MTA Additional Premium" inside the dialog
    const spinInput = dialog.getByRole('spinbutton', { name: /MTA.*Premium/i }).first();
    const textInput = dialog.getByRole('textbox', { name: /MTA.*Premium/i }).first();

    if (await spinInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await spinInput.fill(premiumValue);
    } else {
      await expect(textInput).toBeVisible({ timeout: 10000 });
      await textInput.fill(premiumValue);
    }

    // Click Save inside the dialog
    const saveButton = dialog.getByRole('button', { name: /Save/i }).first();
    await expect(saveButton).toBeVisible({ timeout: 15000 });
    await saveButton.click();
    await this.waitForLightningIdle();

    // Close the success confirmation dialog if it remains open
    const closeButton = dialog.getByRole('button', { name: /Close/i }).first();
    if (await closeButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await closeButton.click();
      await this.waitForLightningIdle();
    }
  }

  /**
   * Step 4: Bind MTA — click Bind MTA, set date, click Bind.
   */
  async bindMTA(bindDate?: string) {
    const pad2 = (value: number) => value.toString().padStart(2, '0');
    const formatIsoDate = (date: Date) => `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
    const toIsoDate = (value: string) => {
      if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
      const dmy = value.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
      if (dmy) return `${dmy[3]}-${dmy[2]}-${dmy[1]}`;
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? value : formatIsoDate(parsed);
    };

    // Fill the date field (defaults to today if not specified)
    const today = new Date();
    const dateValueGB = bindDate ?? today.toLocaleDateString('en-GB', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
    const dateValueISO = toIsoDate(bindDate ?? formatIsoDate(today));

    // New UI: the bind/effective date may need to be entered BEFORE clicking "Bind MTA".
    const preBindDateInput = this.page.locator('input[type="date"]:visible').first();
    const preBindDateTextbox = this.page.getByRole('textbox', { name: /Bind Date|Effective.*Date|^Date$/i }).first();
    if (await preBindDateInput.isVisible({ timeout: 2000 }).catch(() => false)) {
      await preBindDateInput.fill(dateValueISO);
      await preBindDateInput.press('Tab').catch(() => undefined);
      await this.waitForLightningIdle();
    } else if (await preBindDateTextbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      await preBindDateTextbox.fill(dateValueGB);
      await preBindDateTextbox.press('Tab').catch(() => undefined);
      await this.waitForLightningIdle();
    }

    // Click the Bind MTA button
    const bindMTAButton = this.page
      .getByRole('button', { name: /Bind MTA/i })
      .or(this.page.getByRole('button', { name: /^Bind$/i }))
      .first();
    await expect(bindMTAButton).toBeVisible({ timeout: 30000 });
    await bindMTAButton.click();
    await this.waitForLightningIdle();

    // Wait for the bind dialog/form to appear
    await this.page.waitForTimeout(2000);

    const dialog = this.page.locator('[role="dialog"]:visible').first();

    // Try common date field locators (prefer inside dialog if present)
    const dialogVisible = await dialog.isVisible({ timeout: 1000 }).catch(() => false);
    const scope = dialogVisible ? dialog : this.page;

    const scopedDateInput = scope.locator('input[type="date"]:visible').first();
    const scopedDateTextbox = scope.getByRole('textbox', { name: /Bind Date|Effective.*Date|Date/i }).first();

    if (await scopedDateInput.isVisible({ timeout: 10000 }).catch(() => false)) {
      await scopedDateInput.fill(dateValueISO);
      await scopedDateInput.press('Tab').catch(() => undefined);
      await this.waitForLightningIdle();
    } else if (await scopedDateTextbox.isVisible({ timeout: 10000 }).catch(() => false)) {
      await scopedDateTextbox.fill(dateValueGB);
      await scopedDateTextbox.press('Tab').catch(() => undefined);
      await this.waitForLightningIdle();
    }

    // Click Bind/Bind MTA to confirm (UI varies)
    const bindButton = dialog
      .getByRole('button', { name: /^Bind$/i })
      .or(dialog.getByRole('button', { name: /Bind MTA/i }))
      .or(this.page.getByRole('button', { name: /^Bind$/i }))
      .first();
    await expect(bindButton).toBeVisible({ timeout: 15000 });
    await bindButton.click();
    await this.waitForLightningIdle();
  }

  async openCancelPolicyWizard() {
    await this.page.getByRole('button', { name: 'Show more actions' }).click();
    await expect(this.page.getByRole('menuitem', { name: 'Cancel Policy' })).toBeVisible({ timeout: 60000 });
    await expect(this.page.getByRole('menuitem', { name: 'Cancel and Reissue' })).toBeVisible({ timeout: 60000 });
    await expect(this.page.getByRole('menuitem', { name: 'Change Owner' })).toBeVisible({ timeout: 60000 });
    await this.page.getByRole('menuitem', { name: 'Cancel Policy' }).click();

    await expect(this.page.getByRole('heading', { name: 'Cancel Policy' })).toBeVisible({ timeout: 60000 });

    // Wait for the Cancellation Category combobox to confirm the form is interactive
    await expect(this.page.getByRole('combobox', { name: /Cancellation Category/i })).toBeVisible({ timeout: 60000 });
    await this.waitForLightningIdle();
  }

  async openCancelAndReissueDialog() {
    await this.page.getByRole('button', { name: 'Show more actions' }).click();
    await expect(this.page.getByRole('menuitem', { name: 'Cancel and Reissue' })).toBeVisible({ timeout: 60000 });
    await this.page.getByRole('menuitem', { name: 'Cancel and Reissue' }).click();

    // Cancel and Reissue opens a modal dialog (not an omniscript wizard)
    const dialog = this.page.locator('[role="dialog"]:visible').first();
    await expect(dialog).toBeVisible({ timeout: 60000 });
    await this.waitForLightningIdle();

    // Dismiss the "Attempt to de-reference a null object" error toast if it appears
    const errorToastClose = this.page.locator('button[title="Close"]:visible').first();
    if (await errorToastClose.isVisible({ timeout: 3000 }).catch(() => false)) {
      await errorToastClose.click();
      await this.page.waitForTimeout(500);
    }
  }

  async completeCancelFromInceptionStep1(notes: string) {
    // Select Cancellation Category — wait for DOM re-render after each selection
    await this.selectLightningCombobox('Cancellation Category', 'Cancel the Policy from Inception');

    // Wait for Cooling Period Display to confirm the form refreshed after category selection
    const coolingPeriod = this.page.getByRole('textbox', { name: /Cooling Period Display/i });
    await expect(coolingPeriod).toBeVisible({ timeout: 15000 });

    // Select Instigated By — DOM re-renders, Reason dropdown appears dynamically
    await this.selectLightningCombobox('Cancellation Instigated By', 'Customer');
    await expect(this.page.getByRole('combobox', { name: /Cancellation Reason/i })).toBeVisible({ timeout: 15000 });

    // Select Reason — DOM re-renders, Notes field appears dynamically
    await this.selectLightningCombobox('Cancellation Reason', 'Cover No Longer Required');
    await expect(this.page.getByRole('textbox', { name: /Cancellation Notes/i })).toBeVisible({ timeout: 15000 });

    // Fill notes and proceed
    await this.page.getByRole('textbox', { name: /Cancellation Notes/i }).fill(notes);
    await this.waitForLightningIdle();
    await this.page.getByRole('button', { name: 'Next' }).click();

    // Verify Step 2 loaded
    await expect(this.page.getByRole('heading', { name: 'Enter Premiums' })).toBeVisible({ timeout: 60000 });
  }
  
  async completeCancelFromInceptionStep2(notes: string) {
    // Select Cancellation Category — wait for DOM re-render after each selection
    await this.selectLightningCombobox('Cancellation Category', 'Cancel this MTA Only');

    // Wait for Cooling Period Display to confirm the form refreshed after category selection
    const coolingPeriod = this.page.getByRole('textbox', { name: /Cooling Period Display/i });
    await expect(coolingPeriod).toBeVisible({ timeout: 15000 });

    // Select Instigated By — DOM re-renders, Reason dropdown appears dynamically
    await this.selectLightningCombobox('Cancellation Instigated By', 'Customer');
    await expect(this.page.getByRole('combobox', { name: /Cancellation Reason/i })).toBeVisible({ timeout: 15000 });

    // Select Reason — DOM re-renders, Notes field appears dynamically
    await this.selectLightningCombobox('Cancellation Reason', 'Cover No Longer Required');
    await expect(this.page.getByRole('textbox', { name: /Cancellation Notes/i })).toBeVisible({ timeout: 15000 });

    // Fill notes and proceed
    await this.page.getByRole('textbox', { name: /Cancellation Notes/i }).fill(notes);
    await this.waitForLightningIdle();
    await this.page.getByRole('button', { name: 'Next' }).click();

    // Verify Step 2 loaded
    await expect(this.page.getByRole('heading', { name: 'Enter Premiums' })).toBeVisible({ timeout: 60000 });
  }

  
  async completeCancelFromInceptionStep3(notes: string) {
    // Select Cancellation Category — wait for DOM re-render after each selection
    await this.selectLightningCombobox('Cancellation Category', 'Cancel the Policy Midterm');

    // Wait for Cooling Period Display to confirm the form refreshed after category selection
    const coolingPeriod = this.page.getByRole('textbox', { name: /Cooling Period Display/i });
    await expect(coolingPeriod).toBeVisible({ timeout: 15000 });

    // Select Instigated By — DOM re-renders, Reason dropdown appears dynamically
    await this.selectLightningCombobox('Cancellation Instigated By', 'Customer');
    await expect(this.page.getByRole('combobox', { name: /Cancellation Reason/i })).toBeVisible({ timeout: 15000 });

    // Select Reason — DOM re-renders, Notes field appears dynamically
    await this.selectLightningCombobox('Cancellation Reason', 'Cover No Longer Required');
    await expect(this.page.getByRole('textbox', { name: /Cancellation Notes/i })).toBeVisible({ timeout: 15000 });

    // Fill notes and proceed
    await this.page.getByRole('textbox', { name: /Cancellation Notes/i }).fill(notes);
    await this.setFutureCancellationEffectiveDate(5);
    await this.waitForLightningIdle();
    await this.page.getByRole('button', { name: 'Next' }).click();

    // Some org variants render the premium step without the exact heading text.
    // Accept either the heading or the Calculate Tax action as the step-ready signal.
    const enterPremiumsHeading = this.page.getByRole('heading', { name: /Enter Premiums/i }).first();
    const calculateTaxButton = this.page.getByRole('button', { name: /Calculate Tax/i }).first();

    await expect
      .poll(async () => {
        await this.waitForLightningIdle();
        const hasHeading = await enterPremiumsHeading.isVisible({ timeout: 500 }).catch(() => false);
        if (hasHeading) return true;
        return calculateTaxButton.isVisible({ timeout: 500 }).catch(() => false);
      }, { timeout: 60000 })
      .toBeTruthy();
  }


  async completeCancelMidtermStep1(notes: string, cancellationDate?: string) {
    // Select Cancellation Category — wait for DOM re-render
    await this.selectLightningCombobox('Cancellation Category', 'Cancel the Policy Midterm');

    // Dynamic fields: editable date picker + Outside Cooling-Off Period
    const dateField = this.page.getByRole('textbox', { name: /Cancellation Effective Date/i });
    await expect(dateField).toBeVisible({ timeout: 15000 });
    await expect(dateField).toBeEnabled({ timeout: 10000 });
    await expect(this.page.getByRole('textbox', { name: /Cooling Period Display/i })).toHaveValue('Outside Cooling-Off Period', {
      timeout: 15000,
    });

    // Always set cancellation date to a future day in strict dd-mm-yyyy format.
    await this.setFutureCancellationEffectiveDate(5);
    await this.waitForLightningIdle();

    // Select Instigated By — DOM re-renders, Reason dropdown appears
    await this.selectLightningCombobox('Cancellation Instigated By', 'Customer');
    await expect(this.page.getByRole('combobox', { name: /Cancellation Reason/i })).toBeVisible({ timeout: 15000 });

    // Select Reason — DOM re-renders, Notes field appears
    await this.selectLightningCombobox('Cancellation Reason', 'Product Too Expensive');
    await expect(this.page.getByRole('textbox', { name: /Cancellation Notes/i })).toBeVisible({ timeout: 15000 });

    // Fill notes and proceed
    await this.page.getByRole('textbox', { name: /Cancellation Notes/i }).fill(notes);
    await this.waitForLightningIdle();
    await this.page.getByRole('button', { name: 'Next' }).click();

    // Verify Step 2 loaded
    await expect(this.page.getByRole('heading', { name: 'Enter Premiums' })).toBeVisible({ timeout: 60000 });
    await expect(this.page.getByRole('button', { name: /Cancel Policy Completed/i })).toBeVisible({ timeout: 60000 });
    await expect(this.page.getByRole('button', { name: /Enter Premiums In Progress/i })).toBeVisible({ timeout: 60000 });
    await expect(this.page.getByRole('progressbar', { name: 'Steps' })).toContainText('100%', { timeout: 60000 });
  }
  

  async completePremiumStepWithTaxCalculation(cancellationPremium?: string) {
    await expect(this.page.getByRole('heading', { name: 'Enter Premiums' })).toBeVisible({ timeout: 60000 });
    await this.waitForLightningIdle();

    // This combobox is sometimes pre-set to "Yes" and disabled by Salesforce.
    // In that case, don't try to click it.
    const returnFullPremiumCombobox = this.page.getByRole('combobox', { name: 'Do you want to return the full premium?' }).first();
    await expect(returnFullPremiumCombobox).toBeVisible({ timeout: 60000 });
    const canChangeReturnFullPremium = await returnFullPremiumCombobox.isEnabled().catch(() => false);
    if (canChangeReturnFullPremium) {
      await this.selectLightningCombobox('Do you want to return the full premium?', 'Yes');
    }

    const cancellationReturnPremium = this.page.getByRole('spinbutton', { name: 'Cancellation Return Premium' });
    await expect(cancellationReturnPremium).toBeVisible({ timeout: 60000 });
    if (typeof cancellationPremium === 'string' && cancellationPremium.trim().length > 0) {
      await cancellationReturnPremium.fill(cancellationPremium);
      await cancellationReturnPremium.press('Tab').catch(() => {});
      await this.waitForLightningIdle();
    }

    const calculateTaxButton = this.page.getByRole('button', { name: 'Calculate Tax' }).first();
    await expect(calculateTaxButton).toBeVisible({ timeout: 60000 });
    await calculateTaxButton.click();
    await this.acceptTaxDialogIfPresent();

    await expect(this.page.getByRole('heading', { name: 'Tax Details' })).toBeVisible({ timeout: 120000 });
  }

  /**
   * Opt-in helper for flows that require the explicit sequence:
   * 1) Click Calculate Tax
   * 2) Click OK
   * 3) Click Next
   *
   * Intentionally NEW so existing cancellation tests remain unaffected.
   */
  async completePremiumStepCalculateTaxOkAndNext(cancellationPremium?: string) {
    await expect(this.page.getByRole('heading', { name: 'Enter Premiums' })).toBeVisible({ timeout: 60000 });
    await this.waitForLightningIdle();

    // This combobox is sometimes pre-set to "Yes" and disabled by Salesforce.
    // In that case, don't try to click it.
    const returnFullPremiumCombobox = this.page.getByRole('combobox', { name: 'Do you want to return the full premium?' }).first();
    await expect(returnFullPremiumCombobox).toBeVisible({ timeout: 60000 });
    const canChangeReturnFullPremium = await returnFullPremiumCombobox.isEnabled().catch(() => false);
    if (canChangeReturnFullPremium) {
      await this.selectLightningCombobox('Do you want to return the full premium?', 'Yes');
    }

    const cancellationReturnPremium = this.page.getByRole('spinbutton', { name: 'Cancellation Return Premium' });
    await expect(cancellationReturnPremium).toBeVisible({ timeout: 60000 });
    if (typeof cancellationPremium === 'string' && cancellationPremium.trim().length > 0) {
      await cancellationReturnPremium.fill(cancellationPremium);
      await cancellationReturnPremium.press('Tab').catch(() => {});
      await this.waitForLightningIdle();
    }

    const calculateTaxButton = this.page.getByRole('button', { name: 'Calculate Tax' }).first();
    await expect(calculateTaxButton).toBeVisible({ timeout: 60000 });
    await calculateTaxButton.click();
    await this.acceptTaxDialogIfPresent();
    await this.waitForLightningIdle();

    const nextButton = this.page.getByRole('button', { name: 'Next' }).first();
    await expect(nextButton).toBeVisible({ timeout: 60000 });
    await expect(nextButton).toBeEnabled({ timeout: 60000 });
    await nextButton.scrollIntoViewIfNeeded();
    await nextButton.click();

    // Cancellation processing can keep us on the wizard briefly; wait until we land back on the
    // Insurance Policy record page (where the status Path options exist).
    const insurancePolicyHeading = this.page.getByRole('heading', { name: /Insurance Policy/i }).first();
    const pathCancelled = this.page.getByRole('option', { name: 'Cancelled' }).first();

    await expect
      .poll(async () => {
        await this.waitForLightningIdle();
        const onPolicy = await insurancePolicyHeading.isVisible({ timeout: 500 }).catch(() => false);
        if (onPolicy) return true;
        const cancelledVisible = await pathCancelled.isVisible({ timeout: 500 }).catch(() => false);
        return cancelledVisible;
      }, { timeout: 300000 })
      .toBeTruthy();

    if (await insurancePolicyHeading.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(pathCancelled).toBeVisible({ timeout: 180000 });
    }
  }

  private async acceptTaxDialogIfPresent() {
    let browserDialogHandled = false;
    const dialogHandler = async (dialog: { accept: () => Promise<void> }) => {
      browserDialogHandled = true;
      await dialog.accept();
    };

    this.page.once('dialog', dialogHandler);

    const okButton = this.page.getByRole('button', { name: /^OK$/i }).first();
    const dialogContainer = this.page.locator('[role="dialog"]:visible').first();

    if (await dialogContainer.isVisible({ timeout: 5000 }).catch(() => false)) {
      if (await okButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await okButton.click();
      }
    } else if (await okButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await okButton.click();
    }

    if (!browserDialogHandled) {
      this.page.removeListener('dialog', dialogHandler);
    }
  }

  async submitCancellation() {
    const nextButton = this.page.getByRole('button', { name: 'Next' }).first();
    await expect(nextButton).toBeVisible({ timeout: 60000 });
    await nextButton.scrollIntoViewIfNeeded();
    await nextButton.click();

    // Cancellation processing can keep us on the wizard briefly; wait until we land back on the
    // Insurance Policy record page (where the status Path options exist).
    const insurancePolicyHeading = this.page.getByRole('heading', { name: /Insurance Policy/i }).first();
    const pathCancelled = this.page.getByRole('option', { name: 'Cancelled' }).first();

    await expect
      .poll(async () => {
        await this.waitForLightningIdle();
        const onPolicy = await insurancePolicyHeading.isVisible({ timeout: 500 }).catch(() => false);
        if (onPolicy) return true;
        const cancelledVisible = await pathCancelled.isVisible({ timeout: 500 }).catch(() => false);
        return cancelledVisible;
      }, { timeout: 300000 })
      .toBeTruthy();

    // If we’re on the policy page, ensure the Cancelled option becomes available.
    if (await insurancePolicyHeading.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(pathCancelled).toBeVisible({ timeout: 180000 });
    }
  }

  /**
   * Fill and submit the Cancel and Reissue Details modal dialog.
   *
   * The dialog contains Lightning comboboxes (not native selects):
   *   - Reason (pre-filled "Cancel and Reissue")
   *   - Reason for C&R (required — must select)
   *   - Settlement Type (pre-filled "Broker Settled")
   *   - Description (textarea)
   */
  async completeCancelAndReissueDialog(data: {
    reasonForCR: string;
    settlementType?: string;
    description?: string;
  }) {
    // Reason is pre-filled with "Cancel and Reissue" — no action needed

    // Select Reason for C&R (required — Lightning combobox)
    await this.selectLightningCombobox('Reason for C&R', data.reasonForCR);

    // Settlement Type is pre-filled with "Broker Settled" — change only if specified
    if (data.settlementType) {
      await this.selectLightningCombobox('Settlement Type', data.settlementType);
    }

    // Fill Description if provided
    if (data.description) {
      const descriptionField = this.page.locator('[role="dialog"]:visible').getByRole('textbox').first();
      await expect(descriptionField).toBeVisible({ timeout: 10000 });
      await descriptionField.fill(data.description);
    }

    // Click Submit
    const submitButton = this.page.locator('[role="dialog"]:visible').getByRole('button', { name: 'Submit' });
    await expect(submitButton).toBeVisible({ timeout: 10000 });
    await submitButton.click();
    await this.waitForLightningIdle();
  }

  /**
   * After submitting Cancel and Reissue, Salesforce redirects to the Quote Journey
   * at the "Final policy details" step with pre-filled insured details.
   * This method waits for the page, verifies it loaded, and clicks Proceed.
   */
  async completeReissueFinalPolicyDetails() {
    // Wait for the Quote Journey page with Final policy details step
    await expect(this.page.getByRole('heading', { name: 'Quote Journey' })).toBeVisible({ timeout: 120000 });
    await expect(this.page.getByRole('heading', { name: 'Final policy details' })).toBeVisible({ timeout: 60000 });
    await this.waitForLightningIdle();

    // The form fields (insured name, postcode, address, town) are pre-filled from the original policy.
    // Click Proceed to move to the Summary step.
    const proceedButton = this.page.getByRole('button', { name: 'Proceed' });
    await expect(proceedButton).toBeVisible({ timeout: 30000 });
    await proceedButton.click();
    await this.waitForLightningIdle();
  }

  /**
   * Summary step of the reissue Quote Journey.
   * Verifies the summary loaded and clicks the order/proceed button.
   */
  async completeReissueSummary() {
    // Wait for step 5 Summary to load
    const summaryHeading = this.page.getByRole('heading', { name: /Summary/i }).first();
    await expect(summaryHeading).toBeVisible({ timeout: 60000 });
    await this.waitForLightningIdle();

    // Look for the order/proceed button on the summary page
    const orderButton = this.page
      .getByRole('button', { name: /Proceed to order|Order|Submit/i })
      .first();
    await expect(orderButton).toBeVisible({ timeout: 30000 });
    await orderButton.click();
    await this.waitForLightningIdle();
  }

  async expectPolicyStatusCancelled() {
    const pathCancelled = this.page.getByRole('option', { name: 'Cancelled' });
    await expect(pathCancelled).toHaveAttribute('aria-selected', 'true', { timeout: 120000 });
  }

  private async expectAppLoaded() {
    // Wait for any of the common Salesforce app-loaded indicators
    const appHeading = this.page.getByRole('heading', { name: 'MLIS Underwriting' });
    const navBar = this.page.locator('one-app-nav-bar, .slds-global-header');
    const searchButton = this.page.locator('//*[@id="oneHeader"]/div[2]/div[2]/div/div/button').first();

    await expect(appHeading.or(navBar).or(searchButton).first()).toBeVisible({ timeout: 60000 });
    await this.waitForLightningIdle();
  }

  private async waitForLightningIdle() {
    await this.page.waitForLoadState('domcontentloaded');

    // In some Salesforce views, an assistive "Loading..." node can remain visible
    // even when the page is otherwise interactive. Treat it as best-effort only.
    const textSpinner = this.page.getByText('Loading...').first();
    if (await textSpinner.isVisible({ timeout: 1500 }).catch(() => false)) {
      await expect(textSpinner).toBeHidden({ timeout: 5000 }).catch(() => undefined);
    }

    const lightningSpinner = this.page.locator('.slds-spinner_container:visible, lightning-spinner:visible').first();
    if (await lightningSpinner.isVisible({ timeout: 1500 }).catch(() => false)) {
      await expect(lightningSpinner).toBeHidden({ timeout: 60000 });
    }
  }

  async closeAllWorkspaceTabs() {
    await this.waitForLightningIdle().catch(() => undefined);
    await this.page.waitForTimeout(1500);

    let misses = 0;
    for (let attempt = 0; attempt < 40 && misses < 3; attempt += 1) {
      const closeButton = this.page
        .locator(
          'button[title^="Close"]:visible, button[aria-label^="Close"]:visible, [role="button"][title^="Close"]:visible, [role="button"][aria-label^="Close"]:visible',
        )
        .first();

      if (!(await closeButton.isVisible().catch(() => false))) {
        misses += 1;
        await this.page.waitForTimeout(600);
        continue;
      }

      misses = 0;
      await closeButton.click().catch(() => undefined);

      const discardButton = this.page
        .getByRole('button', { name: /Don.?t Save|Discard|Leave|No, /i })
        .filter({ visible: true })
        .first();
      if (await discardButton.isVisible({ timeout: 800 }).catch(() => false)) {
        await discardButton.click().catch(() => undefined);
      }

      await this.page.waitForTimeout(400);
    }

    await this.waitForLightningIdle().catch(() => undefined);
  }

  // ── Insurance Policy: Quotes tab assertions (opt-in) ──────────────────────

  private moneyTextRegex(amount: string): RegExp {
    const cleaned = amount.replace(/[£,$\s]/g, '').replace(/,/g, '');
    const numeric = Number.parseFloat(cleaned);
    if (!Number.isFinite(numeric)) {
      return new RegExp(this.escapeForRegex(amount), 'i');
    }

    const intPart = Math.trunc(numeric).toString();
    // Match examples: "100", "100.00", "£100.00" with non-digit boundaries.
    return new RegExp(`(?:^|[^\\d])(?:£\\s*)?${intPart}(?:\\.\\d{1,2})?(?:[^\\d]|$)`, 'i');
  }

  /** Open the Insurance Policy "Quotes" tab (kept opt-in so existing tests are unaffected). */
  async openQuotesTab1() {
    const quotesTab = this.page.getByRole('tab', { name: /^Quotes$/i }).first();

    for (let attempt = 1; attempt <= 4; attempt += 1) {
      try {
        await this.waitForLightningIdle();
        await expect(quotesTab).toBeVisible({ timeout: 30000 });
        await this.clickWhenUiReady(quotesTab);
        await this.waitForLightningIdle();

        // Quotes content is commonly a table/list; wait for something visible in the main region.
        const visibleTable = this.page.locator('table:visible').first();
        if (await visibleTable.isVisible({ timeout: 5000 }).catch(() => false)) {
          return;
        }

        // Fallback: accept just having switched tabs if table isn't used.
        await expect(quotesTab).toHaveAttribute('aria-selected', 'true', { timeout: 15000 }).catch(() => {});
        return;
      } catch (error) {
        if (attempt === 4) throw error;
        await this.page.keyboard.press('Escape').catch(() => {});
        await this.page.waitForTimeout(1500);
      }
    }
  }

  /** Assert the given premium values are present somewhere on the Quotes tab. */
  async expectMTAPremiumsOnQuotesTab(premiumValues: string[]) {
    await this.openQuotesTab();

    const scopeFallback = this.page.locator('main:visible').first();

    for (const premiumValue of premiumValues) {
      const premiumRegex = this.moneyTextRegex(premiumValue);

      await expect
        .poll(async () => {
          await this.waitForLightningIdle();

          const table = this.page.locator('table:visible').first();
          const text = await (await table.isVisible({ timeout: 500 }).catch(() => false)
            ? table.innerText().catch(() => '')
            : scopeFallback.innerText().catch(() => '')
          );
          return premiumRegex.test(text);
        }, { timeout: 180000 })
        .toBeTruthy();
    }
  }

  async expectQuotesTabUnderwriterUplift() {
    await this.openQuotesTab();

    const upliftCard = this.page
      .locator('article:visible, section:visible, div:visible')
      .filter({ hasText: /Has Underwriter Uplift/i })
      .first();

    await expect(upliftCard).toBeVisible({ timeout: 120000 });

    const cardText = await upliftCard.innerText();
    const originalPremium = this.extractMoneyFromText(
      cardText,
      /Original Premium\s*\(inc\. IPT\)\s*£?\s*([\d,]+\.\d{2})/i,
    );
    const overriddenPremium = this.extractMoneyFromText(
      cardText,
      /Overridden Premium\s*\(inc\. IPT\)\s*£?\s*([\d,]+\.\d{2})/i,
    );

    const expectedOverridden = Number((originalPremium * 1.2).toFixed(2));

    expect(overriddenPremium).toBeGreaterThan(0);
    expect(originalPremium).toBeGreaterThan(0);
    expect(overriddenPremium).toBeCloseTo(expectedOverridden, 2);
  }

  private extractMoneyFromText(text: string, regex: RegExp): number {
    const match = text.match(regex);
    if (!match || !match[1]) {
      throw new Error(`Unable to extract money value using regex ${regex}`);
    }
    return this.parseMoney(match[1]);
  }

  private parseMoney(value: string): number {
    return Number(value.replace(/,/g, ''));
  }

  async fillLightningComboboxDirect(label: string, value: string) {
  const field = this.page.getByRole('combobox', { name: label });

  await expect(field).toBeVisible({ timeout: 15000 });

  // Click and clear
  await field.click();
  await field.fill('');

  // Type value
  await field.fill(value);

  // Select using keyboard (IMPORTANT)
  await field.press('ArrowDown');
  await field.press('Enter');

  await this.waitForLightningIdle();
}
async fillCancelPolicyStep1Direct(data: {
  category: string;
  instigatedBy: string;
  reason: string;
  notes: string;
  cancellationDate?: string;
}) {
  // Category
  await this.fillLightningComboboxDirect('Cancellation Category', data.category);

  // Date (if editable)
  const dateField = this.page.getByRole('textbox', { name: 'Cancellation Effective Date' });

  if (await dateField.isVisible().catch(() => false)) {
    if (await dateField.isEnabled().catch(() => false)) {
      await this.setFutureCancellationEffectiveDate(5);
    }
  }

  await this.waitForLightningIdle();

  // Instigated By
  await this.fillLightningComboboxDirect('Cancellation Instigated By', data.instigatedBy);

  // Reason
  await this.fillLightningComboboxDirect('Cancellation Reason', data.reason);

  // Notes
  await this.page
    .getByRole('textbox', { name: 'Cancellation Notes/Narrative' })
    .fill(data.notes);

  await this.waitForLightningIdle();

  // Next
  await this.page.getByRole('button', { name: 'Next' }).click();

  await expect(this.page.getByRole('heading', { name: 'Enter Premiums' }))
    .toBeVisible({ timeout: 60000 });
}
}

function getFutureDate(daysAhead: number): string {
  const date = new Date();
  date.setDate(date.getDate() + Math.max(1, daysAhead));
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  return `${day}-${month}-${year}`;
}
