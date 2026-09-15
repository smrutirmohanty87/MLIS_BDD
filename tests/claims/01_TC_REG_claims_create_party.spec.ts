import { expect, Locator, Page, test } from '@playwright/test';
import { SalesforcePortalPage } from '../../src/pages/salesforce-cancellation';

function getClaimUserCredentials() {
  const rawEnv = (process.env.TEST_ENV ?? 'UAT2').trim().toUpperCase();
  const envName = rawEnv === 'SIT' ? 'SIT1' : rawEnv;
  const usernameVar = `SALEFORCE_${envName}_CLAIMUSER`;
  const passwordVar = `SALEFORCE_${envName}_CLAIMUSER_PASSWORD`;
  const username = process.env[usernameVar]?.trim();
  const password = process.env[passwordVar]?.trim();

  if (username && password) return { username, password };
  throw new Error(`Missing claim user credentials for ${envName}. Set ${usernameVar} and ${passwordVar} in .env.`);
}

async function pickPartyType(page: Page) {
  const options = page
    .locator('[role="listbox"]:visible [role="option"], [role="listbox"]:visible li, .slds-listbox:visible li')
    .filter({ hasText: /\S+/ })
    .filter({ hasNotText: /^\s*(--\s*Clear\s*--|None)\s*$/i });

  await expect(options.first()).toBeVisible({ timeout: 15000 });
  const preferredOption = options
    .filter({ hasNotText: /No options|Loading/i })
    .first();
  const selectedLabel = ((await preferredOption.textContent()) ?? '').trim();
  await preferredOption.click({ timeout: 10000 });
  return selectedLabel;
}

async function selectPartyType(form: Locator, page: Page) {
  const partyType = form.getByRole('combobox', { name: /^\*?\s*Party Type\b/i }).first();
  await expect(partyType).toBeVisible({ timeout: 30000 });
  await partyType.click({ timeout: 10000 });
  await page.waitForTimeout(400);
  return pickPartyType(page);
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function resolveVisiblePartyNameField(form: Locator, page: Page) {
  const candidates: Locator[] = [
    form.getByLabel(/^\*?\s*Party Name\b/i),
    form.getByRole('combobox', { name: /^\*?\s*Party Name\b/i }),
    form.getByRole('textbox', { name: /^\*?\s*Party Name\b/i }),
    form.locator('label:has-text("Party Name")').locator('xpath=following::input[1]'),
    form.locator('input[aria-label*="Party Name" i], input[placeholder*="Party Name" i], input[name*="party" i][name*="name" i], input[id*="party" i][id*="name" i]'),
    page.locator('input[aria-label*="Party Name" i], input[placeholder*="Party Name" i]').filter({ hasNotText: /^\s*$/ }),
  ];

  for (const candidateSet of candidates) {
    const count = await candidateSet.count();
    for (let index = 0; index < count; index += 1) {
      const candidate = candidateSet.nth(index);
      const isVisible = await candidate.isVisible({ timeout: 500 }).catch(() => false);
      const isEnabled = await candidate.isEnabled({ timeout: 500 }).catch(() => false);
      if (isVisible && isEnabled) {
        return candidate;
      }
    }
  }

  throw new Error('Party Name input was not found as a visible editable field.');
}

async function selectPartyName(form: Locator, page: Page) {
  const searchValues = ['a', 'e', 'i', 'o', 'u', 's', 'r', 'n', 't', 'l', ' '];
  for (const searchValue of searchValues) {
    const partyNameField = await resolveVisiblePartyNameField(form, page);
    await expect(partyNameField).toBeVisible({ timeout: 30000 });
    await expect(partyNameField).toBeEnabled({ timeout: 15000 });
    await partyNameField.scrollIntoViewIfNeeded();

    // Click/focus Party Name first, then trigger lookup with text or space.
    await partyNameField.click({ timeout: 10000, force: true });
    await partyNameField.focus();
    await expect(partyNameField).toBeFocused({ timeout: 5000 }).catch(() => undefined);

    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    if (searchValue === ' ') {
      await partyNameField.press('Space');
    } else {
      await partyNameField.type(searchValue, { delay: 120 });
    }
    await page.waitForTimeout(1000);

    const options = page
      .locator('[role="listbox"]:visible [role="option"], [role="listbox"]:visible li, .slds-listbox:visible li')
      .filter({ hasText: /\S+/ })
      .filter({ hasNotText: /No options|Loading/i });
    await options.first().waitFor({ state: 'visible', timeout: 8000 }).catch(() => undefined);
    const optionCount = await options.count();
    if (optionCount === 0) {
      await page.keyboard.press('Escape').catch(() => undefined);
      continue;
    }

    const matchingOptions = searchValue.trim()
      ? options.filter({ hasText: new RegExp(escapeRegex(searchValue.trim()), 'i') })
      : options;
    const matchingCount = await matchingOptions.count();
    const option = matchingCount > 0 ? matchingOptions.first() : options.first();
    const selectedName = (await option.innerText()).trim();
    await option.click({ timeout: 10000 });
    await expect(partyNameField).toHaveValue(/\S+/, { timeout: 15000 });
    return selectedName;
  }

  throw new Error('Party Name dropdown did not populate after click and input attempts.');
}

async function clickSave(page: Page) {
  const saveButton = page
    .getByRole('button', { name: /^Save$/i })
    .filter({ hasNotText: /Save\s*&\s*New|Save\s+And\s+New/i })
    .last();
  await expect(saveButton).toBeVisible({ timeout: 30000 });
  await saveButton.scrollIntoViewIfNeeded();
  await saveButton.click({ timeout: 10000 });
}

async function attachScreenshot(page: Page, name: string) {
  const screenshotPath = test.info().outputPath(`${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await test.info().attach(name, { path: screenshotPath, contentType: 'image/png' });
}

async function openClaims(page: Page) {
  const navigation = page.getByRole('button', { name: /Show Navigation Menu/i }).first();
  if (await navigation.isVisible({ timeout: 8000 }).catch(() => false)) {
    await navigation.click({ timeout: 10000 });
    await page.getByRole('menuitem', { name: /^Claims$/i }).first().click({ timeout: 10000 });
  } else {
    await page.getByRole('link', { name: /^Claims$/i }).first().click({ timeout: 10000 });
  }
  await expect(page.getByRole('heading', { name: /Claims|Recently Viewed/i }).first()).toBeVisible({ timeout: 60000 });
}

async function waitForClaimsHome(page: Page) {
  await expect(page.getByRole('button', { name: /Show Navigation Menu/i }).first()).toBeVisible({ timeout: 60000 });
  await expect(page.getByRole('heading', { name: /Claims|Recently Viewed/i }).first()).toBeVisible({ timeout: 60000 });
}

async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  const spinner = page.locator('.slds-spinner_container:visible, lightning-spinner:visible').first();
  if (await spinner.isVisible({ timeout: 1500 }).catch(() => false)) {
    await expect(spinner).toBeHidden({ timeout: 60000 });
  }
  await page.waitForTimeout(1500);
}

async function openPartiesSection(page: Page) {
  const partiesCard = getPartiesCard(page);
  await expect(partiesCard).toBeVisible({ timeout: 15000 });
  await partiesCard.scrollIntoViewIfNeeded();
  await expect(partiesCard.getByRole('button', { name: /^New$/i }).first()).toBeVisible({ timeout: 30000 });
  await partiesCard.getByRole('button', { name: /^New$/i }).first().click({ timeout: 10000 });
}

async function ensureClaimInformationTab(page: Page) {
  const claimInformationTab = page.getByRole('tab', { name: /^Claim Information$/i }).first();
  await expect(claimInformationTab).toBeVisible({ timeout: 30000 });
  if ((await claimInformationTab.getAttribute('aria-selected')) !== 'true') {
    await claimInformationTab.click({ timeout: 10000 });
  }
  await expect(claimInformationTab).toHaveAttribute('aria-selected', 'true', { timeout: 30000 });
}

async function closeCurrentWorkspaceTab(page: Page) {
  const closeTab = page.locator('button[aria-label^="Close CLM/"]:visible, button[title^="Close CLM/"]:visible').first();
  if (await closeTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await closeTab.click({ timeout: 10000 });
    await page.waitForTimeout(800);
  }
}

async function openClaimWithParties(page: Page) {
  await openClaims(page);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const claimLinks = page.locator('table a:visible, [role="grid"] a:visible').filter({ hasText: /^CLM\//i });
    await expect(claimLinks.first()).toBeVisible({ timeout: 60000 });
    const claimCount = await claimLinks.count();
    const claimLink = claimLinks.nth((Date.now() + attempt) % claimCount);
    const claimName = (await claimLink.innerText()).trim();
    await claimLink.click({ timeout: 10000 });
    await page.waitForTimeout(1200);

    await ensureClaimInformationTab(page);
    if (await getPartiesCard(page).isVisible({ timeout: 10000 }).catch(() => false)) {
      return claimName;
    }

    await closeCurrentWorkspaceTab(page);
    await openClaims(page);
  }

  throw new Error('Unable to find a claim with a visible Parties section after checking 10 claims.');
}

function getPartiesCard(page: Page) {
  return page
    .locator('article, [role="region"], .slds-card')
    .filter({ hasText: /^Parties(?:\s*\(\d+\))?/im })
    .first();
}

async function openSubmissions(page: Page) {
  const navigation = page.getByRole('button', { name: /Show Navigation Menu/i }).first();
  await expect(navigation).toBeVisible({ timeout: 30000 });
  await navigation.click({ timeout: 10000 });
  await page.getByRole('menuitem', { name: /^Submissions$/i }).first().click({ timeout: 10000 });
  await expect(page.getByRole('heading', { name: /Submissions|Recently Viewed/i }).first()).toBeVisible({ timeout: 60000 });
}

test.describe('@regression | E2E | Claims | Parties', () => {
  test('TC_REG_CLAIMS_PARTY_CREATE | Create a new party from Claims Information and verify it', async ({ page }) => {
    test.setTimeout(600000);
    test.slow();

    await page.context().grantPermissions(['geolocation']);

    const salesforce = new SalesforcePortalPage(page);
    await salesforce.goto();
    const credentials = getClaimUserCredentials();
    await salesforce.login(credentials.username, credentials.password, { useJwt: false, fast: true });
    await salesforce.closeAllWorkspaceTabs();

    await openClaimWithParties(page);
    await openPartiesSection(page);

    const partyForm = page.locator('[role="dialog"]:visible, .slds-modal:visible, form:visible').first();
    const form = await partyForm.isVisible({ timeout: 3000 }).catch(() => false) ? partyForm : page.locator('body');
    await expect(form.getByText(/Claim Party|New Party Information/i).first()).toBeVisible({ timeout: 30000 });

    await selectPartyType(form, page);
    await page.waitForTimeout(1000);
    const partyName = await selectPartyName(form, page);
    await attachScreenshot(page, 'claim-party-form-filled');

    await clickSave(page);
    await waitForPageLoad(page);
    await ensureClaimInformationTab(page);
    const partiesCard = getPartiesCard(page);
    await expect(partiesCard).toBeVisible({ timeout: 30000 });
    await partiesCard.scrollIntoViewIfNeeded();
    await expect(partiesCard.getByText(partyName, { exact: true }).first()).toBeVisible({ timeout: 60000 });
    await attachScreenshot(page, 'claim-party-verified-in-parties');

    await openSubmissions(page);
  });
});