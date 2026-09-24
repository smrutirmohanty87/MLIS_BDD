import { expect, Page, test } from '@playwright/test';
import { SalesforcePortalPage } from '../../src/pages/salesforce-cancellation';

type ClaimBucket = 'blocked' | 'allowed';

type ClaimAssessment = {
  claimId: string;
  statusLabel: string;
  bucket: ClaimBucket;
};

function getClaimUserCredentials() {
  const rawEnv = (process.env.TEST_ENV ?? 'UAT2').trim().toUpperCase();
  const envName = rawEnv;
  const usernameVar = `SALEFORCE_${envName}_CLAIMUSER`;
  const passwordVar = `SALEFORCE_${envName}_CLAIMUSER_PASSWORD`;
  const username = process.env[usernameVar]?.trim();
  const password = process.env[passwordVar]?.trim();

  if (username && password) return { username, password };
  throw new Error(`Missing claim user credentials for ${envName}. Set ${usernameVar} and ${passwordVar} in .env.`);
}

async function handleClaimsRelatedListLoadError(page: Page) {
  const loadErrorToast = page
    .locator('.slds-notify_toast:visible, [role="alert"]:visible')
    .filter({ hasText: /couldn'?t load this related list|try viewing all records again/i })
    .first();

  if (!(await loadErrorToast.isVisible({ timeout: 2500 }).catch(() => false))) {
    return;
  }

  const closeToastButton = loadErrorToast
    .locator('button[title*="Close" i], button[aria-label*="Close" i], button')
    .first();
  if (await closeToastButton.isVisible({ timeout: 1000 }).catch(() => false)) {
    await closeToastButton.click({ timeout: 5000 });
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

  await handleClaimsRelatedListLoadError(page);
  await expect(page.getByRole('heading', { name: /Claims|Recently Viewed/i }).first()).toBeVisible({ timeout: 60000 });
}

async function closeCurrentClaimWorkspaceTab(page: Page) {
  const closeTab = page.locator('button[aria-label^="Close CLM/"]:visible, button[title^="Close CLM/"]:visible').first();
  if (await closeTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await closeTab.click({ timeout: 10000 });
    await page.waitForTimeout(800);
  }
}

async function setClaimsListSearch(page: Page, searchText: string) {
  const searchInput = page
    .locator('input[placeholder*="Search" i]:visible, input[aria-label*="Search" i]:visible, [role="searchbox"]:visible')
    .first();

  await expect(searchInput).toBeVisible({ timeout: 30000 });
  await searchInput.click({ timeout: 10000, force: true });
  await searchInput.fill(searchText);
  await searchInput.press('Enter').catch(() => undefined);
  await page.waitForTimeout(1200);
}

async function openFirstClaimFromCurrentResults(page: Page) {
  const claimLink = page.locator('table a:visible, [role="grid"] a:visible').filter({ hasText: /^CLM\//i }).first();
  await expect(claimLink).toBeVisible({ timeout: 30000 });
  const claimId = ((await claimLink.innerText().catch(() => '')) ?? '').trim();
  await claimLink.click({ timeout: 10000 });
  await page.waitForLoadState('domcontentloaded');

  const breadcrumbClaim = page.getByText(/Claims\s*>\s*CLM\//i).first();
  const claimHeading = page.getByRole('heading', { name: /Claims Incurred|Claim/i }).first();
  await expect(breadcrumbClaim.or(claimHeading)).toBeVisible({ timeout: 60000 });
  return claimId;
}

async function readCurrentClaimStatus(page: Page) {
  const selectedPathOption = page
    .getByRole('listbox', { name: /Path Options/i })
    .getByRole('option', { selected: true })
    .first();

  if (await selectedPathOption.isVisible({ timeout: 7000 }).catch(() => false)) {
    const text = ((await selectedPathOption.innerText().catch(() => '')) ?? '').trim();
    if (text) return text;
  }

  const activePathLabel = page
    .locator('.slds-path__item.slds-is-current .slds-path__title, .slds-path__item.slds-is-current .slds-path__link, .slds-path__item.slds-is-active .slds-path__title, .slds-path__item.slds-is-active .slds-path__link')
    .first();

  if (await activePathLabel.isVisible({ timeout: 5000 }).catch(() => false)) {
    const text = ((await activePathLabel.innerText().catch(() => '')) ?? '').trim();
    if (text) return text;
  }

  const statusField = page
    .locator('records-record-layout-item, .slds-form-element, article')
    .filter({ hasText: /^Status$/im })
    .first();
  if (await statusField.isVisible({ timeout: 2000 }).catch(() => false)) {
    const text = ((await statusField.innerText().catch(() => '')) ?? '').trim();
    if (text) return text;
  }

  return 'Unknown Status';
}

function classifyStatus(statusLabel: string): ClaimBucket {
  if (/^\s*(FNOL\s+Only|Closed\s+Circumstance|Closed\s+Claim)\s*$/i.test(statusLabel)) {
    return 'blocked';
  }
  return 'allowed';
}

async function openClaimFinancialsTab(page: Page) {
  const reserveHeading = page.getByRole('heading', { name: /Latest Reserve List|Reserve/i }).first();
  if (await reserveHeading.isVisible({ timeout: 1500 }).catch(() => false)) {
    return;
  }

  const directTab = page
    .getByRole('tab', { name: /^Claim Financials$/i })
    .first()
    .or(page.getByRole('link', { name: /^Claim Financials$/i }).first())
    .or(page.getByRole('button', { name: /^Claim Financials$/i }).first());

  if (await directTab.isVisible({ timeout: 3000 }).catch(() => false)) {
    await directTab.click({ timeout: 10000, force: true });
  } else {
    const textTab = page
      .locator('a:visible, button:visible, span:visible, div[role="tab"]:visible')
      .filter({ hasText: /^Claim Financials$/i })
      .first();
    if (await textTab.isVisible({ timeout: 3000 }).catch(() => false)) {
      await textTab.click({ timeout: 10000, force: true });
    } else {
      const moreTabsButton = page
        .locator('button:visible')
        .filter({ hasText: /More|Show More|Tabs/i })
        .first();
      if (await moreTabsButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await moreTabsButton.click({ timeout: 10000 });
        const financialsMenuItem = page
          .getByRole('menuitem', { name: /Claim Financials/i })
          .first()
          .or(page.locator('a[role="menuitem"]:has-text("Claim Financials"), span:has-text("Claim Financials")').first());
        await expect(financialsMenuItem).toBeVisible({ timeout: 10000 });
        await financialsMenuItem.click({ timeout: 10000, force: true });
      }
    }
  }

  await expect(reserveHeading).toBeVisible({ timeout: 60000 });
}

async function assertNewReserveVisibility(page: Page, expectedVisible: boolean) {
  const newReserveButton = page.getByRole('button', { name: /^New Reserve$/i }).first();
  if (expectedVisible) {
    await expect(newReserveButton).toBeVisible({ timeout: 15000 });
    return;
  }
  await expect(newReserveButton).toBeHidden({ timeout: 15000 });
}

async function searchOpenAndValidateReserve(page: Page, searchTerms: string[], expectedBucket: ClaimBucket) {
  for (const searchTerm of searchTerms) {
    await openClaims(page);
    await setClaimsListSearch(page, searchTerm);

    const hasClaim = await page
      .locator('table a:visible, [role="grid"] a:visible')
      .filter({ hasText: /^CLM\//i })
      .first()
      .isVisible({ timeout: 5000 })
      .catch(() => false);
    if (!hasClaim) {
      continue;
    }

    const claimId = await openFirstClaimFromCurrentResults(page);
    const statusLabel = await readCurrentClaimStatus(page);
    if (/unknown status/i.test(statusLabel)) {
      await closeCurrentClaimWorkspaceTab(page);
      continue;
    }

    const bucket = classifyStatus(statusLabel);
    if (bucket !== expectedBucket) {
      await closeCurrentClaimWorkspaceTab(page);
      continue;
    }

    await openClaimFinancialsTab(page);
    await assertNewReserveVisibility(page, expectedBucket === 'allowed');

    return { claimId, statusLabel, bucket } as ClaimAssessment;
  }

  return undefined;
}

test.describe('@regression | E2E | Claims | Financials | New Reserve Visibility', () => {
  test('TC_REG_CLAIMS_NEW_RESERVE_VISIBILITY | Validate New Reserve button visibility by claim status', async ({ page }) => {
    test.setTimeout(600000);
    test.slow();

    await page.context().grantPermissions(['geolocation']);

    const salesforce = new SalesforcePortalPage(page);
    await salesforce.goto();
    const credentials = getClaimUserCredentials();
    await salesforce.login(credentials.username, credentials.password, { useJwt: false, fast: true });
    await salesforce.closeAllWorkspaceTabs();

    const blockedCase = await searchOpenAndValidateReserve(page, ['FNOL Only', 'Closed Circumstance', 'Closed Claim'], 'blocked');
    expect(blockedCase, 'No claim found for FNOL/Closed/Closed Circumstance search.').toBeTruthy();

    await closeCurrentClaimWorkspaceTab(page);

    const allowedCase = await searchOpenAndValidateReserve(page, ['Open Claim', 'Open Circumstance', 'Re-Opened Claim', 'Re-Opened Circumstance'], 'allowed');
    expect(allowedCase, 'No open-status claim found from claims status search.').toBeTruthy();

    console.log(`Validated blocked claim ${blockedCase?.claimId} (${blockedCase?.statusLabel}) => New Reserve hidden.`);
    console.log(`Validated allowed claim ${allowedCase?.claimId} (${allowedCase?.statusLabel}) => New Reserve visible.`);
  });
});
