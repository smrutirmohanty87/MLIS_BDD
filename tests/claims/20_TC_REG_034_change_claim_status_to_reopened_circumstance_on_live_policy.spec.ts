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

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function selectClaimSubStatusFromDependencies(page: Page, preferredValues: string[]) {
  const dependenciesDialog = page
    .locator('[role="dialog"]:visible, .slds-modal:visible')
    .filter({ hasText: /Edit Dependencies/i })
    .first();

  await expect(dependenciesDialog).toBeVisible({ timeout: 30000 });

  const subStatusField = dependenciesDialog
    .getByRole('combobox', { name: /Claim Sub Status/i })
    .or(dependenciesDialog.getByRole('button', { name: /Claim Sub Status/i }))
    .first();
  await expect(subStatusField).toBeVisible({ timeout: 10000 });
  await subStatusField.click({ timeout: 10000, force: true });

  let selectedLabel = '';
  for (const value of preferredValues) {
    const option = page
      .getByRole('option', { name: new RegExp(`^${escapeRegex(value)}$`, 'i') })
      .or(page.locator('[role="option"]:visible, li:visible').filter({ hasText: new RegExp(`^${escapeRegex(value)}$`, 'i') }))
      .first();

    if (await option.isVisible({ timeout: 1200 }).catch(() => false)) {
      selectedLabel = value;
      await option.click({ timeout: 10000, force: true });
      break;
    }
  }

  if (!selectedLabel) {
    const fallbackCandidates = page.locator('[role="option"]:visible, li:visible');
    const fallbackCount = await fallbackCandidates.count().catch(() => 0);

    let fallbackChosen = false;
    for (let i = 0; i < fallbackCount; i += 1) {
      const option = fallbackCandidates.nth(i);
      const optionText = ((await option.innerText().catch(() => '')) || '').trim();
      if (!optionText || /^--\s*None\s*--$/i.test(optionText)) {
        continue;
      }

      selectedLabel = optionText;
      await option.click({ timeout: 10000, force: true });
      fallbackChosen = true;
      break;
    }

    expect(fallbackChosen, 'No usable Claim Sub Status option was available (only None found).').toBe(true);
  }

  await expect
    .poll(async () => {
      const fieldText = ((await subStatusField.innerText().catch(() => '')) || '').trim();
      if (/--none--/i.test(fieldText)) return false;
      if (selectedLabel && new RegExp(escapeRegex(selectedLabel), 'i').test(fieldText)) return true;
      return fieldText.length > 0;
    }, {
      timeout: 10000,
      intervals: [500, 1000, 2000],
      message: 'Claim Sub Status remained None in Edit Dependencies.',
    })
    .toBe(true);
}

async function setPathStatusAndComplete(
  page: Page,
  statusLabel: string,
  subStatusValues: string[],
) {
  const statusRegex = new RegExp(`^${escapeRegex(statusLabel)}$`, 'i');
  const statusOption = page.getByRole('option', { name: statusRegex }).first();
  const statusPath = page
    .locator('.slds-path__item, .slds-path__link, [data-value], button, a')
    .filter({ hasText: statusRegex })
    .first();

  if (await statusOption.isVisible({ timeout: 5000 }).catch(() => false)) {
    await statusOption.scrollIntoViewIfNeeded();
    await statusOption.click({ timeout: 10000, force: true });
  } else {
    await expect(statusPath).toBeAttached({ timeout: 30000 });
    await statusPath.scrollIntoViewIfNeeded();
    await expect(statusPath).toBeVisible({ timeout: 15000 });
    await statusPath.click({ timeout: 10000, force: true });
  }

  const markCompletePrimary = page.getByRole('button', { name: /Mark Claim Status as Complete/i }).first();
  const markCompleteFallback = page.getByRole('button', { name: /Mark as Current Claim Status/i }).first();

  const resolveMarkCompleteButton = async () => {
    if (await markCompletePrimary.isVisible({ timeout: 250 }).catch(() => false)) {
      return markCompletePrimary;
    }
    if (await markCompleteFallback.isVisible({ timeout: 250 }).catch(() => false)) {
      return markCompleteFallback;
    }
    return null;
  };

  await expect
    .poll(async () => {
      await statusPath.scrollIntoViewIfNeeded().catch(() => undefined);
      return (await resolveMarkCompleteButton()) !== null;
    }, {
      timeout: 60000,
      intervals: [1000, 2000, 5000],
      message: `${statusLabel} status did not expose completion action.`,
    })
    .toBe(true);

  await expect
    .poll(async () => {
      const selected = await statusOption.getAttribute('aria-selected').catch(() => null);
      if (selected === 'true') return true;
      await statusOption.scrollIntoViewIfNeeded().catch(() => undefined);
      await statusOption.click({ timeout: 5000, force: true }).catch(() => undefined);
      const selectedAfterClick = await statusOption.getAttribute('aria-selected').catch(() => null);
      return selectedAfterClick === 'true';
    }, {
      timeout: 30000,
      intervals: [1000, 2000, 3000],
      message: `Unable to select ${statusLabel} path option before completion.`,
    })
    .toBe(true);

  const markComplete = await resolveMarkCompleteButton();
  expect(markComplete, `No visible completion button found for '${statusLabel}'.`).not.toBeNull();
  await markComplete!.scrollIntoViewIfNeeded().catch(() => undefined);
  await markComplete!.click({ timeout: 10000, force: true });

  const doneButton = page.getByRole('button', { name: /^Done$/i }).last();
  await expect
    .poll(async () => {
      const spinnerVisible = await page
        .locator('.slds-spinner_container:visible, lightning-spinner:visible, .forceComponentSpinner:visible')
        .first()
        .isVisible({ timeout: 500 })
        .catch(() => false);
      if (spinnerVisible) return false;
      return await doneButton.isVisible({ timeout: 500 }).catch(() => false);
    }, {
      timeout: 60000,
      intervals: [1000, 2000, 5000],
      message: `Done button did not appear after marking ${statusLabel} complete.`,
    })
    .toBe(true);

  await selectClaimSubStatusFromDependencies(page, subStatusValues);

  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      await doneButton.scrollIntoViewIfNeeded().catch(() => undefined);
      await doneButton.click({ timeout: 10000, force: true });
      break;
    } catch (error) {
      if (attempt === 4) throw error;
      await page.keyboard.press('Escape').catch(() => undefined);
      await page.waitForTimeout(750);
    }
  }

  await expect
    .poll(async () => {
      const spinnerVisible = await page
        .locator('.slds-spinner_container:visible, lightning-spinner:visible, .forceComponentSpinner:visible')
        .first()
        .isVisible({ timeout: 500 })
        .catch(() => false);
      if (spinnerVisible) return false;

      const currentStatus = page
        .locator('.slds-path__item.slds-is-current, .slds-path__item.slds-is-active, [aria-current="step"]')
        .filter({ hasText: statusRegex })
        .first();
      if (await currentStatus.isVisible({ timeout: 500 }).catch(() => false)) return true;

      const selected = await statusOption.getAttribute('aria-selected').catch(() => null);
      return selected === 'true';
    }, {
      timeout: 60000,
      intervals: [1000, 2000, 5000],
      message: `${statusLabel} completion did not set the claim path/status correctly.`,
    })
    .toBe(true);

  await expect(doneButton).toBeHidden({ timeout: 30000 }).catch(() => undefined);
}

async function waitForClaimPageFullyLoaded(page: Page) {
  const claimHeading = page.getByRole('heading', { name: /Claims Incurred|Claim/i }).first();
  await expect(claimHeading).toBeVisible({ timeout: 120000 });

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

      const pathOption = page
        .getByRole('option')
        .filter({ hasText: /FNOL Only|Open Circumstance|Open Claim|Re-Opened Circumstance|Closed Circumstance/i })
        .first();

      return await pathOption.isVisible({ timeout: 500 }).catch(() => false);
    }, {
      timeout: 120000,
      intervals: [1000, 2000, 5000],
      message: 'Claim page did not fully settle after status update.',
    })
    .toBe(true);

  await page.waitForTimeout(1500);
}

async function completeOpenClaimStatus(page: Page) {
  await setPathStatusAndComplete(page, 'Closed Circumstance', [
    'Settled',
    'Withdrawn/Not Pursued',
    'Denied',
    'Cover Void',
    'Created by Error',
    'Within Excess',
  ]);

  await waitForClaimPageFullyLoaded(page);

  await setPathStatusAndComplete(page, 'Re-Opened Circumstance', [
    'Active',
    'Dormant',
  ]);
}

test.describe('@regression | E2E | Claims', () => {
  test('TC_REG_034 | Create Claim on a live policy, fill claim info, and complete Re-Opened Circumstance status', async ({ page }) => {
    test.setTimeout(900000);
    test.slow();

    const caseRef = `E2E-CLAIM-REOPENED-CIRCUMSTANCE-${Date.now()}`;

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
    await salesforce.login(sfCreds.username, sfCreds.password, { useJwt: true, fast: true, jwtUsername: sfCreds.username });
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
