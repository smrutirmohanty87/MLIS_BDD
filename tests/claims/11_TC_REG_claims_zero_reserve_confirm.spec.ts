import { expect, Page, test } from '@playwright/test';
import { SalesforcePortalPage } from '../../src/pages/salesforce-cancellation';

function claimCredentials() {
  const env = (process.env.TEST_ENV ?? 'UAT2').trim().toUpperCase() === 'SIT' ? 'SIT1' : (process.env.TEST_ENV ?? 'UAT2').trim().toUpperCase();
  const username = process.env[`SALEFORCE_${env}_CLAIMUSER`]?.trim();
  const password = process.env[`SALEFORCE_${env}_CLAIMUSER_PASSWORD`]?.trim();
  if (!username || !password) throw new Error(`Missing claim credentials for ${env}.`);
  return { username, password };
}

function today() {
  const date = new Date();
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

async function inlineField(page: Page, label: RegExp, value: string) {
  let field = page.getByRole('textbox', { name: label }).first();
  if (!(await field.isVisible({ timeout: 3000 }).catch(() => false))) {
    const labelNode = page.locator('label:visible, span:visible, div:visible').filter({ hasText: label }).first();
    await expect(labelNode).toBeVisible({ timeout: 30000 });
    const row = labelNode.locator('xpath=ancestor::*[self::li or contains(@class, "slds-form-element") or contains(@class, "slds-grid")][1]');
    const edit = row.locator('button[title*="Edit" i]:visible, button[aria-label*="Edit" i]:visible, button:visible').first();
    if (await edit.isVisible({ timeout: 2000 }).catch(() => false)) await edit.click({ force: true });
    field = page.getByRole('textbox', { name: label }).first();
  }
  await expect(field).toBeVisible({ timeout: 30000 });
  await field.scrollIntoViewIfNeeded();
  await field.fill(value);
  await field.press('Tab').catch(() => undefined);
}

async function openPolicyAndClaim(page: Page, salesforce: SalesforcePortalPage): Promise<Page> {
  const nav = page.getByRole('button', { name: /Show Navigation Menu/i }).first();
  if (await nav.isVisible({ timeout: 10000 }).catch(() => false)) {
    await nav.click();
    const item = page.getByRole('menuitem', { name: /^Insurance Policies$/i }).first();
    if (await item.isVisible({ timeout: 10000 }).catch(() => false)) await item.click();
    else await page.getByRole('link', { name: /^Insurance Policies$/i }).first().click();
  } else {
    await page.getByRole('link', { name: /^Insurance Policies$/i }).first().click();
  }
  await expect(page.getByRole('heading', { name: /Insurance Policies/i }).first()).toBeVisible({ timeout: 60000 });
  const policies = page.locator('[role="rowheader"] a:visible');
  await expect(policies.first()).toBeVisible({ timeout: 60000 });
  await policies.nth(Math.floor(Math.random() * await policies.count())).click();
  const createClaim = page.getByRole('button', { name: /Create Claim/i }).first();
  await expect(createClaim).toBeVisible({ timeout: 60000 });
  const banner = page.locator('div:visible, section:visible').filter({ hasText: /^Claim\(s\) exist on this Policy$/i }).first();
  if (await banner.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.locator('button[title*="Close" i]:visible, button[aria-label*="Close" i]:visible, button.slds-notify__close:visible').last().click({ force: true }).catch(() => undefined);
  }
  await createClaim.click({ force: true });
  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    for (const candidate of page.context().pages().filter((item) => !item.isClosed())) {
      const claimForm = candidate.getByRole('combobox', { name: /Claim Coverage/i }).or(candidate.getByRole('button', { name: /Select Claim Coverage/i })).first();
      if (await claimForm.isVisible({ timeout: 500 }).catch(() => false)) {
        await candidate.bringToFront();
        return candidate;
      }
    }
    await page.waitForTimeout(500);
  }
  throw new Error('New Claim form did not appear.');
}

async function fillClaimDetails(page: Page, salesforce: SalesforcePortalPage) {
  await salesforce.selectClaimCoverage();
  await salesforce.completeClaimPostCreationFlowAndAssertIncurred();
  await salesforce.openClaimInformationTab();
  await salesforce.fillClaimInformation('test');
  await inlineField(page, /Date Claim First Advised/i, today());
  const lossLocation = page.getByText(/^Loss Location$/i).first();
  if (await lossLocation.isVisible({ timeout: 5000 }).catch(() => false)) {
    const sectionToggle = lossLocation
      .locator('xpath=ancestor::*[self::button or @role="button" or contains(@class, "slds-section")][1]')
      .first();
    const expanded = await sectionToggle.getAttribute('aria-expanded').catch(() => null);
    if (expanded !== 'true') {
      await sectionToggle.click({ force: true }).catch(async () => {
        await lossLocation.click({ force: true });
      });
    }
  }
  await page.waitForTimeout(500);
  const country = page.getByRole('combobox', { name: /Loss Address \(Country\/Territory\)/i }).first();
  if (await country.isVisible({ timeout: 3000 }).catch(() => false)) {
    await country.click({ force: true });
    await page.getByRole('option', { name: /^United Kingdom$/i }).first().click().catch(() => undefined);
  }
  const address = page.getByRole('textbox', { name: /Address Search/i }).or(page.locator('input[placeholder*="Search Address" i]:visible')).first();
  if (await address.isVisible({ timeout: 3000 }).catch(() => false)) {
    await address.fill('EC3A 2BJ');
    await page.waitForTimeout(1200);
    const option = page.locator('[role="option"]:visible, li:visible').filter({ hasText: /EC3A|London|Leadenhall/i }).first();
    if (await option.isVisible({ timeout: 5000 }).catch(() => false)) await option.click();
  }
  const save = page.getByRole('button', { name: /^Save$/i }).last();
  await expect(save).toBeVisible({ timeout: 30000 });
  await save.click();
  await page.waitForTimeout(1500);
}

async function moveClaimFromFnolToOpen(page: Page) {
  const openClaimOption = page.getByRole('option', { name: /^Open Claim$/i }).first();
  const openClaimPath = page
    .locator('.slds-path__item, .slds-path__link, [data-value="Open Claim"], button, a')
    .filter({ hasText: /^Open Claim$/i })
    .first();

  if (await openClaimOption.isVisible({ timeout: 5000 }).catch(() => false)) {
    await openClaimOption.scrollIntoViewIfNeeded();
    await openClaimOption.click({ force: true });
  } else {
    await expect(openClaimPath).toBeAttached({ timeout: 30000 });
    await openClaimPath.scrollIntoViewIfNeeded();
    await openClaimPath.click({ force: true });
  }

  const markComplete = page
    .getByRole('button', { name: /Mark Claim Status as Complete|Mark as Current Claim Status/i })
    .first();
  await expect(markComplete).toBeVisible({ timeout: 60000 });
  const spinner = page.locator('.slds-spinner_container:visible, lightning-spinner:visible, .forceComponentSpinner:visible').first();
  if (await spinner.isVisible({ timeout: 1500 }).catch(() => false)) {
    await expect(spinner).toBeHidden({ timeout: 60000 });
  }
  await markComplete.click({ force: true });

  const done = page.getByRole('button', { name: /^Done$/i }).first();
  await expect(done).toBeVisible({ timeout: 60000 });
  await done.click();
  await page.waitForTimeout(1500);
  await expect(page.getByRole('heading', { name: /Claims Incurred|Claim/i }).first()).toBeVisible({ timeout: 60000 });
}

async function activeClaimPage(page: Page) {
  const pages = page.context().pages().filter((candidate) => !candidate.isClosed());
  for (const candidate of pages) {
    const financials = candidate.getByRole('tab', { name: /^Claim Financials$/i }).first();
    if (await financials.isVisible({ timeout: 1000 }).catch(() => false)) {
      await candidate.bringToFront().catch(() => undefined);
      return candidate;
    }
  }
  const fallback = pages[pages.length - 1] ?? page;
  await fallback.bringToFront().catch(() => undefined);
  return fallback;
}

async function postZeroReserve(page: Page): Promise<Page> {
  page = await activeClaimPage(page);
  const financials = page.getByRole('tab', { name: /^Claim Financials$/i }).first();
  await expect(financials).toBeVisible({ timeout: 30000 });
  const latestReserveList = page
    .locator('article, [role="region"], .slds-card')
    .filter({ hasText: /Latest Reserve List/i })
    .first();
  for (let attempt = 0; attempt < 3; attempt += 1) {
    await financials.click({ force: true });
    if (await latestReserveList.isVisible({ timeout: 20000 }).catch(() => false)) break;
    await page.waitForTimeout(1000);
  }
  await expect(latestReserveList).toBeVisible({ timeout: 60000 });
  await latestReserveList.getByRole('button', { name: /^New Reserve$/i }).click();
  const next = page.getByRole('button', { name: /^Next$/i }).first();
  await expect(next).toBeVisible({ timeout: 30000 });
  await next.click({ timeout: 10000 });
  await expect
    .poll(async () => {
      const reserveField = page.getByRole('spinbutton', { name: /100% Indemnity Reserve/i }).first();
      const postButton = page.getByRole('button', { name: /^Post Reserve$/i }).first();
      return await reserveField.isVisible({ timeout: 1000 }).catch(() => false)
        || await postButton.isVisible({ timeout: 1000 }).catch(() => false);
    }, { timeout: 60000, intervals: [1000, 2000, 5000], message: 'Reserve information form did not appear after Next.' })
    .toBe(true);

  for (const label of [/100% Indemnity Reserve/i, /DUAL Share Indemnity Reserve/i, /100% Cost Reserve/i, /DUAL Share Cost Reserve/i, /100% Fee Reserve/i, /DUAL Share Fee Reserve/i]) {
    const field = page.getByRole('spinbutton', { name: label }).or(page.getByRole('textbox', { name: label })).first();
    await expect(field).toBeVisible({ timeout: 30000 });
    await field.fill('0');
  }

  const post = page.getByRole('button', { name: /^Post Reserve$/i }).first();
  await post.scrollIntoViewIfNeeded();
  await post.click();
  const confirmation = page.getByRole('heading', { name: /^Confirmation$/i }).first();
  await expect(confirmation).toBeVisible({ timeout: 30000 });
  await expect(page.getByText(/Your Reserve will be set to Zero/i)).toBeVisible({ timeout: 15000 });
  await page.getByRole('button', { name: /^Confirm$/i }).click();
  await expect(confirmation).toBeHidden({ timeout: 60000 });
  return page;
}

async function refreshAndVerifyZeroReserve(page: Page) {
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  const claimInformation = page.getByRole('tab', { name: /^Claim Information$/i }).first();
  await expect(claimInformation).toBeVisible({ timeout: 60000 });
  await claimInformation.click({ force: true });
  await expect(page.getByText(/Claim Dates|Loss Narrative/i).first()).toBeVisible({ timeout: 60000 });

  const financials = page.getByRole('tab', { name: /^Claim Financials$/i }).first();
  await expect(financials).toBeVisible({ timeout: 60000 });
  await financials.click({ force: true });
  const grid = page.locator('article, [role="region"], .slds-card').filter({ hasText: /Latest Reserve List/i }).first();
  await expect(grid).toBeVisible({ timeout: 60000 });
  const reserveLink = grid.locator('a:visible').filter({ hasText: /^RV\d+/i }).first();
  await expect(reserveLink).toBeVisible({ timeout: 60000 });
  await reserveLink.click();
  await expect(page.getByText(/100% Indemnity Reserve/i).first()).toBeVisible({ timeout: 60000 });
  const zeroValues = page
    .locator('span:visible, div:visible, p:visible')
    .filter({ hasText: /^0\.00$/ });
  await expect
    .poll(async () => await zeroValues.count(), { timeout: 60000, intervals: [1000, 2000, 5000], message: 'Reserve detail did not display all zero values.' })
    .toBeGreaterThanOrEqual(6);
}

test.describe('@regression | E2E | Claims | Zero Reserve', () => {
  test('TC_REG_CLAIMS_ZERO_RESERVE_CONFIRM | Post zero reserve, confirm, refresh, and verify zero values', async ({ page }) => {
    test.setTimeout(1200000);
    test.slow();
    await page.context().grantPermissions(['geolocation']);
    const salesforce = new SalesforcePortalPage(page);
    const credentials = claimCredentials();
    await salesforce.goto();
    await salesforce.login(credentials.username, credentials.password, { useJwt: false, fast: true });
    await salesforce.closeAllWorkspaceTabs();
    page = await openPolicyAndClaim(page, salesforce);
    await fillClaimDetails(page, salesforce);
    await moveClaimFromFnolToOpen(page);
    page = await postZeroReserve(page);
    await refreshAndVerifyZeroReserve(page);
  });
});
