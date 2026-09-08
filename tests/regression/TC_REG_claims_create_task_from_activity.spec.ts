import { expect, Locator, Page, test } from '@playwright/test';
import { SalesforcePortalPage } from '../../src/pages/salesforce-cancellation';

function getClaimUserCredentials() {
  const rawEnv = (process.env.TEST_ENV ?? 'UAT2').trim().toUpperCase();
  const envName = rawEnv === 'SIT' ? 'SIT1' : rawEnv;
  const usernameVar = `SALEFORCE_${envName}_CLAIMUSER`;
  const passwordVar = `SALEFORCE_${envName}_CLAIMUSER_PASSWORD`;

  const username = process.env[usernameVar]?.trim();
  const password = process.env[passwordVar]?.trim();
  if (username && password) {
    return { username, password };
  }

  throw new Error(`Missing claim user credentials for ${envName}. Set ${usernameVar} and ${passwordVar} in .env.`);
}

function futureDdMmYyyy(daysAhead = 1) {
  const now = new Date();
  now.setDate(now.getDate() + daysAhead);
  const dd = String(now.getDate()).padStart(2, '0');
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const yyyy = String(now.getFullYear());
  return `${dd}/${mm}/${yyyy}`;
}

async function pickFromOpenListbox(page: Page, preferred: RegExp, fallbackExclude?: RegExp) {
  const allOptions = page
    .locator('[role="listbox"]:visible [role="option"], [role="listbox"]:visible li, .slds-listbox:visible li')
    .filter({ hasText: /\S+/ });

  const preferredOption = allOptions.filter({ hasText: preferred }).first();
  if (await preferredOption.isVisible({ timeout: 1500 }).catch(() => false)) {
    const text = (await preferredOption.innerText().catch(() => '')).trim();
    await preferredOption.click({ timeout: 10000 });
    return text;
  }

  const fallback = fallbackExclude
    ? allOptions.filter({ hasNotText: fallbackExclude }).first()
    : allOptions.first();

  await expect(fallback).toBeVisible({ timeout: 10000 });
  const fallbackText = (await fallback.innerText().catch(() => '')).trim();
  await fallback.click({ timeout: 10000 });
  return fallbackText;
}

async function selectComboboxValue(
  container: Locator,
  page: Page,
  label: string,
  preferred: RegExp,
  fallbackExclude?: RegExp,
) {
  const combo = container.getByRole('combobox', { name: new RegExp(`^${label}\\b`, 'i') }).first();
  await expect(combo).toBeVisible({ timeout: 30000 });
  await combo.scrollIntoViewIfNeeded().catch(() => undefined);

  await combo.click({ timeout: 10000 });
  await page.waitForTimeout(400);

  const pickedText = await pickFromOpenListbox(page, preferred, fallbackExclude);
  await page.waitForTimeout(400);

  const rendered = `${(await combo.innerText().catch(() => '')).trim()} ${(await combo.getAttribute('aria-label').catch(() => '') ?? '').trim()}`.trim();
  if (!rendered || /--\s*None\s*--/i.test(rendered)) {
    throw new Error(`Unable to select value for ${label}.`);
  }

  return pickedText;
}

async function assertNoInlineTaskErrors(container: Locator) {
  const inlineError = container.getByText(/Review the errors on this page\.|required fields must be completed|Complete this field\./i).first();
  if (await inlineError.isVisible({ timeout: 400 }).catch(() => false)) {
    const text = (await inlineError.innerText().catch(() => 'Validation error')).trim();
    throw new Error(text);
  }
}

async function expectTaskCreatedToast(page: Page, timeoutMs = 25000) {
  const successToast = page
    .locator('.slds-notify_toast:visible, .toastMessage:visible, [role="status"]:visible, [role="alert"]:visible, [data-key="success"]:visible')
    .filter({ hasText: /Task\s+["“]?.+["”]?\s+was\s+created\./i })
    .first();

  const errorToast = page
    .locator('.slds-notify_toast:visible, [role="alert"]:visible')
    .filter({ hasText: /error|failed|required|review/i })
    .first();

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await successToast.isVisible({ timeout: 500 }).catch(() => false)) {
      return;
    }

    if (await errorToast.isVisible({ timeout: 200 }).catch(() => false)) {
      const text = (await errorToast.innerText().catch(() => 'Error toast after save')).trim();
      throw new Error(text);
    }

    await page.waitForTimeout(300);
  }

  throw new Error('Task save did not show expected success message: Task "<Subject>" was created.');
}

async function clickVisibleSave(page: Page) {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    const saveButton = page
      .getByRole('button', { name: /^Save$/i })
      .filter({ hasNotText: /Save\s*&\s*New|Save\s+And\s+New/i })
      .last();

    if (await saveButton.isVisible({ timeout: 4000 }).catch(() => false)) {
      await saveButton.scrollIntoViewIfNeeded().catch(() => undefined);
      await page.waitForTimeout(250);
      await saveButton.click({ timeout: 10000 }).catch(async () => {
        await saveButton.click({ timeout: 10000, force: true });
      });
      await page.waitForTimeout(800);
      return;
    }

    await page.mouse.wheel(0, 1400);
    await page.keyboard.press('PageDown').catch(() => undefined);
    await page.waitForTimeout(300);
  }

  throw new Error('Unable to find/click visible Save button.');
}

test.describe('@regression | E2E | Claims | Task', () => {
  test('TC_REG_CLAIMS_TASK | Login as claims user, open claims list, create task from Activity and save', async ({ page }) => {
    test.setTimeout(600000);
    test.slow();

    const salesforce = new SalesforcePortalPage(page);

    await salesforce.goto();
    const claimCreds = getClaimUserCredentials();
    await salesforce.login(claimCreds.username, claimCreds.password, { useJwt: false, fast: true });
    await salesforce.closeAllWorkspaceTabs();

    const navMenuButton = page.getByRole('button', { name: /Show Navigation Menu/i }).first();
    const claimsNavLink = page.getByRole('link', { name: /^Claims$/i }).first();

    if (await navMenuButton.isVisible({ timeout: 8000 }).catch(() => false)) {
      await navMenuButton.click({ timeout: 10000 });
      const claimsMenuItem = page.getByRole('menuitem', { name: /^Claims$/i }).first();
      await expect(claimsMenuItem).toBeVisible({ timeout: 30000 });
      await claimsMenuItem.click({ timeout: 10000 });
    } else {
      await expect(claimsNavLink).toBeVisible({ timeout: 30000 });
      await claimsNavLink.click({ timeout: 10000 });
    }

    const claimsHeader = page.getByRole('heading', { name: /Claims|Recently Viewed/i }).first();
    await expect(claimsHeader).toBeVisible({ timeout: 60000 });

    const firstClaimLink = page
      .locator('table a:visible, [role="grid"] a:visible')
      .filter({ hasText: /^CLM\//i })
      .first();
    await expect(firstClaimLink).toBeVisible({ timeout: 60000 });
    await firstClaimLink.click({ timeout: 10000 });

    const activityTab = page.getByRole('tab', { name: /Activity/i }).first();
    if (await activityTab.isVisible({ timeout: 10000 }).catch(() => false)) {
      await activityTab.click({ timeout: 10000 });
    }

    const createTaskButton = page
      .getByRole('button', { name: /Create Claim Task/i })
      .or(page.locator('button[title="Create Claim Task"]:visible'))
      .first();
    await expect(createTaskButton).toBeVisible({ timeout: 60000 });
    await createTaskButton.click({ timeout: 10000 });

    const taskDialog = page.locator('[role="dialog"]:visible, .slds-docked-composer.slds-is-open:visible, .slds-modal:visible').first();
    await expect(taskDialog).toBeVisible({ timeout: 60000 });

    await selectComboboxValue(
      taskDialog,
      page,
      'Type',
      /Authorise Payment|Claim Assigned|Claim Correspondence|General Claim Task|Large payment waring|Large reserve movement/i,
      /^\s*--\s*None\s*--\s*$|^\s*None\s*$/i,
    );

    const selectedSubject = await selectComboboxValue(
      taskDialog,
      page,
      'Subject',
      /Call|Send Letter|Send Quote|Other/i,
    );

    const dueDateField = taskDialog
      .getByRole('textbox', { name: /Due Date/i })
      .or(taskDialog.locator('xpath=//label[contains(normalize-space(.), "Due Date")]/following::input[1]'))
      .first();
    await expect(dueDateField).toBeVisible({ timeout: 30000 });
    await dueDateField.fill(futureDdMmYyyy(1));
    await dueDateField.press('Tab').catch(() => undefined);

    await assertNoInlineTaskErrors(taskDialog);

    await clickVisibleSave(page);

    await expectTaskCreatedToast(page, 30000);
    console.log(`SUCCESS: Created claim task with subject ${selectedSubject}.`);
  });
});
