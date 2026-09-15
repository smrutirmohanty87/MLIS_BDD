import { expect, Page, test } from '@playwright/test';
import { SalesforcePortalPage } from '../../src/pages/salesforce-cancellation';

type ClaimStatus = 'Open Circumstance' | 'Open Claim' | 'Re-Opened Circumstance' | 'Re-Opened Claim';

function getClaimUserCredentials() {
  const rawEnv = (process.env.TEST_ENV ?? 'UAT2').trim().toUpperCase();
  const envName = rawEnv === 'SIT' ? 'SIT1' : rawEnv;
  const username = process.env[`SALEFORCE_${envName}_CLAIMUSER`]?.trim();
  const password = process.env[`SALEFORCE_${envName}_CLAIMUSER_PASSWORD`]?.trim();

  if (username && password) return { username, password };
  throw new Error(`Missing claim user credentials for ${envName}.`);
}

async function closeClaimsRelatedListError(page: Page) {
  const toast = page
    .locator('.slds-notify_toast:visible, [role="alert"]:visible')
    .filter({ hasText: /couldn'?t load this related list|try viewing all records again/i })
    .first();

  if (!(await toast.isVisible({ timeout: 2500 }).catch(() => false))) return;

  const closeButton = toast
    .locator('button[title*="Close" i], button[aria-label*="Close" i], button')
    .first();
  if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await closeButton.click({ timeout: 5000 });
  } else {
    await page.keyboard.press('Escape').catch(() => undefined);
  }
}

async function openClaims(page: Page) {
  const navigation = page.getByRole('button', { name: /Show Navigation Menu/i }).first();
  if (await navigation.isVisible({ timeout: 8000 }).catch(() => false)) {
    await navigation.click({ timeout: 10000 });
    await page.getByRole('menuitem', { name: /^Claims$/i }).first().click({ timeout: 10000 });
  } else {
    await page.getByRole('link', { name: /^Claims$/i }).first().click({ timeout: 10000 });
  }

  await closeClaimsRelatedListError(page);
  await expect(page.getByRole('heading', { name: /Claims|Recently Viewed/i }).first()).toBeVisible({ timeout: 60000 });
}

async function searchClaims(page: Page, status: ClaimStatus) {
  const searchInput = page
    .locator('input[placeholder*="Search" i]:visible, input[aria-label*="Search" i]:visible, [role="searchbox"]:visible')
    .first();
  await expect(searchInput).toBeVisible({ timeout: 30000 });
  await searchInput.click({ timeout: 10000, force: true });
  await searchInput.fill(status);
  await searchInput.press('Enter').catch(() => undefined);
  await page.waitForTimeout(1200);

  const claimLink = page
    .locator('table a:visible, [role="grid"] a:visible')
    .filter({ hasText: /^CLM\//i })
    .first();
  await expect(claimLink).toBeVisible({ timeout: 30000 });
  const claimId = ((await claimLink.innerText()) ?? '').trim();
  await claimLink.click({ timeout: 10000 });
  await page.waitForLoadState('domcontentloaded');

  const claimHeading = page.getByRole('heading', { name: /Claims Incurred|Claim/i }).first();
  await expect(claimHeading).toBeVisible({ timeout: 60000 });
  return claimId;
}

async function openClaimFinancials(page: Page) {
  const directTab = page
    .getByRole('tab', { name: /^Claim Financials$/i })
    .first()
    .or(page.getByRole('link', { name: /^Claim Financials$/i }).first())
    .or(page.getByRole('button', { name: /^Claim Financials$/i }).first());

  if (await directTab.isVisible({ timeout: 5000 }).catch(() => false)) {
    await directTab.click({ timeout: 10000, force: true });
  } else {
    const textTab = page
      .locator('a:visible, button:visible, span:visible, div[role="tab"]:visible')
      .filter({ hasText: /^Claim Financials$/i })
      .first();
    await expect(textTab).toBeVisible({ timeout: 15000 });
    await textTab.click({ timeout: 10000, force: true });
  }

  await expect(page.getByRole('heading', { name: /Latest Reserve List|Reserve/i }).first()).toBeVisible({ timeout: 60000 });
}

async function validateAuthorityLimitError(page: Page) {
  const newReserveButton = page.getByRole('button', { name: /^New Reserve$/i }).first();
  await expect(newReserveButton).toBeVisible({ timeout: 30000 });
  await newReserveButton.click({ timeout: 10000 });

  const expectedError = 'Reserve cannot be entered as the Claim Authority Limit does not exist for the Claim Handler. Please contact your supervisor/manager if you feel this is incorrect';
  const normalizedExpectedError = expectedError.replace(/\s+/g, ' ').toLowerCase();
  const errorMessage = page.getByText(/Reserve cannot be entered as the Claim Authority Limit does not exist/i).first();

  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    if (await errorMessage.isVisible({ timeout: 500 }).catch(() => false)) return true;
    const bodyText = (await page.locator('body').innerText().catch(() => '')).replace(/\s+/g, ' ').toLowerCase();
    if (bodyText.includes(normalizedExpectedError)) return true;
    await page.waitForTimeout(500);
  }

  return false;
}

test.describe('@regression | E2E | Claims | Financials | New Reserve Authority Limit', () => {
  test('TC_REG_CLAIMS_NEW_RESERVE_AUTHORITY_LIMIT_ERROR | Validate New Reserve error for an allowed claim status', async ({ page }) => {
    test.setTimeout(600000);
    test.slow();

    await page.context().grantPermissions(['geolocation']);

    const salesforce = new SalesforcePortalPage(page);
    await salesforce.goto();
    const credentials = getClaimUserCredentials();
    await salesforce.login(credentials.username, credentials.password, { useJwt: false, fast: true });
    await salesforce.closeAllWorkspaceTabs();

    const statuses: ClaimStatus[] = ['Open Circumstance', 'Open Claim', 'Re-Opened Circumstance', 'Re-Opened Claim'];
    let claimId = '';
    let selectedStatus: ClaimStatus | undefined;

    for (const status of statuses) {
      await openClaims(page);
      try {
        const candidateClaimId = await searchClaims(page, status);
        await openClaimFinancials(page);
        if (await validateAuthorityLimitError(page)) {
          claimId = candidateClaimId;
          selectedStatus = status;
          break;
        }
      } catch {
        await page.keyboard.press('Escape').catch(() => undefined);
      }

      await page
        .locator('button[aria-label^="Close CLM/"]:visible, button[title^="Close CLM/"]:visible')
        .first()
        .click({ timeout: 5000 })
        .catch(() => undefined);
      await page.waitForTimeout(800);
    }

    expect(selectedStatus, 'No non-blocked claim produced the requested authority-limit error.').toBeTruthy();
    console.log(`Validated authority-limit error for ${selectedStatus} claim ${claimId}.`);
  });
});
