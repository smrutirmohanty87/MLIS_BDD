import { createBdd, test } from 'playwright-bdd';
import { expect } from '@playwright/test';
import {
  CommercialLoginPage,
  CommercialPolicyIssuedPage,
  CommercialProductSelectionPage,
  CommercialQuoteManagerPage,
  CommercialReferralDetailsPage,
  CommercialReferralSubmitPage,
  CommercialStatementsOfFactPage,
} from '../../../../src/pages/mlis-portal-commercial';
import { getBrokerCredentials } from '../../../../src/config/env';

const { Given, When, Then } = createBdd(test);

Given('I start commercial quote with high limit and contaminated land condition', async ({ page }) => {
  const caseRef = `E2E-COND-REF-${Date.now()}`;
  const selectedProductName = "Contaminated Land - 'Failed' or 'Further Action' Environmental Search";
  const limitOfIndemnity = '6000000';

  const loginPage = new CommercialLoginPage(page);
  const quoteManager = new CommercialQuoteManagerPage(page);
  const productSelection = new CommercialProductSelectionPage(page);
  const statements = new CommercialStatementsOfFactPage(page);
  const referralDetails = new CommercialReferralDetailsPage(page);

  const selectProductByName = async (name: string) => {
    const filterInput = page.getByRole('textbox', { name: /filter this product list/i }).first();
    if (await filterInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await filterInput.fill(name);
    } else {
      const fallbackFilterInput = page.locator('input[placeholder*="Enter keywords to search for a product" i]').first();
      await expect(fallbackFilterInput).toBeVisible({ timeout: 15000 });
      await fallbackFilterInput.fill(name);
    }

    await page.waitForTimeout(800);

    const productNamePattern = new RegExp(`^\\s*${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
    const productLabel = page.locator('p, span, div').filter({ hasText: productNamePattern }).first();
    await expect(productLabel, `Product row not found for: ${name}`).toBeVisible({ timeout: 30000 });
    await productLabel.scrollIntoViewIfNeeded().catch(() => undefined);

    let selectButton = productLabel
      .locator('xpath=ancestor::*[self::article or self::tr or self::li or self::div][1]')
      .getByRole('button', { name: /^Select$/i })
      .first();

    if (!(await selectButton.isVisible({ timeout: 3000 }).catch(() => false))) {
      selectButton = page
        .locator(`xpath=//*[normalize-space(.)="${name.replace(/"/g, '\\"')}"]/following::button[normalize-space()="Select"][1]`)
        .first();
    }

    await expect(selectButton, `Select button not found for product: ${name}`).toBeVisible({ timeout: 20000 });
    await selectButton.click();

    const removeButton = page.getByRole('button', { name: /^Remove$/i }).first();
    await expect(removeButton).toBeVisible({ timeout: 15000 });
  };

  await loginPage.goto();
  const brokerCreds = getBrokerCredentials();
  await loginPage.login(brokerCreds.username, brokerCreds.password);
  await quoteManager.expectLoaded();

  await quoteManager.startCommercialEnglandWalesQuote();
  await productSelection.expectLoaded();

  const caseRefInput = page.getByRole('textbox', { name: 'My case reference/ file number' });
  await caseRefInput.fill(caseRef);
  await caseRefInput.press('Tab');

  const limitInput = page.getByRole('spinbutton', { name: 'Limit of indemnity' });
  await limitInput.fill(limitOfIndemnity);
  await limitInput.press('Tab');
  await expect(limitInput).toHaveValue(/6,000,000\.00|6000000/, { timeout: 10000 });

  await selectProductByName(selectedProductName);
  await productSelection.proceed();
  await statements.expectLoaded();

  await statements.proceedWithReferral();
  await referralDetails.expectLoaded();
  await referralDetails.fillRequiredDetails();
});

When('I submit the conditional referral to underwriter', async ({ page }) => {
  const referralDetails = new CommercialReferralDetailsPage(page);
  const referralSubmit = new CommercialReferralSubmitPage(page);

  await referralDetails.submitReferral();
  await referralSubmit.expectLoaded();
  await referralSubmit.submitToUnderwriter();
});

Then('conditional referral policy should be issued and return to quote manager', async ({ page }) => {
  const policyIssued = new CommercialPolicyIssuedPage(page);
  const quoteManager = new CommercialQuoteManagerPage(page);

  await policyIssued.expectPolicyIssued(/^[A-Z]{2,3}-MLI-\d{9}$/);
  await policyIssued.backToQuoteManager();
  await quoteManager.expectLoaded();
});
