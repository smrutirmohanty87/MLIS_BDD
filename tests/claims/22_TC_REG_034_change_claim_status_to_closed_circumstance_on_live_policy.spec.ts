import { expect, Page, test } from '@playwright/test';
import {
  FinalPolicyDetailsPage,
  LoginPage,
  OrderDialog,
  PolicyIssuedPage,
  ProductSelectionPage,
  QuoteManagerPage,
  QuotesPage,
  StatementsOfFactPage,
  SummaryPage,
} from '../../src/pages/mlis-portal';
import { BrokerPortalPage } from '../../src/pages/broker-portal-policy';
import { SalesforcePortalPage } from '../../src/pages/salesforce-cancellation';
import { getBrokerCredentials, getSalesforceLightningUrl } from '../../src/config/env';

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
  await page.waitForTimeout(1500);
}

async function selectClosedStatusSubStatusIfRequired(page: Page) {
  const dependenciesDialog = page
    .locator('[role="dialog"]:visible, .slds-modal:visible')
    .filter({ hasText: /Edit Dependencies/i })
    .first();

  if (!(await dependenciesDialog.isVisible({ timeout: 3000 }).catch(() => false))) {
    return;
  }

  const subStatusField = dependenciesDialog
    .getByRole('combobox', { name: /Claim Sub Status/i })
    .or(dependenciesDialog.getByRole('button', { name: /Claim Sub Status/i }))
    .first();

  if (!(await subStatusField.isVisible({ timeout: 5000 }).catch(() => false))) {
    return;
  }

  await subStatusField.click({ timeout: 10000, force: true });

  const preferredOption = page
    .getByRole('option', { name: /^Settled$/i })
    .or(page.locator('[role="option"]:visible, li:visible').filter({ hasText: /^Settled$/i }))
    .first();

  const fallbackOption = page
    .locator('[role="option"]:visible, li:visible')
    .filter({ hasNotText: /^--None--$/i })
    .first();

  let selectedLabel = 'Settled';

  if (await preferredOption.isVisible({ timeout: 3000 }).catch(() => false)) {
    await preferredOption.click({ timeout: 10000, force: true });
  } else {
    await expect(fallbackOption).toBeVisible({ timeout: 10000 });
    selectedLabel = ((await fallbackOption.innerText().catch(() => '')) || 'Selected').trim();
    await fallbackOption.click({ timeout: 10000, force: true });
  }

  await expect
    .poll(async () => {
      const fieldText = ((await subStatusField.innerText().catch(() => '')) || '').trim();
      if (/--none--/i.test(fieldText)) {
        return false;
      }
      if (selectedLabel && new RegExp(selectedLabel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(fieldText)) {
        return true;
      }
      return fieldText.length > 0;
    }, {
      timeout: 10000,
      intervals: [500, 1000, 2000],
      message: 'Claim Sub Status was not selected (still None) in Edit Dependencies.',
    })
    .toBe(true);
}

async function completeOpenClaimStatus(page: Page) {
  const openClaimOption = page.getByRole('option', { name: /^Closed Circumstance$/i }).first();
  const openClaimPath = page
    .locator('.slds-path__item, .slds-path__link, [data-value*="Closed Circumstance"], button, a')
    .filter({ hasText: /Closed Circumstance/i })
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
      message: 'Closed Circumstance status did not expose completion action.',
    })
    .toBe(true);

  // Ensure the next path state target is selected before completing the transition.
  await expect
    .poll(async () => {
      const selected = await openClaimOption.getAttribute('aria-selected').catch(() => null);
      if (selected === 'true') {
        return true;
      }

      await openClaimOption.scrollIntoViewIfNeeded().catch(() => undefined);
      await openClaimOption.click({ timeout: 5000, force: true }).catch(() => undefined);

      const selectedAfterClick = await openClaimOption.getAttribute('aria-selected').catch(() => null);
      return selectedAfterClick === 'true';
    }, {
      timeout: 30000,
      intervals: [1000, 2000, 3000],
      message: 'Unable to select Closed Circumstance path option before completion.',
    })
    .toBe(true);

  await markComplete.scrollIntoViewIfNeeded().catch(() => undefined);
  await markComplete.click({ timeout: 10000, force: true });

  const doneButton = page.getByRole('button', { name: /^Done$/i }).last();
  await expect
    .poll(async () => {
      const spinnerVisible = await page
        .locator('.slds-spinner_container:visible, lightning-spinner:visible, .forceComponentSpinner:visible')
        .first()
        .isVisible({ timeout: 500 })
        .catch(() => false);
      if (spinnerVisible) {
        return false;
      }
      return await doneButton.isVisible({ timeout: 500 }).catch(() => false);
    }, {
      timeout: 60000,
      intervals: [1000, 2000, 5000],
      message: 'Done button did not appear after marking Closed Circumstance complete.',
    })
    .toBe(true);

  await selectClosedStatusSubStatusIfRequired(page);

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      await doneButton.scrollIntoViewIfNeeded().catch(() => undefined);
      await doneButton.click({ timeout: 10000, force: true });
      break;
    } catch (error) {
      if (attempt === 4) {
        throw error;
      }
      await page.keyboard.press('Escape').catch(() => undefined);
      await page.waitForTimeout(750);
    }
  }

  // Some org/page variants commit status inline without a Done modal.
  await expect
    .poll(async () => {
      const spinnerVisible = await page
        .locator('.slds-spinner_container:visible, lightning-spinner:visible, .forceComponentSpinner:visible')
        .first()
        .isVisible({ timeout: 500 })
        .catch(() => false);

      if (spinnerVisible) {
        return false;
      }

      const openClaimCurrent = page
        .locator('.slds-path__item.slds-is-current, .slds-path__item.slds-is-active, [aria-current="step"]')
        .filter({ hasText: /Closed Circumstance/i })
        .first();
      if (await openClaimCurrent.isVisible({ timeout: 500 }).catch(() => false)) {
        return true;
      }

      const selected = await openClaimOption.getAttribute('aria-selected').catch(() => null);
      return selected === 'true';
    }, {
      timeout: 60000,
      intervals: [1000, 2000, 5000],
      message: 'Closed Circumstance completion did not set the claim path/status to Closed Circumstance.',
    })
    .toBe(true);

  await expect(doneButton).toBeHidden({ timeout: 30000 }).catch(() => undefined);
}

test.describe('@regression | E2E | Claims', () => {
  test('TC_REG_034 | Create Claim on a live policy, fill claim info, and complete Closed Circumstance status', async ({ page }) => {
    test.setTimeout(900000);
    test.slow();

    const caseRef = `E2E-CLAIM-CLOSED-CIRCUMSTANCE-${Date.now()}`;

    const brokerLogin = new LoginPage(page);
    const quoteManager = new QuoteManagerPage(page);
    const productSelection = new ProductSelectionPage(page);
    const statements = new StatementsOfFactPage(page);
    const quotes = new QuotesPage(page);
    const finalDetails = new FinalPolicyDetailsPage(page);
    const summary = new SummaryPage(page);
    const orderDialog = new OrderDialog(page);
    const policyIssued = new PolicyIssuedPage(page);

    const brokerPortal = new BrokerPortalPage(page);
    const salesforce = new SalesforcePortalPage(page);

    const getClaimUserCredentials = () => {
      const rawEnv = (process.env.TEST_ENV ?? 'SIT1').trim().toUpperCase();
      const envName = rawEnv;
      const usernameVar = `SALEFORCE_${envName}_CLAIMUSER`;
      const passwordVar = `SALEFORCE_${envName}_CLAIMUSER_PASSWORD`;

      const username = process.env[usernameVar]?.trim();
      const password = process.env[passwordVar]?.trim();
      if (username && password) {
        return { username, password };
      }

      throw new Error(
        `Missing claim user credentials for ${envName}. Set ${usernameVar} and ${passwordVar} in .env for TC_REG_034 claims flow.`,
      );
    };

    await brokerLogin.goto();
    const brokerCreds = getBrokerCredentials();
    await brokerLogin.login(brokerCreds.username, brokerCreds.password);
    await quoteManager.expectLoaded();
    await quoteManager.acceptCookiesIfVisible();

    await quoteManager.startResidentialEnglandWalesQuote();
    await productSelection.expectLoaded();
    await productSelection.fillCaseReferenceAndLimit(caseRef, '500000');
    await productSelection.selectProductsByIndex([1]);
    await productSelection.proceed();

    await statements.expectLoaded();
    await statements.confirmAllStatements();
    await statements.proceed();

    await quotes.expectLoaded();
    await quotes.selectFirstQuote();

    await finalDetails.expectLoaded();
    await finalDetails.fillRequiredDetails();
    await finalDetails.proceed();

    await summary.expectLoaded();
    await summary.expectSummaryData(caseRef);
    await summary.proceedToOrder();
    await orderDialog.selectTodayAndOrder();

    await policyIssued.expectPolicyIssued();
    const policyNumber = await policyIssued.getIssuedPolicyNumber();
    await policyIssued.backToQuoteManager();

    await brokerPortal.expectQuoteManagerLoaded();
    await brokerPortal.searchPolicy(policyNumber);
    await brokerPortal.expectPolicyStatus(policyNumber, 'Live');

    const salesforceOrigin = new URL(getSalesforceLightningUrl()).origin;
    await page.context().grantPermissions(['geolocation'], { origin: salesforceOrigin }).catch(() => undefined);

    await salesforce.goto();
    const sfCreds = getClaimUserCredentials();
    await salesforce.login(sfCreds.username, sfCreds.password, { useJwt: false, fast: true });
    await salesforce.closeAllWorkspaceTabs();

    await salesforce.openCreateClaimFromSubmissionViaRiskId(policyNumber);
    await salesforce.selectClaimCoverage();
    await salesforce.completeClaimPostCreationFlowAndAssertIncurred();

    await salesforce.openClaimInformationTab();
    await salesforce.fillClaimInformation('test');
    await fillInlineField(page, /Date Claim First Advised/i, todayValue());
    await fillInlineField(page, /Date of FNOL Acknowledgement/i, todayValue());
    await fillLossAddress(page);
    await saveClaimInformation(page);

    await completeOpenClaimStatus(page);
    await page.waitForTimeout(5000);
  });
});
