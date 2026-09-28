import { createBdd, test } from 'playwright-bdd';
import { expect, type Locator, type Page } from '@playwright/test';
import { getQuoteJourneyFieldValues, getSalesforceCredentials } from '../../../../src/config/env';
import { SalesforcePortalPage } from '../../../../src/pages/salesforce-cancellation';
import { SalesforceQuoteJourneyCommercialEWPage } from '../../../../src/pages/salesforce-quote-journey-commercial-ew';

const { Given, When, Then } = createBdd(test);

type JourneyType = 'commercial-single' | 'residential-single' | 'residential-multi';

let journeyType: JourneyType = 'commercial-single';
let caseRef = '';

async function waitForLightningIdle(page: Page) {
  await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(750);

  const knownBusyLocators = [
    page.locator('[role="progressbar"]'),
    page.locator('.slds-spinner:visible'),
    page.locator('text=Loading...'),
    page.locator('text=Processing Request'),
  ];

  for (const busy of knownBusyLocators) {
    await busy.first().waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
  }
}

async function clickWhenReady(locator: Locator, page: Page) {
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    await waitForLightningIdle(page);
    try {
      await locator.click({ timeout: 15000 });
      return;
    } catch (error) {
      if (attempt === 4) {
        throw error;
      }
      await page.keyboard.press('Escape').catch(() => {});
      await page.waitForTimeout(1000);
    }
  }
}

async function pickFirstVisible(candidates: Locator[], timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    for (const candidate of candidates) {
      const target = candidate.first();
      if (await target.isVisible().catch(() => false)) {
        return target;
      }
    }
    await candidates[0].page().waitForTimeout(250);
  }
  throw new Error('Unable to find a visible locator from provided candidates.');
}

async function findLookupInput(page: Page, fieldLabel: string) {
  return pickFirstVisible([
    page.getByRole('combobox', { name: new RegExp(fieldLabel, 'i') }),
    page.getByRole('searchbox', { name: new RegExp(fieldLabel, 'i') }),
    page.locator(`input[aria-label*="${fieldLabel}"]`),
    page.locator(`input[placeholder*="${fieldLabel}"]`),
  ]);
}

async function selectLookupOption(page: Page, fieldLabel: string, query: string, optionText: string) {
  const input = await findLookupInput(page, fieldLabel);
  await clickWhenReady(input, page);
  await input.fill(query);

  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await input.fill(query.slice(0, Math.min(4, query.length)) || query);

  const option = await pickFirstVisible([
    page.getByRole('option', { name: new RegExp(optionText, 'i') }),
    page.getByRole('link', { name: new RegExp(optionText, 'i') }),
    page.locator(`li:has-text("${optionText}")`),
  ], 30000);
  await clickWhenReady(option, page);
}

async function selectComboboxOption(page: Page, label: string, optionText: string) {
  const combobox = await pickFirstVisible([
    page.getByRole('combobox', { name: new RegExp(label, 'i') }),
    page.locator(`button[aria-label*="${label}"]`),
    page.locator(`[data-target-selection-name*="${label.toLowerCase().replace(/\s+/g, '-')}"]`),
  ]);

  await clickWhenReady(combobox, page);

  const option = await pickFirstVisible([
    page.getByRole('option', { name: new RegExp(optionText, 'i') }),
    page.locator(`[role="option"]:has-text("${optionText}")`),
    page.getByText(new RegExp(`^${optionText}$`, 'i')).first(),
  ], 20000);

  await clickWhenReady(option, page);
  await waitForLightningIdle(page);
}

async function openQuoteJourney(page: Page) {
  const qjHeading = page.getByRole('heading', { name: /quote journey/i }).first();
  const productSelectionHeading = page.getByRole('heading', { name: /product selection/i }).first();

  const navCandidates = [
    page.getByRole('link', { name: /^Quote Journey$/i }).first(),
    page.getByRole('tab', { name: /^Quote Journey$/i }).first(),
    page.locator('a[title="Quote Journey"], one-app-nav-bar a:has-text("Quote Journey")').first(),
  ];

  for (let attempt = 1; attempt <= 5; attempt += 1) {
    await waitForLightningIdle(page);
    for (const candidate of navCandidates) {
      if (await candidate.isVisible({ timeout: 1500 }).catch(() => false)) {
        try {
          await candidate.scrollIntoViewIfNeeded().catch(() => undefined);
          await candidate.click({ timeout: 12000 });
        } catch {
          await candidate.click({ force: true, timeout: 12000 });
        }

        if (await qjHeading.isVisible({ timeout: 20000 }).catch(() => false)) {
          await expect(productSelectionHeading).toBeVisible({ timeout: 120000 });
          return;
        }
      }
    }

    await page.keyboard.press('Escape').catch(() => undefined);
    await page.waitForTimeout(1200);
  }

  throw new Error('Unable to open Quote Journey from Salesforce navigation.');
}

Given('I am logged into Salesforce quote journey', async ({ page }) => {
  const sfCreds = getSalesforceCredentials();
  const salesforce = new SalesforcePortalPage(page);
  await salesforce.login(sfCreds.username, sfCreds.password, { useJwt: true, fast: true });
  await openQuoteJourney(page);
});

When('I complete commercial quote journey product selection with one product', async ({ page }) => {
  journeyType = 'commercial-single';
  caseRef = `SF-QJ-COM-E2E-${Date.now()}`;
  const qjFields = getQuoteJourneyFieldValues();

  await selectLookupOption(page, 'Broker Account', qjFields.brokerAccountQuery, qjFields.brokerAccountOption);
  await selectLookupOption(page, 'Broker User', qjFields.brokerUserQuery, qjFields.brokerUserOption);
  await selectComboboxOption(page, 'Brand', qjFields.brand);
  await selectComboboxOption(page, 'Quote Type', 'Commercial');
  await selectComboboxOption(page, 'Jurisdiction', qjFields.jurisdiction);

  const caseRefInput = await pickFirstVisible([
    page.getByRole('textbox', { name: /my case reference|case reference|file number/i }),
    page.locator('input[placeholder*="case reference" i]'),
  ]);
  await caseRefInput.fill(caseRef);

  const loiInput = await pickFirstVisible([
    page.getByRole('spinbutton', { name: /limit of indemnity/i }),
    page.locator('input[type="number"][name*="limit" i]'),
    page.locator('input[aria-label*="Limit of indemnity"]'),
  ]);
  await loiInput.fill('500000');

  const preferredCard = page.locator('article, div').filter({ hasText: /Absence of easement - Access/i }).first();
  const preferredSelectButton = preferredCard.getByRole('button', { name: /select/i }).first();
  const anySelectButton = page.getByRole('button', { name: /^Select$/ }).first();
  const selectedProductsHeading = page.getByText(/You have selected\s+\d+\s+product/i).first();

  if (await preferredSelectButton.isVisible({ timeout: 5000 }).catch(() => false)) {
    await clickWhenReady(preferredSelectButton, page);
  } else {
    await clickWhenReady(anySelectButton, page);
  }

  if (!(await selectedProductsHeading.isVisible({ timeout: 5000 }).catch(() => false))) {
    await clickWhenReady(anySelectButton, page);
  }

  await expect(selectedProductsHeading).toBeVisible({ timeout: 20000 });
  await clickWhenReady(page.getByRole('button', { name: /^Proceed$/ }).first(), page);
});

When('I complete residential quote journey product selection with one product', async ({ page }) => {
  journeyType = 'residential-single';
  caseRef = `SF-QJ-E2E-${Date.now()}`;
  const qjFields = getQuoteJourneyFieldValues();

  await selectLookupOption(page, 'Broker Account', qjFields.brokerAccountQuery, qjFields.brokerAccountOption);
  await selectLookupOption(page, 'Broker User', qjFields.brokerUserQuery, qjFields.brokerUserOption);
  await selectComboboxOption(page, 'Brand', qjFields.brand);
  await selectComboboxOption(page, 'Quote Type', 'Residential');
  await selectComboboxOption(page, 'Jurisdiction', qjFields.jurisdiction);

  const caseRefInput = await pickFirstVisible([
    page.getByRole('textbox', { name: /my case reference|case reference|file number/i }),
    page.locator('input[placeholder*="case reference" i]'),
  ]);
  await caseRefInput.fill(caseRef);

  const loiInput = await pickFirstVisible([
    page.getByRole('spinbutton', { name: /limit of indemnity/i }),
    page.locator('input[type="number"][name*="limit" i]'),
    page.locator('input[aria-label*="Limit of indemnity"]'),
  ]);
  await loiInput.fill('500000');

  const adversePossessionCard = await pickFirstVisible([
    page.locator('article, div').filter({ hasText: /Adverse Possession/i }).first(),
    page.getByText(/Adverse Possession/i).first(),
  ]);

  const selectProductButton = adversePossessionCard.getByRole('button', { name: /select/i }).first();
  if (await selectProductButton.isVisible().catch(() => false)) {
    await clickWhenReady(selectProductButton, page);
  } else {
    await clickWhenReady(page.getByRole('button', { name: /^Select$/ }).first(), page);
  }

  await clickWhenReady(page.getByRole('button', { name: /^Proceed$/ }).first(), page);
});

When('I complete residential quote journey product selection with multiple products', async ({ page }) => {
  journeyType = 'residential-multi';
  caseRef = `SF-QJ-RES-MULTI-${Date.now()}`;
  const qjFields = getQuoteJourneyFieldValues();

  await selectLookupOption(page, 'Broker Account', qjFields.brokerAccountQuery, qjFields.brokerAccountOption);
  await selectLookupOption(page, 'Broker User', qjFields.brokerUserQuery, qjFields.brokerUserOption);
  await selectComboboxOption(page, 'Brand', qjFields.brand);
  await selectComboboxOption(page, 'Quote Type', 'Residential');
  await selectComboboxOption(page, 'Jurisdiction', qjFields.jurisdiction);

  const caseRefInput = await pickFirstVisible([
    page.getByRole('textbox', { name: /my case reference|case reference|file number/i }),
    page.locator('input[placeholder*="case reference" i]'),
  ]);
  await caseRefInput.fill(caseRef);

  const loiInput = await pickFirstVisible([
    page.getByRole('spinbutton', { name: /limit of indemnity/i }),
    page.locator('input[type="number"][name*="limit" i]'),
    page.locator('input[aria-label*="Limit of indemnity"]'),
  ]);
  await loiInput.fill('500000');

  const getSelectedCount = async () => {
    const txt = await page.locator('body').innerText();
    return Number(txt.match(/You have selected\s+(\d+)\s+products?/i)?.[1] ?? '0');
  };

  const clickAndVerifyIncrease = async (button: Locator) => {
    const before = await getSelectedCount();
    await clickWhenReady(button, page);
    await page.waitForTimeout(350);
    const after = await getSelectedCount();
    return after > before;
  };

  const preferredProductNames = [/Adverse Possession/i, /Absence of easement - Access/i];
  for (const productName of preferredProductNames) {
    if ((await getSelectedCount()) >= 2) break;

    const card = page.locator('article, div').filter({ hasText: productName }).first();
    const selectButton = card.getByRole('button', { name: /select/i }).first();
    if (await selectButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await clickAndVerifyIncrease(selectButton);
    }
  }

  for (let attempts = 0; attempts < 12 && (await getSelectedCount()) < 2; attempts += 1) {
    const selectButtons = page.getByRole('button', { name: /^Select$/i });
    const total = await selectButtons.count();
    if (total === 0) break;

    let changed = false;
    for (let i = 0; i < Math.min(total, 10) && (await getSelectedCount()) < 2; i += 1) {
      const ok = await clickAndVerifyIncrease(selectButtons.nth(i));
      if (ok) changed = true;
    }

    if (!changed) {
      await page.mouse.wheel(0, 1200);
      await page.waitForTimeout(350);
    }
  }

  await expect.poll(getSelectedCount, { timeout: 60000 }).toBeGreaterThanOrEqual(2);
  await clickWhenReady(page.getByRole('button', { name: /^Proceed$/ }).first(), page);
});

When('I confirm all quote journey statements of fact and proceed', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /statements of fact/i })).toBeVisible({ timeout: 120000 });

  const statementsHeading = page.getByRole('heading', { name: /statements of fact to agree/i }).first();
  await expect(statementsHeading).toBeVisible({ timeout: 120000 });

  const proceedButton = page
    .getByRole('button', { name: /^Proceed$/i })
    .or(page.getByRole('button', { name: /^Next$/i }))
    .first();
  const quotesHeading = page.getByRole('heading', { name: /quotes/i }).first();
  const blockedError = page.getByText(/To proceed, you must answer all Statements of Fact\./i).first();

  for (let cycle = 0; cycle < 8; cycle += 1) {
    for (let clickCount = 0; clickCount < 120; clickCount += 1) {
      const confirmButtons = page.getByRole('button', { name: /^Confirm$/i });
      const before = await confirmButtons.count();
      if (before === 0) {
        break;
      }

      const firstConfirm = confirmButtons.first();
      await firstConfirm.scrollIntoViewIfNeeded().catch(() => undefined);
      try {
        await firstConfirm.click({ timeout: 12000 });
      } catch {
        await firstConfirm.click({ force: true, timeout: 12000 });
      }
      await expect
        .poll(async () => confirmButtons.count(), { timeout: 7000 })
        .toBeLessThan(before)
        .catch(async () => {
          await page.waitForTimeout(300);
        });
    }

    await page.keyboard.press('End').catch(() => undefined);
    await proceedButton.scrollIntoViewIfNeeded().catch(() => undefined);
    await clickWhenReady(proceedButton, page);

    if (await quotesHeading.isVisible({ timeout: 10000 }).catch(() => false)) {
      return;
    }

    if (!(await blockedError.isVisible({ timeout: 1500 }).catch(() => false))) {
      await page.waitForTimeout(800);
      if (await quotesHeading.isVisible({ timeout: 7000 }).catch(() => false)) {
        return;
      }
    }
  }

  await expect(quotesHeading).toBeVisible({ timeout: 120000 });
});

When('I select a quote in quote journey', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /quotes/i })).toBeVisible({ timeout: 120000 });

  const pickFirstVisibleSelectQuote = async () => {
    const allSelectQuoteButtons = page.getByRole('button', { name: /Select quote/i });
    const total = await allSelectQuoteButtons.count();

    for (let i = 0; i < total; i += 1) {
      const button = allSelectQuoteButtons.nth(i);
      if (await button.isVisible({ timeout: 400 }).catch(() => false)) {
        await button.scrollIntoViewIfNeeded().catch(() => undefined);
        if (await button.isEnabled().catch(() => false)) {
          return button;
        }
      }
    }

    return null;
  };

  let selected = false;
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const axaCard = page.locator('article, div').filter({ hasText: /AXA XL/i }).first();
    const axaSelect = axaCard.getByRole('button', { name: /Select quote/i }).first();

    if (await axaSelect.isVisible({ timeout: 800 }).catch(() => false)) {
      await clickWhenReady(axaSelect, page);
      selected = true;
      break;
    }

    const fallbackSelect = await pickFirstVisibleSelectQuote();
    if (fallbackSelect) {
      await clickWhenReady(fallbackSelect, page);
      selected = true;
      break;
    }

    await page.mouse.wheel(0, 1200);
    await page.waitForTimeout(350);
  }

  if (!selected) {
    throw new Error('No visible enabled "Select quote" button was found on the Quotes page.');
  }

  await expect(page.getByRole('heading', { name: /final policy details/i })).toBeVisible({ timeout: 120000 });
});

When('I complete final policy details in quote journey', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /final policy details/i })).toBeVisible({ timeout: 120000 });

  let requiredInputs = page.locator('input[required]');
  await expect(requiredInputs.nth(0)).toBeVisible({ timeout: 30000 });
  await requiredInputs.nth(0).fill('John Smith');
  await requiredInputs.nth(1).fill('SW1A 1AA');
  await requiredInputs.nth(1).press('Tab').catch(() => {});

  const enterManually = page
    .getByRole('button', { name: /enter manually/i })
    .or(page.getByRole('link', { name: /enter manually/i }))
    .first();
  if (await enterManually.isVisible({ timeout: 3000 }).catch(() => false)) {
    await clickWhenReady(enterManually, page);
  }

  requiredInputs = page.locator('input[required]');
  await expect(requiredInputs.nth(2)).toBeVisible({ timeout: 30000 });
  await requiredInputs.nth(2).fill('10 Downing Street');
  await requiredInputs.nth(3).fill('London');

  await clickWhenReady(page.getByRole('button', { name: /next|proceed/i }).first(), page);
});

When('I place quote journey order with commencement date', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /^Summary$/i })).toBeVisible({ timeout: 120000 });
  await clickWhenReady(page.getByRole('button', { name: /Proceed to order/i }), page);

  const commencementDateInput = await pickFirstVisible([
    page.getByRole('textbox', { name: /commencement date/i }),
    page.locator('input[placeholder="DD/MM/YYYY"]'),
  ], 30000);

  await commencementDateInput.fill('14/04/2026');
  await clickWhenReady(page.getByRole('heading', { name: /Final policy details/i }).first(), page);

  const orderNow = page.getByRole('button', { name: /Order now/i }).first();
  await expect(orderNow).toBeEnabled({ timeout: 30000 });
  await clickWhenReady(orderNow, page);
});

Then('I should see policy issued and return to submission in quote journey', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /Policy issued/i })).toBeVisible({ timeout: 180000 });
  await clickWhenReady(page.getByRole('button', { name: /Return to submission/i }), page);
  await expect(page.getByRole('heading', { name: /Quote Journey|Submissions?/i })).toBeVisible({ timeout: 120000 });
});

Then('I should see residential policy issued and return to submission in quote journey', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /Policy issued/i })).toBeVisible({ timeout: 180000 });
  await expect(page.getByText(/Policy documents sent to/i)).toBeVisible({ timeout: 30000 });

  const policyText = await page.locator('body').innerText();
  const policyNumber = policyText.match(/DA-MLI-\d{9}/)?.[0];
  expect(policyNumber).toBeTruthy();

  await clickWhenReady(page.getByRole('button', { name: /Return to submission/i }), page);
  await expect(page.getByRole('heading', { name: /Quote Journey|Submissions?/i })).toBeVisible({ timeout: 120000 });
});

async function completeResidentialJourneyAndReturn(page: Page, multipleProducts: boolean) {
  const qjFields = getQuoteJourneyFieldValues();
  const residentialCaseRef = multipleProducts
    ? `SF-QJ-RES-MULTI-${Date.now()}`
    : `SF-QJ-E2E-${Date.now()}`;

  const sfCreds = getSalesforceCredentials();
  const salesforce = new SalesforcePortalPage(page);
  await salesforce.login(sfCreds.username, sfCreds.password, { useJwt: true, fast: true });
  await openQuoteJourney(page);

  await selectLookupOption(page, 'Broker Account', qjFields.brokerAccountQuery, qjFields.brokerAccountOption);
  await selectLookupOption(page, 'Broker User', qjFields.brokerUserQuery, qjFields.brokerUserOption);
  await selectComboboxOption(page, 'Brand', qjFields.brand);
  await selectComboboxOption(page, 'Quote Type', 'Residential');
  await selectComboboxOption(page, 'Jurisdiction', qjFields.jurisdiction);

  const caseRefInput = await pickFirstVisible([
    page.getByRole('textbox', { name: /my case reference|case reference|file number/i }),
    page.locator('input[placeholder*="case reference" i]'),
  ]);
  await caseRefInput.fill(residentialCaseRef);

  const loiInput = await pickFirstVisible([
    page.getByRole('spinbutton', { name: /limit of indemnity/i }),
    page.locator('input[type="number"][name*="limit" i]'),
    page.locator('input[aria-label*="Limit of indemnity"]'),
  ]);
  await loiInput.fill('500000');

  if (multipleProducts) {
    const getSelectedCount = async () => {
      const txt = await page.locator('body').innerText();
      return Number(txt.match(/You have selected\s+(\d+)\s+products?/i)?.[1] ?? '0');
    };

    const clickAndVerifyIncrease = async (button: Locator) => {
      const before = await getSelectedCount();
      await clickWhenReady(button, page);
      await page.waitForTimeout(350);
      const after = await getSelectedCount();
      return after > before;
    };

    const preferredProductNames = [/Adverse Possession/i, /Absence of easement - Access/i];
    for (const productName of preferredProductNames) {
      if ((await getSelectedCount()) >= 2) break;
      const card = page.locator('article, div').filter({ hasText: productName }).first();
      const selectButton = card.getByRole('button', { name: /select/i }).first();
      if (await selectButton.isVisible({ timeout: 5000 }).catch(() => false)) {
        await clickAndVerifyIncrease(selectButton);
      }
    }

    for (let attempts = 0; attempts < 12 && (await getSelectedCount()) < 2; attempts += 1) {
      const selectButtons = page.getByRole('button', { name: /^Select$/i });
      const total = await selectButtons.count();
      if (total === 0) break;

      let changed = false;
      for (let i = 0; i < Math.min(total, 10) && (await getSelectedCount()) < 2; i += 1) {
        const ok = await clickAndVerifyIncrease(selectButtons.nth(i));
        if (ok) changed = true;
      }

      if (!changed) {
        await page.mouse.wheel(0, 1200);
        await page.waitForTimeout(350);
      }
    }

    await expect.poll(getSelectedCount, { timeout: 60000 }).toBeGreaterThanOrEqual(2);
  } else {
    const adversePossessionCard = await pickFirstVisible([
      page.locator('article, div').filter({ hasText: /Adverse Possession/i }).first(),
      page.getByText(/Adverse Possession/i).first(),
    ]);
    const selectProductButton = adversePossessionCard.getByRole('button', { name: /select/i }).first();
    if (await selectProductButton.isVisible().catch(() => false)) {
      await clickWhenReady(selectProductButton, page);
    } else {
      await clickWhenReady(page.getByRole('button', { name: /^Select$/ }).first(), page);
    }
  }

  await clickWhenReady(page.getByRole('button', { name: /^Proceed$/ }).first(), page);

  await expect(page.getByRole('heading', { name: /statements of fact/i })).toBeVisible({ timeout: 120000 });
  for (let clickCount = 0; clickCount < 120; clickCount += 1) {
    const confirmButtons = page.getByRole('button', { name: /^Confirm$/i });
    const before = await confirmButtons.count();
    if (before === 0) break;
    const firstConfirm = confirmButtons.first();
    await firstConfirm.scrollIntoViewIfNeeded().catch(() => undefined);
    try {
      await firstConfirm.click({ timeout: 12000 });
    } catch {
      await firstConfirm.click({ force: true, timeout: 12000 });
    }
    await expect.poll(async () => confirmButtons.count(), { timeout: 7000 }).toBeLessThan(before).catch(() => undefined);
  }

  await clickWhenReady(page.getByRole('button', { name: /^Proceed$/i }).first(), page);
  await expect(page.getByRole('heading', { name: /quotes/i })).toBeVisible({ timeout: 120000 });

  const selectQuote = page.getByRole('button', { name: /Select quote/i }).first();
  await clickWhenReady(selectQuote, page);

  await expect(page.getByRole('heading', { name: /final policy details/i })).toBeVisible({ timeout: 120000 });
  let requiredInputs = page.locator('input[required]');
  await requiredInputs.nth(0).fill('John Smith');
  await requiredInputs.nth(1).fill('SW1A 1AA');
  await requiredInputs.nth(1).press('Tab').catch(() => {});

  const enterManually = page
    .getByRole('button', { name: /enter manually/i })
    .or(page.getByRole('link', { name: /enter manually/i }))
    .first();
  if (await enterManually.isVisible({ timeout: 3000 }).catch(() => false)) {
    await clickWhenReady(enterManually, page);
  }

  requiredInputs = page.locator('input[required]');
  await requiredInputs.nth(2).fill('10 Downing Street');
  await requiredInputs.nth(3).fill('London');
  await clickWhenReady(page.getByRole('button', { name: /next|proceed/i }).first(), page);

  await expect(page.getByRole('heading', { name: /^Summary$/i })).toBeVisible({ timeout: 120000 });
  await clickWhenReady(page.getByRole('button', { name: /Proceed to order/i }), page);

  const commencementDateInput = await pickFirstVisible([
    page.getByRole('textbox', { name: /commencement date/i }),
    page.locator('input[placeholder="DD/MM/YYYY"]'),
  ], 30000);
  await commencementDateInput.fill('14/04/2026');
  await clickWhenReady(page.getByRole('heading', { name: /Final policy details/i }).first(), page);

  const orderNow = page.getByRole('button', { name: /Order now/i }).first();
  await expect(orderNow).toBeEnabled({ timeout: 30000 });
  await clickWhenReady(orderNow, page);

  await expect(page.getByRole('heading', { name: /Policy issued/i })).toBeVisible({ timeout: 180000 });
  await clickWhenReady(page.getByRole('button', { name: /Return to submission/i }), page);
  await expect(page.getByRole('heading', { name: /Quote Journey|Submissions?/i })).toBeVisible({ timeout: 120000 });
}

Then('commercial quote journey should return to submission for sanity 005', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /Quote Journey|Submissions?/i }).first()).toBeVisible({ timeout: 120000 });
});

Given('I complete residential quote journey with one product and return to submission for sanity 006', async ({ page }) => {
  await completeResidentialJourneyAndReturn(page, false);
});

Then('residential quote journey should return to submission for sanity 006', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /Quote Journey|Submissions?/i }).first()).toBeVisible({ timeout: 120000 });
});

Given('I complete residential quote journey with multiple products and return to submission for sanity 007', async ({ page }) => {
  await completeResidentialJourneyAndReturn(page, true);
});

Then('residential quote journey should return to submission for sanity 007', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /Quote Journey|Submissions?/i }).first()).toBeVisible({ timeout: 120000 });
});
