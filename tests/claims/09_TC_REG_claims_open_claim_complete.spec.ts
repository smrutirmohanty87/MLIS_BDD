import { expect, Page, test } from '@playwright/test';
import { SalesforcePortalPage } from '../../src/pages/salesforce-cancellation';

function getClaimUserCredentials() {
  const rawEnv = (process.env.TEST_ENV ?? 'UAT2').trim().toUpperCase();
  const envName = rawEnv === 'SIT' ? 'SIT1' : rawEnv;
  const username = process.env[`SALEFORCE_${envName}_CLAIMUSER`]?.trim();
  const password = process.env[`SALEFORCE_${envName}_CLAIMUSER_PASSWORD`]?.trim();

  if (username && password) return { username, password };
  throw new Error(`Missing claim user credentials for ${envName}.`);
}

function todayValue() {
  const today = new Date();
  return `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
}

async function fillInlineField(page: Page, label: RegExp, value: string) {
  let field = page.getByRole('textbox', { name: label }).first();
  if (!(await field.isVisible({ timeout: 3000 }).catch(() => false))) {
    const labelNode = page.locator('label:visible, span:visible, div:visible').filter({ hasText: label }).first();
    await expect(labelNode).toBeVisible({ timeout: 30000 });
    const row = labelNode.locator('xpath=ancestor::*[self::li or contains(@class, "slds-form-element") or contains(@class, "slds-grid")][1]');
    const editButton = row.locator('button[title*="Edit" i]:visible, button[aria-label*="Edit" i]:visible, button:visible').first();
    if (await editButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await editButton.click({ timeout: 10000, force: true });
    }
    field = page.getByRole('textbox', { name: label }).first();
  }

  await expect(field).toBeVisible({ timeout: 30000 });
  await field.scrollIntoViewIfNeeded();
  await field.fill(value);
  await field.press('Tab').catch(() => undefined);
}

async function fillLossAddress(page: Page) {
  const advisedDateField = page.getByRole('textbox', { name: /Date Claim First Advised/i }).first();
  await expect(advisedDateField).toBeVisible({ timeout: 30000 });
  await expect(advisedDateField).toHaveValue(/\d{2}\/\d{2}\/\d{4}/, { timeout: 30000 });

  const lossLocationSection = page
    .getByRole('button', { name: /^Loss Location$/i })
    .or(page.getByRole('heading', { name: /^Loss Location$/i }).locator('xpath=..').getByRole('button'))
    .or(page.getByText(/^Loss Location$/i).first());
  if (await lossLocationSection.isVisible({ timeout: 5000 }).catch(() => false)) {
    const expanded = await lossLocationSection.getAttribute('aria-expanded').catch(() => null);
    if (expanded !== 'true') {
      await lossLocationSection.click({ timeout: 10000, force: true });
    }
  }

  await page.waitForTimeout(500);
  const countryField = page
    .getByRole('combobox', { name: /Loss Address \(Country\/Territory\)/i })
    .or(page.getByRole('textbox', { name: /Loss Address \(Country\/Territory\)/i }))
    .first();
  if (await countryField.isVisible({ timeout: 5000 }).catch(() => false)) {
    await countryField.click({ timeout: 10000, force: true });
    if (await countryField.getAttribute('role') === 'combobox') {
      const unitedKingdom = page
        .getByRole('option', { name: /^United Kingdom$/i })
        .or(page.locator('[role="listbox"] li:visible').filter({ hasText: /^United Kingdom$/i }))
        .first();
      if (await unitedKingdom.isVisible({ timeout: 5000 }).catch(() => false)) {
        await unitedKingdom.click({ timeout: 10000 });
      }
    } else {
      await countryField.fill('United Kingdom');
    }
  }

  const addressSearch = page
    .getByRole('textbox', { name: /Address Search/i })
    .or(page.locator('input[placeholder*="Search Address" i]:visible'))
    .first();

  if (await addressSearch.isVisible({ timeout: 5000 }).catch(() => false)) {
    await addressSearch.fill('EC3A 2BJ');
    await page.waitForTimeout(1500);
    const addressOption = page
      .locator('[role="option"]:visible, .slds-listbox__option:visible, li:visible')
      .filter({ hasText: /EC3A|London|Leadenhall/i })
      .first();
    if (await addressOption.isVisible({ timeout: 10000 }).catch(() => false)) {
      await addressOption.click({ timeout: 10000 });
      return;
    }
  }

  await fillInlineField(page, /Loss Address \(Street\)/i, '10 Test Street');
  const townField = page.getByRole('textbox', { name: /Loss Address \(Town|City\)/i }).first();
  if (await townField.isVisible({ timeout: 3000 }).catch(() => false)) {
    await townField.fill('London');
  }
}

async function saveClaimInformation(page: Page) {
  const saveButton = page.getByRole('button', { name: /^Save$/i }).last();
  await expect(saveButton).toBeVisible({ timeout: 30000 });
  await saveButton.click({ timeout: 10000 });
  // Salesforce saves in-place; waiting for a document load can hang indefinitely.
  await page.waitForTimeout(1500);
}

async function openRandomInsurancePolicyAndCreateClaim(page: Page, salesforce: SalesforcePortalPage): Promise<Page> {
  const openInsurancePoliciesList = async () => {
    const navigation = page.getByRole('button', { name: /Show Navigation Menu/i }).first();
    if (await navigation.isVisible({ timeout: 10000 }).catch(() => false)) {
      await navigation.click({ timeout: 10000 });
      const insurancePoliciesMenuItem = page.getByRole('menuitem', { name: /^Insurance Policies$/i }).first();
      if (await insurancePoliciesMenuItem.isVisible({ timeout: 15000 }).catch(() => false)) {
        await insurancePoliciesMenuItem.click({ timeout: 10000 });
      } else {
        await page.getByRole('link', { name: /^Insurance Policies$/i }).first().click({ timeout: 10000 });
      }
    } else {
      await page.getByRole('link', { name: /^Insurance Policies$/i }).first().click({ timeout: 10000 });
    }
    await expect(page.getByRole('heading', { name: /Insurance Policies/i }).first()).toBeVisible({ timeout: 60000 });
  };

  await openInsurancePoliciesList();
  const policyLinks = page.locator('[role="rowheader"] a:visible');
  await expect(policyLinks.first()).toBeVisible({ timeout: 60000 });
  const policyCount = await policyLinks.count();
  const selectedPolicy = policyLinks.nth(Math.floor(Math.random() * policyCount));
  await selectedPolicy.scrollIntoViewIfNeeded();
  await selectedPolicy.click({ timeout: 10000 });

  await expect(page.getByRole('button', { name: /Create Claim/i }).first()).toBeVisible({ timeout: 60000 });
  const existingClaimsBanner = page
    .locator('div:visible, section:visible')
    .filter({ hasText: /^Claim\(s\) exist on this Policy$/i })
    .first();
  if (await existingClaimsBanner.isVisible({ timeout: 3000 }).catch(() => false)) {
    const closeBanner = page
      .locator('button[title*="Close" i]:visible, button[aria-label*="Close" i]:visible, button.slds-notify__close:visible')
      .last();
    if (await closeBanner.isVisible({ timeout: 1000 }).catch(() => false)) {
      await closeBanner.click({ timeout: 5000, force: true }).catch(() => undefined);
    } else {
      await page.keyboard.press('Escape').catch(() => undefined);
    }
    await expect(existingClaimsBanner).toBeHidden({ timeout: 5000 }).catch(() => undefined);
  }

  const createClaimButton = page.getByRole('button', { name: /Create Claim/i }).first();
  await createClaimButton.click({ timeout: 10000, force: true }).catch(async () => {
    await createClaimButton.dispatchEvent('click');
  });

  const deadline = Date.now() + 60000;
  while (Date.now() < deadline) {
    const activePages = page.context().pages().filter((candidate) => !candidate.isClosed());
    for (const candidate of activePages) {
      const claimCoverage = candidate
        .getByRole('combobox', { name: /Select Claim Coverage|Claim Coverage/i })
        .or(candidate.getByRole('button', { name: /Select Claim Coverage/i }))
        .first();
      const claimHeading = candidate.getByRole('heading', { name: /Claim|Create Claim|Enter Claim|New Claim/i }).first();
      if (
        await claimCoverage.isVisible({ timeout: 500 }).catch(() => false)
        || await claimHeading.isVisible({ timeout: 500 }).catch(() => false)
      ) {
        await candidate.bringToFront().catch(() => undefined);
        return candidate;
      }
    }
    await page.waitForTimeout(500);
  }

  throw new Error('New Claim page did not appear after clicking Create Claim.');
}

async function completeOpenClaim(page: Page) {
  const openClaimOption = page.getByRole('option', { name: /^Open Claim$/i }).first();
  const openClaimPath = page
    .locator('.slds-path__item, .slds-path__link, [data-value="Open Claim"], button, a')
    .filter({ hasText: /^Open Claim$/i })
    .first();

  if (await openClaimOption.isVisible({ timeout: 5000 }).catch(() => false)) {
    await openClaimOption.scrollIntoViewIfNeeded();
    await openClaimOption.click({ timeout: 10000, force: true });
  } else {
    await expect(openClaimPath).toBeAttached({ timeout: 30000 });
    await openClaimPath.scrollIntoViewIfNeeded();
    await expect(openClaimPath).toBeVisible({ timeout: 15000 });
    await openClaimPath.click({ timeout: 10000, force: true });
  }

  const markComplete = page
    .getByRole('button', { name: /Mark Claim Status as Complete|Mark as Current Claim Status/i })
    .first();
  await expect
    .poll(async () => {
      await openClaimPath.scrollIntoViewIfNeeded().catch(() => undefined);
      return await markComplete.isVisible({ timeout: 1000 }).catch(() => false);
    }, {
      timeout: 60000,
      intervals: [1000, 2000, 5000],
      message: 'Open Claim status did not expose the completion action after Save.',
    })
    .toBe(true);
  await markComplete.scrollIntoViewIfNeeded().catch(() => undefined);
    const completionSpinner = page.locator('.slds-spinner_container:visible, lightning-spinner:visible, .forceComponentSpinner:visible').first();
    if (await completionSpinner.isVisible({ timeout: 1500 }).catch(() => false)) {
      await expect(completionSpinner).toBeHidden({ timeout: 60000 });
    }
    await markComplete.click({ timeout: 10000, force: true });

  const doneButton = page.getByRole('button', { name: /^Done$/i }).first();
  await expect(doneButton).toBeVisible({ timeout: 60000 });
  await doneButton.click({ timeout: 10000 });

  await page.waitForTimeout(1500);
  const claimHeading = page.getByRole('heading', { name: /Claims Incurred|Claim/i }).first();
  await expect
    .poll(async () => await claimHeading.isVisible({ timeout: 1000 }).catch(() => false), {
      timeout: 60000,
      intervals: [1000, 2000, 5000],
      message: 'Claim page did not return after clicking Done.',
    })
    .toBe(true);

  await page.waitForTimeout(3000);
  const claimFinancialsTab = page
    .getByRole('tab', { name: /^Claim Financials$/i })
    .first()
    .or(page.getByRole('link', { name: /^Claim Financials$/i }).first())
    .or(page.getByRole('button', { name: /^Claim Financials$/i }).first());
  await expect(claimFinancialsTab).toBeVisible({ timeout: 30000 });
  await claimFinancialsTab.click({ timeout: 10000, force: true });

  await expect(page.getByRole('heading', { name: /Latest Reserve List|Reserve/i }).first()).toBeVisible({ timeout: 60000 });
  const newReserveButton = page.getByRole('button', { name: /^New Reserve$/i }).first();
  await expect(newReserveButton).toBeVisible({ timeout: 30000 });
  await newReserveButton.click({ timeout: 10000 });

  const reserveUi = page
    .getByRole('heading', { name: /Choose Reserve Currency|Enter Reserve Information/i })
    .first();
  await expect
    .poll(async () => await reserveUi.isVisible({ timeout: 1000 }).catch(() => false), {
      timeout: 60000,
      intervals: [1000, 2000, 5000],
      message: 'Reserve UI did not appear after clicking New Reserve.',
    })
    .toBe(true);

  const nextButton = page.getByRole('button', { name: /^Next$/i }).first();
  if (await nextButton.isVisible({ timeout: 3000 }).catch(() => false)) {
    await nextButton.click({ timeout: 10000 });
    await expect(page.getByRole('heading', { name: /Enter Reserve Information/i }).first()).toBeVisible({ timeout: 60000 });
  }

  const reserveValues: Array<[RegExp, string]> = [
    [/100% Indemnity Reserve/i, '100'],
    [/DUAL Share Indemnity Reserve/i, '100'],
    [/100% Cost Reserve/i, '50'],
    [/DUAL Share Cost Reserve/i, '50'],
    [/100% Fee Reserve/i, '25'],
    [/DUAL Share Fee Reserve/i, '25'],
  ];
  for (const [label, value] of reserveValues) {
    const field = page
      .getByRole('spinbutton', { name: label })
      .or(page.getByRole('textbox', { name: label }))
      .first();
    await expect(field).toBeVisible({ timeout: 30000 });
    await field.fill(value);
  }

  const postReserveButton = page.getByRole('button', { name: /^Post Reserve$/i }).first();
  await expect(postReserveButton).toBeVisible({ timeout: 30000 });
  await postReserveButton.scrollIntoViewIfNeeded();
  await postReserveButton.click({ timeout: 10000 });

  const reserveDialog = page
    .getByRole('heading', { name: /Enter Reserve Information|Choose Reserve Currency/i })
    .first();
  await expect
    .poll(async () => !(await reserveDialog.isVisible({ timeout: 1000 }).catch(() => false)), {
      timeout: 60000,
      intervals: [1000, 2000, 5000],
      message: 'Reserve form did not close after clicking Post Reserve.',
    })
    .toBe(true);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  await expect(page.getByRole('heading', { name: /Claims Incurred|Claim/i }).first()).toBeVisible({ timeout: 60000 });

  const financialsTabAfterRefresh = page
    .getByRole('tab', { name: /^Claim Financials$/i })
    .first()
    .or(page.getByRole('link', { name: /^Claim Financials$/i }).first())
    .or(page.getByRole('button', { name: /^Claim Financials$/i }).first());
  await expect(financialsTabAfterRefresh).toBeVisible({ timeout: 30000 });
  await financialsTabAfterRefresh.click({ timeout: 10000, force: true });

  const latestReserveList = page
    .locator('article, [role="region"], .slds-card')
    .filter({ hasText: /Latest Reserve List/i })
    .first();
  await expect(latestReserveList).toBeVisible({ timeout: 30000 });
  await expect(latestReserveList.getByRole('heading', { name: /Latest Reserve List/i }).first()).toBeVisible({ timeout: 60000 });
  const reserveRows = latestReserveList
    .locator('[role="grid"] [role="row"]:visible, table tbody tr:visible')
    .filter({ hasText: /Posted|Created by User|RV\d+/i });
  await expect(reserveRows.first()).toBeVisible({ timeout: 60000 });
}

test.describe('@regression | E2E | Claims | Open Claim Completion', () => {
  test('TC_REG_CLAIMS_OPEN_CLAIM_COMPLETE | Create claim, fill Claim Information, and complete Open Claim', async ({ page }) => {
    test.setTimeout(1200000);
    test.slow();

    await page.context().grantPermissions(['geolocation']);

    const salesforce = new SalesforcePortalPage(page);

    const claimCredentials = getClaimUserCredentials();
    await salesforce.goto();
    await salesforce.login(claimCredentials.username, claimCredentials.password, { useJwt: false, fast: true });
    await salesforce.closeAllWorkspaceTabs();

    page = await openRandomInsurancePolicyAndCreateClaim(page, salesforce);
    await salesforce.selectClaimCoverage();
    await salesforce.completeClaimPostCreationFlowAndAssertIncurred();

    await salesforce.openClaimInformationTab();
    await salesforce.fillClaimInformation('test');
    await fillInlineField(page, /Date Claim First Advised/i, todayValue());
    await fillLossAddress(page);
    await saveClaimInformation(page);

    await completeOpenClaim(page);
  });
});
