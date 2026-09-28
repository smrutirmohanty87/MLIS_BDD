import { createBdd, test } from 'playwright-bdd';
import { expect } from '@playwright/test';
import {
  LoginPage,
  ProductSelectionPage,
  QuoteManagerPage,
  StatementsOfFactPage,
} from '../../../../src/pages/mlis-portal';
import {
  CommercialReferralDetailsPage,
  CommercialReferralSubmitPage,
  CommercialReferralSubmittedPage,
} from '../../../../src/pages/mlis-portal-commercial';
import { getBrokerCredentials } from '../../../../src/config/env';

const { Given, When, Then } = createBdd(test);

let residentialReferralQuoteNumber = '';

Given('I start residential referral quote with limit above 5 million', async ({ page }) => {
  const caseRef = `E2E-RES-REF-LIMITGT5M-${Date.now()}`;

  const loginPage = new LoginPage(page);
  const quoteManager = new QuoteManagerPage(page);
  const productSelection = new ProductSelectionPage(page);
  const statements = new StatementsOfFactPage(page);
  const referralDetails = new CommercialReferralDetailsPage(page);

  await loginPage.goto();
  const brokerCreds = getBrokerCredentials();
  await loginPage.login(brokerCreds.username, brokerCreds.password);
  await quoteManager.expectLoaded();

  await quoteManager.startResidentialEnglandWalesQuote();
  await productSelection.expectLoaded();
  await productSelection.fillCaseReferenceAndLimit(caseRef, '6000000');
  await productSelection.selectProductsByIndex([1, 2, 3, 4]);
  await productSelection.proceed();
  await statements.expectLoaded();

  const cannotConfirmButtons = page
    .getByRole('button', { name: /Cannot\s*confirm/i })
    .filter({ hasNotText: /Proceed with referral/i });

  await expect(cannotConfirmButtons.first()).toBeVisible({ timeout: 30000 });
  const count = await cannotConfirmButtons.count();
  for (let i = 0; i < count; i += 1) {
    const button = cannotConfirmButtons.nth(i);
    await button.scrollIntoViewIfNeeded();
    await button.click();
  }

  const proceedWithReferral = page.getByRole('button', { name: /Proceed\s+with\s+ref+err?al/i }).first();
  await expect(proceedWithReferral).toBeVisible({ timeout: 30000 });
  await expect(proceedWithReferral).toBeEnabled({ timeout: 30000 });
  await proceedWithReferral.click();
  await referralDetails.expectLoaded();

  await referralDetails.fillRequiredDetails();
});

When('I submit residential high limit referral to underwriter', async ({ page }) => {
  const referralDetails = new CommercialReferralDetailsPage(page);
  const referralSubmit = new CommercialReferralSubmitPage(page);
  const referralSubmitted = new CommercialReferralSubmittedPage(page);

  await referralDetails.submitReferral();
  await referralSubmit.expectLoaded();
  await referralSubmit.submitToUnderwriter();
  await referralSubmitted.expectLoaded();

  const submittedQuoteNumber = page
    .locator('strong', { hasText: 'Quote number' })
    .locator('xpath=following::p[1]')
    .first();
  await expect(submittedQuoteNumber).toBeVisible({ timeout: 20000 });
  residentialReferralQuoteNumber = ((await submittedQuoteNumber.textContent()) ?? '').trim();
});

Then('residential referral should be submitted with valid DA quote number', async ({ page }) => {
  expect(residentialReferralQuoteNumber).toMatch(/^DA-MLI-\d{9}$/);

  const referralSubmitted = new CommercialReferralSubmittedPage(page);
  const quoteManager = new QuoteManagerPage(page);
  await referralSubmitted.backToQuoteManager();
  await quoteManager.expectLoaded();
});
