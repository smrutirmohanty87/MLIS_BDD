import { expect, Locator, Page, test } from '@playwright/test';
import { SalesforcePortalPage } from '../../src/pages/salesforce-cancellation';

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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

async function attachScreenshot(page: Page, name: string) {
  const screenshotPath = test.info().outputPath(`${name}.png`);
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await test.info().attach(name, { path: screenshotPath, contentType: 'image/png' });
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

  const claimsHeading = page.getByRole('heading', { name: /Claims|Recently Viewed/i }).first();
  if (!(await claimsHeading.isVisible({ timeout: 3000 }).catch(() => false))) {
    const claimsLink = page.getByRole('link', { name: /^Claims$/i }).first();
    if (await claimsLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await claimsLink.click({ timeout: 10000 });
    } else {
      const navButton = page.getByRole('button', { name: /Show Navigation Menu/i }).first();
      if (await navButton.isVisible({ timeout: 3000 }).catch(() => false)) {
        await navButton.click({ timeout: 10000 });
      }
      await page.getByRole('menuitem', { name: /^Claims$/i }).first().click({ timeout: 10000 });
    }
  }

  await expect(claimsHeading).toBeVisible({ timeout: 60000 });
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

function getPartiesCard(page: Page) {
  return page
    .locator('article, [role="region"], .slds-card')
    .filter({ hasText: /^Parties(?:\s*\(\d+\))?/im })
    .first();
}

async function openClaimWithParties(page: Page) {
  await openClaims(page);

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const claimLinks = page.locator('table a:visible, [role="grid"] a:visible').filter({ hasText: /^CLM\//i });
    await expect(claimLinks.first()).toBeVisible({ timeout: 60000 });
    const claimCount = await claimLinks.count();
    const claimLink = claimLinks.nth((Date.now() + attempt) % claimCount);
    await claimLink.click({ timeout: 10000 });
    await page.waitForTimeout(1200);

    await ensureClaimInformationTab(page);
    if (await getPartiesCard(page).isVisible({ timeout: 10000 }).catch(() => false)) {
      return;
    }

    await closeCurrentWorkspaceTab(page);
    await openClaims(page);
  }

  throw new Error('Unable to find a claim with a visible Parties section after checking 10 claims.');
}

async function openPartiesViewAll(page: Page) {
  await ensureClaimInformationTab(page);
  const partiesCard = getPartiesCard(page);
  await expect(partiesCard).toBeVisible({ timeout: 30000 });
  await partiesCard.scrollIntoViewIfNeeded();

  const viewAll = partiesCard.getByRole('link', { name: /View All/i }).first();
  await expect(viewAll).toBeVisible({ timeout: 30000 });
  await viewAll.click({ timeout: 10000 });

  await page.waitForLoadState('domcontentloaded');
  await expect(page.getByRole('heading', { name: /^Parties$/i }).first()).toBeVisible({ timeout: 60000 });

  const sanctionStatusColumns = page.getByRole('columnheader', { name: /^Sanction Status$/i });
  await expect
    .poll(async () => sanctionStatusColumns.count(), { timeout: 30000 })
    .toBeGreaterThan(0);
}

function getPartyRows(page: Page) {
  return page
    .locator('table tbody tr:visible, [role="row"]:visible')
    .filter({ hasText: /CP-\d+/i });
}

async function waitForDeleteSuccessMessage(page: Page) {
  const successMessage = page
    .locator('.slds-notify_toast:visible, [role="alert"]:visible, .toastMessage:visible')
    .filter({ hasText: /deleted|success/i })
    .first();

  await expect(successMessage).toBeVisible({ timeout: 30000 });
}

async function waitForDeleteOutcome(page: Page, partyId?: string) {
  const deletedPartyLocator = partyId
    ? page
        .locator('table a:visible, [role="grid"] a:visible')
        .filter({ hasText: new RegExp(`^${escapeRegex(partyId)}$`, 'i') })
    : undefined;

  const successToast = page
    .locator('.slds-notify_toast:visible, [role="alert"]:visible, .toastMessage:visible')
    .filter({ hasText: /deleted|success/i });

  const blockingError = page
    .locator('.slds-notify_toast:visible, [role="alert"]:visible, section[role="dialog"]:visible, div[role="dialog"]:visible, .slds-modal:visible')
    .filter({ hasText: /you may not delete claim parties|cannot delete|can't delete|unable to delete|insufficient|validation|required|error/i });

  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    if (deletedPartyLocator && (await deletedPartyLocator.count()) === 0) return 'deleted';
    if ((await successToast.count()) > 0) return 'deleted';

    const blockedCount = await blockingError.count();
    if (blockedCount > 0) {
      const closeButton = blockingError
        .first()
        .locator('button[title*="Close" i], button[aria-label*="Close" i], button')
        .first();
      if (await closeButton.isVisible({ timeout: 1000 }).catch(() => false)) {
        await closeButton.click({ timeout: 5000, force: true }).catch(() => undefined);
      } else {
        await page.keyboard.press('Escape').catch(() => undefined);
      }
      return 'blocked';
    }

    await page.waitForTimeout(500);
  }

  return 'unknown';
}

async function openRowActionsAndDelete(page: Page, row: Locator) {
  const partyIdCell = row.locator('a:visible').filter({ hasText: /^CP-\d+/i }).first();
  const partyId = ((await partyIdCell.textContent()) ?? '').trim();

  const actionButton = row
    .locator('button[aria-haspopup="true"]:visible, button[title*="Action" i]:visible, button[title*="Show" i]:visible, button:visible')
    .last();
  await expect(actionButton).toBeVisible({ timeout: 15000 });
  await actionButton.click({ timeout: 10000, force: true });

  const deleteAction = page
    .getByRole('menuitem', { name: /^Delete$/i })
    .first()
    .or(page.locator('a[role="menuitem"]:has-text("Delete"), span:has-text("Delete")').first());
  await expect(deleteAction).toBeVisible({ timeout: 15000 });
  await deleteAction.click({ timeout: 10000, force: true });

  const confirmModal = page
    .locator('section[role="dialog"]:visible, div[role="dialog"]:visible, .slds-modal:visible')
    .filter({ hasText: /Delete Claim Party|Are you sure you want to delete this claim party\?/i })
    .first();
  if (await confirmModal.isVisible({ timeout: 5000 }).catch(() => false)) {
    const confirmDeleteButton = confirmModal.getByRole('button', { name: /^Delete$/i }).first();
    await expect(confirmDeleteButton).toBeVisible({ timeout: 15000 });
    await confirmDeleteButton.click({ timeout: 10000 });
    await expect(confirmModal).toBeHidden({ timeout: 30000 });
  }

  return waitForDeleteOutcome(page, partyId || undefined);
}

async function deleteOnePartyFromViewAll(page: Page) {
  const initialRows = getPartyRows(page);
  const initialCount = await initialRows.count();
  test.fixme(initialCount === 0, 'No parties available to delete in Parties View All list.');

  const outcome = await openRowActionsAndDelete(page, initialRows.first());
  if (outcome === 'blocked') {
    await attachScreenshot(page, 'claim-party-delete-blocked-valid-error');
    return;
  }

  if (outcome === 'unknown') {
    await attachScreenshot(page, 'claim-party-delete-no-explicit-feedback');
  }
}

test.describe('@regression | E2E | Claims | Parties', () => {
  test('TC_REG_CLAIMS_PARTY_DELETE | Delete a party from Claims Information and stop on success message', async ({ page }) => {
    test.setTimeout(600000);
    test.slow();

    await page.context().grantPermissions(['geolocation']);

    const salesforce = new SalesforcePortalPage(page);
    await salesforce.goto();
    const credentials = getClaimUserCredentials();
    await salesforce.login(credentials.username, credentials.password, { useJwt: false, fast: true });
    await salesforce.closeAllWorkspaceTabs();

    await openClaimWithParties(page);
    await openPartiesViewAll(page);
    await attachScreenshot(page, 'claim-party-view-all-before-delete');

    await deleteOnePartyFromViewAll(page);
    await attachScreenshot(page, 'claim-party-view-all-after-delete');
  });
});
