import { expect, Page, test } from '@playwright/test';
import { SalesforcePortalPage } from '../../src/pages/salesforce-cancellation';

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

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

async function openExistingPartyFromParties(page: Page) {
  const partiesCard = getPartiesCard(page);
  await expect(partiesCard).toBeVisible({ timeout: 30000 });
  await partiesCard.scrollIntoViewIfNeeded();

  let partyLink = partiesCard.locator('a:visible').filter({ hasText: /^CP-\d+/i }).first();
  if (!(await partyLink.isVisible({ timeout: 3000 }).catch(() => false))) {
    const viewAll = partiesCard.getByRole('link', { name: /View All/i }).first();
    if (await viewAll.isVisible({ timeout: 3000 }).catch(() => false)) {
      await viewAll.click({ timeout: 10000 });
      await page.waitForTimeout(1200);
      partyLink = page.locator('table a:visible, [role="grid"] a:visible').filter({ hasText: /^CP-\d+/i }).first();
    }
  }

  await expect(partyLink).toBeVisible({ timeout: 30000 });
  const partyRecordId = (await partyLink.innerText()).trim();
  await partyLink.click({ timeout: 10000 });
  await page.waitForLoadState('domcontentloaded');
  await expect(resolveRecordHeaderEditButton(page)).toBeVisible({ timeout: 60000 });
  await expect(page.getByRole('tab', { name: /^Details$/i }).first()).toBeVisible({ timeout: 60000 });
  return partyRecordId;
}

function resolveRecordHeaderEditButton(page: Page) {
  const headerEdit = page
    .locator('records-highlights2, .slds-page-header, .forceHighlightsPanel, .oneRecordHomeFlexipage2')
    .locator('button:visible')
    .filter({ hasText: /^Edit$/i })
    .first();

  const fallbackEdit = page.getByRole('button', { name: /^Edit$/i }).last();
  return headerEdit.or(fallbackEdit).first();
}

async function waitForPageLoad(page: Page) {
  await page.waitForLoadState('domcontentloaded');
  const spinner = page.locator('.slds-spinner_container:visible, lightning-spinner:visible').first();
  if (await spinner.isVisible({ timeout: 1500 }).catch(() => false)) {
    await expect(spinner).toBeHidden({ timeout: 60000 });
  }
  await page.waitForTimeout(1200);
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

async function closeCurrentPartySubtab(page: Page) {
  const closePartyTab = page
    .locator('button[aria-label^="Close CP-"]:visible, button[title^="Close CP-"]:visible')
    .first();
  if (await closePartyTab.isVisible({ timeout: 5000 }).catch(() => false)) {
    await closePartyTab.click({ timeout: 10000 });
    await page.waitForTimeout(800);
  }
}

async function editPartyReference(page: Page) {
  const editButton = resolveRecordHeaderEditButton(page);
  await expect(editButton).toBeVisible({ timeout: 30000 });
  await editButton.scrollIntoViewIfNeeded();
  await editButton.click({ timeout: 10000, force: true });

  const activeEditPanel = page
    .locator('div[role="tabpanel"]:visible, article:visible, .slds-form:visible')
    .filter({ hasText: /Party Reference/i })
    .first();

  const partyReferenceCandidates = activeEditPanel
    .getByRole('textbox', { name: /^Party Reference$/i })
    .or(activeEditPanel.getByLabel(/^Party Reference$/i))
    .or(activeEditPanel.locator('input[aria-label*="Party Reference" i], input[name*="partyreference" i], input[id*="partyreference" i]'));

  let partyReferenceField = partyReferenceCandidates.first();
  const candidateCount = await partyReferenceCandidates.count();
  for (let index = 0; index < candidateCount; index += 1) {
    const candidate = partyReferenceCandidates.nth(index);
    const isVisible = await candidate.isVisible({ timeout: 500 }).catch(() => false);
    const isEnabled = await candidate.isEnabled({ timeout: 500 }).catch(() => false);
    if (isVisible && isEnabled) {
      partyReferenceField = candidate;
      break;
    }
  }

  await expect(partyReferenceField).toBeVisible({ timeout: 30000 });
  await expect(partyReferenceField).toBeEnabled({ timeout: 15000 });
  await partyReferenceField.click({ timeout: 10000, force: true });
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');

  const updatedValue = `AUTO-PARTY-REF-${Date.now()}`;
  await partyReferenceField.fill(updatedValue);

  await clickSave(page);
  await waitForPageLoad(page);

  return updatedValue;
}

async function openPartyByIdFromClaims(page: Page, partyRecordId: string) {
  await closeCurrentPartySubtab(page);
  await ensureClaimInformationTab(page);

  const partiesCard = getPartiesCard(page);
  await expect(partiesCard).toBeVisible({ timeout: 30000 });
  await partiesCard.scrollIntoViewIfNeeded();

  const partyIdRegex = new RegExp(`^${escapeRegex(partyRecordId)}$`, 'i');
  let partyLink = partiesCard.locator('a:visible').filter({ hasText: partyIdRegex }).first();
  if (!(await partyLink.isVisible({ timeout: 3000 }).catch(() => false))) {
    const viewAll = partiesCard.getByRole('link', { name: /View All/i }).first();
    if (await viewAll.isVisible({ timeout: 3000 }).catch(() => false)) {
      await viewAll.click({ timeout: 10000 });
      await page.waitForTimeout(1200);
      partyLink = page.locator('table a:visible, [role="grid"] a:visible').filter({ hasText: partyIdRegex }).first();
    }
  }

  await expect(partyLink).toBeVisible({ timeout: 30000 });
  await partyLink.click({ timeout: 10000 });
  await waitForPageLoad(page);
  await expect(resolveRecordHeaderEditButton(page)).toBeVisible({ timeout: 60000 });
}

async function verifyPartyReferenceValue(page: Page, expectedValue: string) {
  const verifyEditButton = resolveRecordHeaderEditButton(page);
  await expect(verifyEditButton).toBeVisible({ timeout: 60000 });
  await verifyEditButton.click({ timeout: 10000, force: true });

  const verifyPanel = page
    .locator('div[role="tabpanel"]:visible, article:visible, .slds-form:visible')
    .filter({ hasText: /Party Reference/i })
    .first();
  const verifyFieldCandidates = verifyPanel
    .getByRole('textbox', { name: /^Party Reference$/i })
    .or(verifyPanel.getByLabel(/^Party Reference$/i))
    .or(verifyPanel.locator('input[aria-label*="Party Reference" i], input[name*="partyreference" i], input[id*="partyreference" i]'));

  let verifyField = verifyFieldCandidates.first();
  const candidateCount = await verifyFieldCandidates.count();
  for (let index = 0; index < candidateCount; index += 1) {
    const candidate = verifyFieldCandidates.nth(index);
    const isVisible = await candidate.isVisible({ timeout: 500 }).catch(() => false);
    const isEnabled = await candidate.isEnabled({ timeout: 500 }).catch(() => false);
    if (isVisible && isEnabled) {
      verifyField = candidate;
      break;
    }
  }

  await expect(verifyField).toBeVisible({ timeout: 30000 });
  await expect(verifyField).toHaveValue(expectedValue, { timeout: 30000 });
}

test.describe('@regression | E2E | Claims | Parties', () => {
  test('TC_REG_CLAIMS_PARTY_EDIT | Edit an existing party from Claims Information and verify it', async ({ page }) => {
    test.setTimeout(600000);
    test.slow();

    await page.context().grantPermissions(['geolocation']);

    const salesforce = new SalesforcePortalPage(page);
    await salesforce.goto();
    const credentials = getClaimUserCredentials();
    await salesforce.login(credentials.username, credentials.password, { useJwt: true, fast: true, jwtUsername: credentials.username });
    await salesforce.closeAllWorkspaceTabs();

    await openClaimWithParties(page);
    const partyRecordId = await openExistingPartyFromParties(page);
    await attachScreenshot(page, 'claim-party-before-edit');

    const updatedReference = await editPartyReference(page);
    await openPartyByIdFromClaims(page, partyRecordId);
    await verifyPartyReferenceValue(page, updatedReference);
    await attachScreenshot(page, 'claim-party-after-edit');
  });
});
