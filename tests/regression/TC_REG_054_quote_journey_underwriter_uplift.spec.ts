import { expect, test } from '@playwright/test';
import { getQuoteJourneyFieldValues, getSalesforceCredentials } from '../../src/config/env';
import { SalesforcePortalPage } from '../../src/pages/salesforce-cancellation';
import { QuoteJourneyUnderwriterUpliftPage } from '../../src/pages/quote-journey-underwriter-uplift';

test.describe('@regression | E2E | Quote Journey | Underwriter Uplift', () => {
  test('TC_REG_050 | Complete quote journey and verify quote uplift values on Quotes tab', async ({ page }) => {
    test.setTimeout(900000);
    test.slow();

    const caseRef = `REG-QJ-UPLIFT-${Date.now()}`;
    const sfCreds = getSalesforceCredentials();
    const qjFields = getQuoteJourneyFieldValues();
    const upliftDate = new Date();
    upliftDate.setDate(upliftDate.getDate() + 5);
    const orderDate = upliftDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

    const salesforce = new SalesforcePortalPage(page);
    const quoteJourney = new QuoteJourneyUnderwriterUpliftPage(page);

    await salesforce.login(sfCreds.username, sfCreds.password, { useJwt: true, fast: true });

    await quoteJourney.openQuoteJourney();
    await quoteJourney.selectLookupOption('Broker Account', qjFields.brokerAccountQuery, qjFields.brokerAccountOption);
    await quoteJourney.selectLookupOption('Broker User', qjFields.brokerUserQuery, qjFields.brokerUserOption);
    await quoteJourney.selectComboboxOption('Brand', qjFields.brand);
    await quoteJourney.selectComboboxOption('Quote Type', 'Commercial');
    await quoteJourney.selectComboboxOption('Jurisdiction', qjFields.jurisdiction);

    await page.getByRole('textbox', { name: /my case reference|case reference|file number/i }).fill(caseRef);
    await page.getByRole('spinbutton', { name: /limit of indemnity/i }).fill('500000');

    await quoteJourney.selectPreferredProduct();
    await quoteJourney.proceedFromProductSelection();
    await quoteJourney.confirmStatementsOfFact();
    await quoteJourney.selectFirstQuote();
    await quoteJourney.fillFinalPolicyDetailsAndProceed();

    await expect(page.getByRole('heading', { name: /^Summary$/i })).toBeVisible({ timeout: 120000 });
    await quoteJourney.openAndCloseFinalDraft();
    await page.getByRole('button', { name: /Proceed to order/i }).first().click();
    await quoteJourney.setCommencementDate(orderDate);
    await quoteJourney.clickOrderNowIfVisible();

    await expect(page.getByRole('heading', { name: /Policy issued/i })).toBeVisible({ timeout: 180000 });
    await page.getByRole('button', { name: /Return to submission/i }).first().click();

    await expect(page.getByRole('heading', { name: /Quote Journey|Submissions?/i })).toBeVisible({ timeout: 120000 });

    await quoteJourney.openQuotesTab();
    const { original, overridden, cardText } = await quoteJourney.getUnderwriterUpliftPremiums();

    expect(cardText).toContain('Has Underwriter Uplift');
    expect(overridden).toBeCloseTo(Number((original * 1.2).toFixed(2)), 2);
  });
});
