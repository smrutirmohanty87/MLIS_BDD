import { createBdd, test } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { getMlisPortalUrl } from '../../../../src/config/env';

const { Given, When, Then } = createBdd(test);

let registrationEmail = '';

async function acceptCookiesIfVisible(page: any) {
  const acceptInDialog = page
    .getByRole('alertdialog')
    .getByRole('button', { name: /accept all/i })
    .first();
  const acceptButton = page.getByRole('button', { name: /accept all/i }).first();

  if (await acceptInDialog.isVisible({ timeout: 2000 }).catch(() => false)) {
    await acceptInDialog.click().catch(() => undefined);
  } else if (await acceptButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await acceptButton.click().catch(() => undefined);
  }
}

Given('I open broker portal registration page from home', async ({ page }) => {
  const baseUrl = getMlisPortalUrl().replace(/\/broker-zone\/?$/i, '/');
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await acceptCookiesIfVisible(page);

  await expect(page.getByRole('heading', { name: /Home of legal indemnity insurance/i }).first())
    .toBeVisible({ timeout: 30000 });

  const signUpForFree = page.getByRole('link', { name: /sign up for free/i }).first();
  await expect(signUpForFree).toBeVisible({ timeout: 30000 });
  await signUpForFree.click();

  await expect(page).toHaveURL(/broker-registration/i, { timeout: 30000 });
  await expect(page.getByRole('heading', { name: /Register/i }).first()).toBeVisible({ timeout: 20000 });
});

When('I submit registration details with valid mandatory information', async ({ page }) => {
  const emailField = page.locator('input[type="text"], input[type="email"]').first();
  const proceedButton = page.getByRole('button', { name: /^Proceed$/i }).first();

  await expect(emailField).toBeVisible({ timeout: 20000 });
  await expect(proceedButton).toBeEnabled({ timeout: 10000 });

  const timestamp = Date.now();
  registrationEmail = `autouser.${timestamp}@testdual.com`;
  await emailField.fill(registrationEmail);
  await proceedButton.click();

  await expect(page.getByText('Your details')).toBeVisible({ timeout: 30000 });
  await acceptCookiesIfVisible(page);

  await page.locator('input[name="forename"]').fill('Test');
  await page.locator('input[name="surname"]').fill('AutoUser');
  await page.locator('input[name="phoneNumber"]').fill('01234567890');
  await expect(page.locator('input[name="emailAddress"]')).toHaveValue(registrationEmail, { timeout: 10000 });

  const ewLabel = page.getByText('England & Wales').first();
  await ewLabel.scrollIntoViewIfNeeded();
  await ewLabel.click({ force: true });

  await page.locator('input[name="firmName"]').fill('Auto Test Firm Ltd');
  await page.locator('input[name="crn"]').fill('12345678');
  await page.locator('input[name="nameContact"]').fill('Accounts Contact');
  await page.locator('input[name="accountsEmail"]').fill(`accounts.${timestamp}@testdual.com`);
  await page.locator('input[name="accountsPhone"]').fill('01234567891');

  const intermediaryBtn = page.locator('button[name="intermediaryType"]').first();
  await intermediaryBtn.scrollIntoViewIfNeeded();
  await intermediaryBtn.click();
  await page.waitForTimeout(400);

  const ukBrokerOption = page.getByRole('option', { name: /^UK Broker$/i }).first();
  if (await ukBrokerOption.isVisible({ timeout: 5000 }).catch(() => false)) {
    await ukBrokerOption.click();
  } else {
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
  }

  const paymentBtn = page.locator('button[name="paymentType"]').first();
  await paymentBtn.scrollIntoViewIfNeeded();
  await paymentBtn.click();
  await page.waitForTimeout(400);
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');

  await page.locator('input[name="location"]').fill('EC3A 2BJ');
  const searchAddressBtn = page.getByRole('button', { name: /search address/i }).first();
  await searchAddressBtn.scrollIntoViewIfNeeded();
  await searchAddressBtn.click();

  const addressCombobox = page
    .getByRole('combobox')
    .filter({ hasText: /please select address/i })
    .first();

  await expect(addressCombobox).toBeVisible({ timeout: 30000 });
  await addressCombobox.click();

  const allAddressOptions = page.getByRole('option');
  await expect.poll(async () => allAddressOptions.count(), { timeout: 30000 }).toBeGreaterThan(0);

  const preferredAddress = page.getByRole('option', { name: /EC3A|Leadenhall|London/i }).first();
  const addressToPick =
    (await preferredAddress.isVisible({ timeout: 2000 }).catch(() => false)) ? preferredAddress : allAddressOptions.first();
  await addressToPick.click();

  const tandcRoleCheckbox = page.getByRole('checkbox').last();
  await tandcRoleCheckbox.scrollIntoViewIfNeeded();
  await tandcRoleCheckbox.click({ force: true }).catch(() => undefined);

  const tandcInput = page.locator('input[name="tandc"]').first();
  if (!(await tandcInput.isChecked().catch(() => false))) {
    await tandcInput.evaluate((el) => {
      const input = el as HTMLInputElement;
      input.checked = true;
      input.dispatchEvent(new Event('input', { bubbles: true }));
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }
  await expect(tandcInput).toBeChecked({ timeout: 10000 });

  const registerButton = page.getByRole('button', { name: /^Register$/i }).first();
  await expect(registerButton).toBeEnabled({ timeout: 10000 });
  await registerButton.scrollIntoViewIfNeeded();
  await registerButton.click();
});

Then('broker registration should complete successfully', async ({ page }) => {
  await page.waitForFunction(
    () =>
      /confirmation|success|login|broker-zone/i.test(location.href) ||
      document.body.innerText.match(/thank you|registration successful|account created|verify your email|check your email/i) !== null,
    { timeout: 30000 },
  );
});
