import { createBdd, test } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { getMlisPortalUrl } from '../../../../src/config/env';

const { Given, When, Then } = createBdd(test);

type Region = 'ew' | 'scotland';

async function acceptCookiesIfVisible(page: any) {
  const dialog = page.getByRole('alertdialog', { name: /DUAL uses cookies/i }).first();
  const acceptInDialog = dialog.getByRole('button', { name: /accept all/i }).first();
  const accept = page.getByRole('button', { name: /accept all/i }).first();
  if (await dialog.isVisible({ timeout: 2000 }).catch(() => false)) {
    await acceptInDialog.click().catch(() => undefined);
    await expect(dialog).toBeHidden({ timeout: 20000 }).catch(() => undefined);
  } else if (await accept.isVisible({ timeout: 2000 }).catch(() => false)) {
    await accept.click().catch(() => undefined);
  }
}

function homeUrlFromPortal(portalUrl: string) {
  try {
    const url = new URL(portalUrl);
    url.pathname = url.pathname.replace(/\/broker-zone\/?$/i, '/');
    return url.toString();
  } catch {
    return portalUrl;
  }
}

async function navigateToQuickQuote(page: any, region: Region) {
  const homeUrl = homeUrlFromPortal(getMlisPortalUrl());
  await page.goto(homeUrl, { waitUntil: 'domcontentloaded' });
  await acceptCookiesIfVisible(page);

  await expect(page).toHaveURL(/\/mlisportal\/?$/i, { timeout: 60000 });
  await expect(page.getByRole('link', { name: /^Home$/i }).first()).toBeVisible({ timeout: 60000 });
  await expect(page.getByRole('heading', { name: /Home of legal indemnity insurance/i }).first()).toBeVisible({ timeout: 60000 });

  const trigger = region === 'ew'
    ? page
      .getByRole('link', { name: /I am buying or selling a house.*England.*Wales/i })
      .or(page.getByRole('button', { name: /I am buying or selling a house.*England.*Wales/i }))
      .first()
    : page
      .getByRole('link', { name: /I am buying or selling a house.*Scotland/i })
      .or(page.getByRole('button', { name: /I am buying or selling a house.*Scotland/i }))
      .first();

  await expect(trigger).toBeVisible({ timeout: 60000 });
  await trigger.click();
  await expect(page).toHaveURL(/quick-quote-residential/i, { timeout: 60000 });
  await acceptCookiesIfVisible(page);
}

Given('I start residential quick quote for England and Wales', async ({ page }) => {
  await navigateToQuickQuote(page, 'ew');
});

Given('I start residential quick quote for Scotland', async ({ page }) => {
  await navigateToQuickQuote(page, 'scotland');
});

When('I complete quick quote step 1 with England and Wales details', async ({ page }) => {
  await expect(page.getByText(/Step\s*1\s*of\s*3/i).first()).toBeVisible({ timeout: 60000 });

  await page.getByPlaceholder(/Your name\s*\*/i).first().fill('John Smith');
  await page.getByPlaceholder(/Your email address\s*\*/i).first().fill('john.smith@test.com');
  await page.getByPlaceholder(/Conveyancing firm\s*\*/i).first().fill('Smith & Partners');
  await page.getByPlaceholder(/Conveyancer'?s email address\s*\*/i).first().fill('conveyancer@smithpartners.com');
  await page.getByPlaceholder(/Reference\s*\*/i).first().fill(`QQ-EW-${Date.now()}`);

  const postcode = page.getByPlaceholder(/Please enter postcode of property to be insured\s*\*/i).first();
  await postcode.fill('EC3A2BJ');
  await postcode.press('Tab').catch(() => undefined);

  const searchAddress = page.getByRole('button', { name: /Search address/i }).first();
  if (await searchAddress.isVisible({ timeout: 5000 }).catch(() => false)) {
    await searchAddress.click();
    const addressCombobox = page.getByRole('combobox').filter({ hasText: /Please select address/i }).first();
    await expect(addressCombobox).toBeVisible({ timeout: 60000 });
    await addressCombobox.click();
    const allOptions = page.getByRole('option');
    await expect.poll(async () => allOptions.count(), { timeout: 60000 }).toBeGreaterThan(0);
    await allOptions.first().click();
  }

  const jurisdictionCheckbox = page.getByRole('checkbox', {
    name: /I confirm the property of interest is based in England or Wales/i,
  });
  await expect(jurisdictionCheckbox).toBeVisible({ timeout: 60000 });
  await acceptCookiesIfVisible(page);
  await jurisdictionCheckbox.check({ force: true });
  await expect(jurisdictionCheckbox).toBeChecked({ timeout: 15000 });

  const proceedToStep2 = page
    .getByRole('button', { name: /Proceed to step 2/i })
    .or(page.getByText(/Proceed to step 2/i))
    .first();
  await proceedToStep2.click();
  await expect(page.getByText(/Step\s*2\s*of\s*3/i).first()).toBeVisible({ timeout: 60000 });
  await acceptCookiesIfVisible(page);
});

When('I complete quick quote step 1 with Scotland manual address details', async ({ page }) => {
  await expect(page.getByText(/Step\s*1\s*of\s*3/i).first()).toBeVisible({ timeout: 60000 });

  await page.getByPlaceholder(/Your name\s*\*/i).first().fill('John Smith');
  await page.getByPlaceholder(/Your email address\s*\*/i).first().fill('john.smith@test.com');
  await page.getByPlaceholder(/Conveyancing firm\s*\*/i).first().fill('Smith & Partners');
  await page.getByPlaceholder(/Conveyancer'?s email address\s*\*/i).first().fill('conveyancer@smithpartners.com');
  await page.getByPlaceholder(/Reference\s*\*/i).first().fill(`QQ-SC-${Date.now()}`);

  const postcode = page.getByPlaceholder(/Please enter postcode of property to be insured\s*\*/i).first();
  await postcode.fill('EH1 1RE');
  await postcode.press('Tab').catch(() => undefined);

  const enterManually = page.getByRole('button', { name: /Enter manually/i }).first();
  if (await enterManually.isVisible({ timeout: 5000 }).catch(() => false)) {
    await enterManually.click();
  }

  const addressLine1 = page.getByRole('textbox', { name: /Address line 1/i }).first();
  if (await addressLine1.isVisible({ timeout: 5000 }).catch(() => false)) {
    await addressLine1.fill('1 High Street');
    const addressLine2 = page.getByRole('textbox', { name: /Address line 2/i }).first();
    if (await addressLine2.isVisible({ timeout: 2000 }).catch(() => false)) await addressLine2.fill('Old Town');
    const town = page.getByRole('textbox', { name: /^Town$/i }).first();
    if (await town.isVisible({ timeout: 2000 }).catch(() => false)) await town.fill('Edinburgh');
  }

  const jurisdictionCheckbox = page.getByRole('checkbox', {
    name: /I confirm the property of interest is based in Scotland/i,
  });
  await expect(jurisdictionCheckbox).toBeVisible({ timeout: 60000 });
  await acceptCookiesIfVisible(page);
  await jurisdictionCheckbox.check({ force: true });
  await expect(jurisdictionCheckbox).toBeChecked({ timeout: 15000 });

  const proceedToStep2 = page
    .getByRole('button', { name: /Proceed to step 2/i })
    .or(page.getByText(/Proceed to step 2/i))
    .first();
  await proceedToStep2.click();
  await expect(page.getByText(/Step\s*2\s*of\s*3/i).first()).toBeVisible({ timeout: 60000 });
  await acceptCookiesIfVisible(page);
});

When('I select one product and proceed to quick quote step 3', async ({ page }) => {
  const proceedToStep3 = page.getByRole('button', { name: /Proceed to step 3/i }).first();
  await expect(proceedToStep3).toBeVisible({ timeout: 60000 });
  await page.getByRole('button', { name: /^Select$/i }).first().click();
  await expect(page.getByRole('button', { name: /^Remove$/i }).first()).toBeVisible({ timeout: 30000 });
  await proceedToStep3.click();
  await expect(page.getByText(/Step\s*3\s*of\s*3/i).first()).toBeVisible({ timeout: 60000 });
});

When('I select four products and proceed to quick quote step 3', async ({ page }) => {
  const proceedToStep3 = page.getByRole('button', { name: /Proceed to step 3/i }).first();
  await expect(proceedToStep3).toBeVisible({ timeout: 60000 });

  for (let i = 0; i < 4; i += 1) {
    const nextSelect = page.getByRole('button', { name: /^Select$/i }).first();
    await expect(nextSelect).toBeVisible({ timeout: 60000 });
    await nextSelect.click();
  }

  const removeButtons = page.getByRole('button', { name: /^Remove$/i });
  await expect.poll(async () => removeButtons.count(), { timeout: 60000 }).toBeGreaterThanOrEqual(4);
  await proceedToStep3.click();
  await expect(page.getByText(/Step\s*3\s*of\s*3/i).first()).toBeVisible({ timeout: 60000 });
});

When('I email quick quote results', async ({ page }) => {
  await expect(page.getByText(/Premium\s*:/i).first()).toBeVisible({ timeout: 60000 });
  await acceptCookiesIfVisible(page);

  const emailQuotes = page
    .getByRole('button', { name: /Email quotes to my conveyancer and myself/i })
    .or(page.getByRole('link', { name: /Email quotes to my conveyancer and myself/i }))
    .first();
  await expect(emailQuotes).toBeVisible({ timeout: 60000 });

  const tcCheckbox = page.getByRole('checkbox', { name: /terms|t\&c|conditions/i }).first();
  if (await tcCheckbox.isVisible({ timeout: 5000 }).catch(() => false)) {
    await tcCheckbox.check({ force: true });
  } else {
    const anyCheckbox = page.locator('input[type="checkbox"]:visible').first();
    await expect(anyCheckbox).toBeVisible({ timeout: 10000 });
    await anyCheckbox.check({ force: true });
  }

  await emailQuotes.click();
});

Then('quick quote email confirmation should be shown and closed', async ({ page }) => {
  const confirmationHeading = page
    .getByRole('heading', { name: /Your quick quote has been emailed to you and your conveyancer\./i })
    .first();
  await expect(confirmationHeading).toBeVisible({ timeout: 60000 });

  const closeWindow = page.getByRole('button', { name: /Close this window/i }).first();
  await expect(closeWindow).toBeVisible({ timeout: 60000 });
  await closeWindow.click();

  await expect(confirmationHeading).toBeHidden({ timeout: 60000 });
  await expect(page.getByText(/Step\s*3\s*of\s*3/i).first()).toBeVisible({ timeout: 60000 });
});
