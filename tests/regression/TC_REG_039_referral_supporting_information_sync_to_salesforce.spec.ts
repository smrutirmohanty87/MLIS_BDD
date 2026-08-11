import { expect, test } from '@playwright/test';
import {
  CommercialLoginPage,
  CommercialProductSelectionPage,
  CommercialQuoteManagerPage,
  CommercialReferralDetailsPage,
  CommercialReferralSubmitPage,
  CommercialReferralSubmittedPage,
  CommercialStatementsOfFactPage,
} from '../../src/pages/mlis-portal-commercial';
import { SalesforcePortalPage } from '../../src/pages/salesforce-cancellation';
import { getBrokerCredentials, getSalesforceCredentials } from '../../src/config/env';

test.describe('@regression | E2E | Commercial | Referral | Salesforce Assertion', () => {
  test('TC_REG_039 | Assert Referral Supporting Information matches Broker Portal referral text', async ({ page }) => {
    test.setTimeout(900000);
    test.slow();

    const caseRef = `E2E-REF-SUPPORT-${Date.now()}`;
    const referralInfo = 'Automation referral supporting information sync validation';

    const loginPage = new CommercialLoginPage(page);
    const quoteManager = new CommercialQuoteManagerPage(page);
    const productSelection = new CommercialProductSelectionPage(page);
    const statements = new CommercialStatementsOfFactPage(page);
    const referralDetails = new CommercialReferralDetailsPage(page);
    const referralSubmit = new CommercialReferralSubmitPage(page);
    const referralSubmitted = new CommercialReferralSubmittedPage(page);
    const salesforce = new SalesforcePortalPage(page);

    // Create referral submission in Broker Portal.
    await loginPage.goto();
    const brokerCreds = getBrokerCredentials();
    await loginPage.login(brokerCreds.username, brokerCreds.password);
    await quoteManager.expectLoaded();

    await quoteManager.startCommercialEnglandWalesQuote();
    await productSelection.expectLoaded();
    await productSelection.fillCaseReferenceAndLimit(caseRef, '500000');

    await productSelection.selectProductsByIndex([1]);
    await productSelection.proceed();
    await statements.expectLoaded();

    await statements.proceedWithReferral();
    await referralDetails.expectLoaded();

    // Required assertion: verify referral text prompt line is visible.
    await expect(
      page.getByText(/Let us know why you could not confirm statement\(s\) of fact and any other relevant information\.?\*?/i).first(),
    ).toBeVisible({ timeout: 30000 });

    await referralDetails.fillRequiredDetails();

    // Enter explicit value in referral supporting information textbox.
    const referralNotes = page
      .getByRole('textbox', {
        name: /Let us know why you could not confirm statement\(s\) of fact and any other relevant information/i,
      })
      .first()
      .or(
        page
          .locator('xpath=//*[contains(normalize-space(.), "Let us know why you could not confirm statement")]/following::*[(self::textarea or self::input)][1]')
          .first(),
      )
      .first();

    await expect(referralNotes).toBeVisible({ timeout: 30000 });
    await referralNotes.fill(referralInfo);
    await referralNotes.press('Tab').catch(() => undefined);
    await expect(referralNotes).toHaveValue(referralInfo);

    await referralDetails.submitReferral();
    await referralSubmit.expectLoaded();
    await referralSubmit.submitToUnderwriter();
    await referralSubmitted.expectLoaded();
    await referralSubmitted.backToQuoteManager();
    await quoteManager.expectLoaded();

    // Get the exact generated reference (quote/policy) for this case.
    const searchAllFields = page.getByRole('textbox', { name: /Search all fields/i }).first();
    await expect(searchAllFields).toBeVisible({ timeout: 20000 });
    await searchAllFields.fill(caseRef);
    await searchAllFields.press('Enter').catch(() => undefined);
    const searchLink = page.getByRole('link', { name: /^Search$/i }).first();
    if (await searchLink.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchLink.click();
    }

    const escapedCaseRef = caseRef.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matchingRow = page.locator('tr:visible').filter({ hasText: new RegExp(escapedCaseRef, 'i') }).first();
    await expect(matchingRow).toBeVisible({ timeout: 30000 });

    const rowText = (await matchingRow.innerText()).replace(/\s+/g, ' ').trim();
    const quoteOrPolicyRef = rowText.match(/\b(?:DA|CP)-MLI-\d+\b/i)?.[0] ?? '';
    expect(quoteOrPolicyRef).toMatch(/^(?:DA|CP)-MLI-\d+$/i);

    // Search the same generated reference in Salesforce and open record from grid.
    await salesforce.goto();
    const sfCreds = getSalesforceCredentials();
    await salesforce.login(sfCreds.username, sfCreds.password, { useJwt: true, fast: true });

    let openedFromSearch = false;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        await salesforce.searchAndOpenExactFromGlobalSearchGrid(quoteOrPolicyRef);
        openedFromSearch = true;
        break;
      } catch (error) {
        if (attempt === 2) throw error;
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(4000);
      }
    }
    await expect(openedFromSearch).toBeTruthy();

    const detailsTab = page.getByRole('tab', { name: /^Details$/i }).first();
    await expect(detailsTab).toBeVisible({ timeout: 60000 });
    await detailsTab.click();

    const supportingInfoContainer = page
      .locator('records-record-layout-item:visible, .slds-form-element:visible, li:visible')
      .filter({ hasText: /Referral Supporting Information/i })
      .first();

    for (let i = 0; i < 20; i += 1) {
      if (await supportingInfoContainer.isVisible({ timeout: 500 }).catch(() => false)) break;
      await supportingInfoContainer.scrollIntoViewIfNeeded().catch(() => undefined);
      if (await supportingInfoContainer.isVisible({ timeout: 500 }).catch(() => false)) break;
      await page.mouse.wheel(0, 1000);
      await page.waitForTimeout(200);
    }

    await expect(supportingInfoContainer).toBeVisible({ timeout: 120000 });
    await expect(supportingInfoContainer).toContainText(/Referral Supporting Information/i);

    const supportingInfoValue = supportingInfoContainer
      .locator('lightning-formatted-text:visible, .slds-form-element__static:visible, .test-id__field-value:visible, span:visible, div:visible')
      .filter({ hasText: new RegExp(referralInfo.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') })
      .first();

    // Small incremental scroll until the value itself is visible in the viewport.
    for (let i = 0; i < 12; i += 1) {
      if (await supportingInfoValue.isVisible({ timeout: 400 }).catch(() => false)) break;
      await supportingInfoContainer.scrollIntoViewIfNeeded().catch(() => undefined);
      if (await supportingInfoValue.isVisible({ timeout: 400 }).catch(() => false)) break;
      await page.mouse.wheel(0, 350);
      await page.waitForTimeout(150);
    }

    await expect(supportingInfoValue).toBeVisible({ timeout: 120000 });
    await expect(supportingInfoValue).toContainText(referralInfo);
  });
});