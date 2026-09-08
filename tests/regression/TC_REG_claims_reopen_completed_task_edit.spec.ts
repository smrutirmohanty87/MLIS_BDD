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

function futureDdMmYyyy(daysAhead = 1) {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
}

async function pickOption(page: Page, preferred: RegExp, exclude?: RegExp) {
  const options = page.locator('[role="listbox"]:visible [role="option"], [role="listbox"]:visible li, .slds-listbox:visible li').filter({ hasText: /\S+/ });
  const preferredOption = options.filter({ hasText: preferred }).first();
  const option = await preferredOption.isVisible({ timeout: 1500 }).catch(() => false)
    ? preferredOption
    : exclude ? options.filter({ hasNotText: exclude }).first() : options.first();
  await expect(option).toBeVisible({ timeout: 15000 });
  const text = (await option.innerText()).trim();
  await option.click({ timeout: 10000 });
  return text;
}

async function selectValue(container: Locator, page: Page, label: string, preferred: RegExp, exclude?: RegExp) {
  const combo = container.getByRole('combobox', { name: new RegExp(`^${label}\\b`, 'i') }).first();
  await expect(combo).toBeVisible({ timeout: 30000 });
  await combo.click({ timeout: 10000 });
  await page.waitForTimeout(500);
  await pickOption(page, preferred, exclude);
  await page.waitForTimeout(500);
}

async function save(page: Page) {
  const button = page.getByRole('button', { name: /^Save$/i }).filter({ hasNotText: /Save\s*&\s*New|Save\s+And\s+New/i }).last();
  await expect(button).toBeVisible({ timeout: 30000 });
  await button.scrollIntoViewIfNeeded();
  await button.click({ timeout: 10000 });
  await page.waitForTimeout(1000);
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

async function finishOnSubmissions(page: Page) {
  const refreshButton = page.getByRole('button', { name: /^Refresh$/i }).first();
  if (await refreshButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await refreshButton.click({ timeout: 10000 }).catch(async () => {
      await refreshButton.click({ timeout: 10000, force: true });
    });
    await page.waitForTimeout(1500);
  }

  const navigation = page.getByRole('button', { name: /Show Navigation Menu/i }).first();
  await expect(navigation).toBeVisible({ timeout: 30000 });
  await page.waitForTimeout(1500);
  await navigation.click({ timeout: 10000 }).catch(async () => {
    await navigation.click({ timeout: 10000, force: true });
  });
  const submissions = page.getByRole('menuitem', { name: /^Submissions$/i }).first();
  await expect(submissions).toBeVisible({ timeout: 15000 });
  await submissions.click({ timeout: 10000 });
  await expect(page.getByRole('heading', { name: /Submissions|Recently Viewed/i }).first()).toBeVisible({ timeout: 60000 });
}

async function openTasks(page: Page) {
  const launcher = page.getByRole('button', { name: /App Launcher/i }).or(page.locator('button[title="App Launcher"]')).first();
  await expect(launcher).toBeVisible({ timeout: 30000 });
  await launcher.click({ timeout: 10000 });
  const search = page.getByPlaceholder(/Search apps and items/i).first();
  await expect(search).toBeVisible({ timeout: 15000 });
  await search.fill('Tasks');
  await page.getByRole('link', { name: /^Tasks$/i }).or(page.getByText(/^Tasks$/i)).first().click({ timeout: 10000 });
  await page.waitForTimeout(1500);
}

async function openAssignedTasks(page: Page) {
  const dropdown = page.locator('button[title*="List View" i]:visible, button[aria-label*="List View" i]:visible').first();
  await expect(dropdown).toBeVisible({ timeout: 30000 });
  await dropdown.click({ timeout: 10000 });
  const listbox = page.getByRole('listbox', { name: /Search lists/i }).first();
  await expect(listbox).toBeVisible({ timeout: 30000 });
  await listbox.getByRole('option', { name: /All Claim tasks assigned to me/i }).first().click({ timeout: 10000 });
  await expect(page.getByText('All Claim tasks assigned to me', { exact: true }).first()).toBeVisible({ timeout: 30000 });
  await page.waitForTimeout(1500);
}

async function createTask(page: Page) {
  await openClaims(page);
  const claims = page.locator('table a:visible, [role="grid"] a:visible').filter({ hasText: /^CLM\//i });
  await expect(claims.first()).toBeVisible({ timeout: 60000 });
  const count = await claims.count();
  await claims.nth(count > 1 ? Date.now() % count : 0).click({ timeout: 10000 });
  const activity = page.getByRole('tab', { name: /Activity/i }).first();
  if (await activity.isVisible({ timeout: 10000 }).catch(() => false)) await activity.click({ timeout: 10000 });
  await page.getByRole('button', { name: /Create Claim Task/i }).or(page.locator('button[title="Create Claim Task"]:visible')).first().click({ timeout: 10000 });
  const dialog = page.locator('[role="dialog"]:visible, .slds-docked-composer.slds-is-open:visible, .slds-modal:visible').first();
  await expect(dialog).toBeVisible({ timeout: 60000 });
  await selectValue(dialog, page, 'Type', /Authorise Payment|Claim Assigned|Claim Correspondence|General Claim Task|Large payment waring|Large reserve movement/i, /^\s*--\s*None\s*--\s*$|^\s*None\s*$/i);
  await selectValue(dialog, page, 'Subject', /Call|Send Letter|Send Quote|Other/i);
  const dueDate = dialog.getByRole('textbox', { name: /Due Date/i }).or(dialog.locator('xpath=//label[contains(normalize-space(.), "Due Date")]/following::input[1]')).first();
  await expect(dueDate).toBeVisible({ timeout: 30000 });
  await dueDate.fill(futureDdMmYyyy(1));
  await dueDate.press('Tab').catch(() => undefined);
  await save(page);
}

test.describe('@regression | E2E | Claims | Task | Edit Reopen', () => {
  test('TC_REG_CLAIMS_TASK_REOPEN_EDIT | Reopen completed task through Edit, save, and complete again', async ({ page }) => {
    test.setTimeout(600000);
    test.slow();
    const salesforce = new SalesforcePortalPage(page);
    await salesforce.goto();
    const credentials = getClaimUserCredentials();
    await salesforce.login(credentials.username, credentials.password, { useJwt: false, fast: true });
    await salesforce.closeAllWorkspaceTabs();
    await createTask(page);
    await openTasks(page);
    await openAssignedTasks(page);

    const rows = page.getByRole('listbox', { name: /Select an item from this list to open it/i }).getByRole('option');
    await expect(rows.first()).toBeVisible({ timeout: 30000 });
    let reopenedAndCompleted = false;

    for (let index = 0; index < Math.min(await rows.count(), 20); index += 1) {
      await rows.nth(index).click({ timeout: 10000 });
      await page.waitForTimeout(1200);
      if (!(await page.getByRole('button', { name: /^Completed$/i }).first().isVisible({ timeout: 3000 }).catch(() => false))) {
        const closeTab = page.getByRole('button', { name: /^Close .+/i }).last();
        if (await closeTab.isVisible({ timeout: 3000 }).catch(() => false)) await closeTab.click({ timeout: 10000 });
        await page.waitForTimeout(800);
        continue;
      }

      await page.getByRole('button', { name: /^Edit$/i }).first().click({ timeout: 10000 });
      const editDialog = page.locator('[role="dialog"]:visible, .slds-modal:visible').first();
      await expect(editDialog).toBeVisible({ timeout: 15000 });
      await selectValue(editDialog, page, 'Status', /Not Started|In Progress/i);
      await save(page);
      await expect(page.getByText(/Not Started|In Progress/i).first()).toBeVisible({ timeout: 30000 });

      const markComplete = page.getByRole('button', { name: /Mark (as )?Complete/i }).first();
      if (await markComplete.isVisible({ timeout: 5000 }).catch(() => false)) {
        await markComplete.click({ timeout: 10000 });
      } else {
        await page.getByRole('button', { name: /^Edit$/i }).first().click({ timeout: 10000 });
        const secondDialog = page.locator('[role="dialog"]:visible, .slds-modal:visible').first();
        await expect(secondDialog).toBeVisible({ timeout: 15000 });
        await selectValue(secondDialog, page, 'Status', /Completed/i);
        await save(page);
      }
      await expect(page.getByRole('button', { name: /^Completed$/i }).first()).toBeVisible({ timeout: 30000 });
      reopenedAndCompleted = true;
      break;
    }

    expect(reopenedAndCompleted, 'A completed task was required for the edit-reopen flow.').toBeTruthy();
    await finishOnSubmissions(page);
    console.log('SUCCESS: Reopened a completed task through Edit, saved it, and completed it again.');
  });
});