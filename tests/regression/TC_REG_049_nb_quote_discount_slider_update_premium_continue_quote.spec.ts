import { test } from '@playwright/test';
import {
  FinalPolicyDetailsPage,
  LoginPage,
  OrderDialog,
  ProductSelectionPage,
  QuoteManagerPage,
  QuotesPage,
  StatementsOfFactPage,
  SummaryPage,
} from '../../src/pages/mlis-portal';
import { SalesforcePortalPage } from '../../src/pages/salesforce-cancellation';
import { TCReg049DiscountSliderPage } from '../../src/pages/tc-reg-049-discount-slider';
import { TCRegSharedUtilsPage } from '../../src/pages/tc-reg-shared-utils';
import { getBrokerCredentials, getSalesforceCredentials } from '../../src/config/env';

test.describe('@regression | E2E | NB | Quotes Discount Slider', () => {
  test('TC_REG_049 | Save and exit quote, then update discount on Salesforce Quotes tab and continue quote', async ({ page }) => {
    test.setTimeout(900000);
    test.slow();

    const caseRef = `E2E-NB-DISC-${Date.now()}`;

    const brokerLogin = new LoginPage(page);
    const quoteManager = new QuoteManagerPage(page);
    const productSelection = new ProductSelectionPage(page);
    const statements = new StatementsOfFactPage(page);
    const quotes = new QuotesPage(page);
    const finalDetails = new FinalPolicyDetailsPage(page);
    const summary = new SummaryPage(page);
    const orderDialog = new OrderDialog(page);
    const salesforce = new SalesforcePortalPage(page);
    const reg049 = new TCReg049DiscountSliderPage(page);
    const regUtils = new TCRegSharedUtilsPage(page);

    // Create NB quote up to Your Quotes page in Broker Portal.
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
    await reg049.clickSaveAndExitFromQuotes();
    await quoteManager.expectLoaded();

    await reg049.searchQuoteManagerByReference(caseRef);
    const policyNumber = await reg049.getGridMliReference(caseRef);

    // Login to Salesforce with dedicated default underwriter credentials.
    await salesforce.goto();
    const sfCreds = getSalesforceCredentials();
    await salesforce.login(sfCreds.username, sfCreds.password, { useJwt: true, fast: true });

    // Open policy, go to Quotes tab, adjust discount slider, update premium, continue quote.
    await reg049.searchSalesforceWithFallback(salesforce, policyNumber, caseRef);
    await salesforce.openQuotesTab1();
    await reg049.adjustDiscountAndContinueQuote();

    // Continue quote flow: wait for page, select quote, proceed, order, then return to submission.
    await reg049.completeQuoteJourneyAfterContinue(quotes, finalDetails, summary, orderDialog, salesforce);
    await salesforce.openRelatedTab();
    await salesforce.openInsurancePolicyFromRelatedStable(policyNumber);

    // Create MTA and fill mandatory reason + description.
    await salesforce.openCreateMTADialog();
    await salesforce.fillMTAReasonAndSave(
      'Exposure/Limit Changes',
      `MTA Description - edit terms check for ${policyNumber}`,
    );

    // Condition: open Quotes tab -> click Edit Terms -> assert Discount and Update Premium if present;
    // otherwise close dialog and continue the MTA flow.
    await salesforce.openQuotesTab1();
    await reg049.verifyEditTermsDiscountAndUpdatePremiumOrClose();
    await page.getByRole('tab', { name: /^Details$/i }).first().click();

    await salesforce.fillIntermediaryReference(`MTA-REF-${Date.now()}`);
    await salesforce.editMTAPremium('100');
    await salesforce.bindMTA();

    await regUtils.assertRiskIdVisible();

  });
});
