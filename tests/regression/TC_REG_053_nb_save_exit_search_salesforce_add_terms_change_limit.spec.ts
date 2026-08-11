import { expect, test } from '@playwright/test';
import {
  FinalPolicyDetailsPage,
  LoginPage,
  ProductSelectionPage,
  QuoteManagerPage,
  QuotesPage,
  StatementsOfFactPage,
  SummaryPage,
} from '../../src/pages/mlis-portal';
import { SalesforcePortalPage } from '../../src/pages/salesforce-cancellation';
import { TCReg052AddTermsPage } from '../../src/pages/tc-reg-052-add-terms';
import { getBrokerCredentials, getSalesforceCredentials } from '../../src/config/env';

test.describe('@regression | E2E | NB | Save Exit | Global Search | Add Terms | Change Limit', () => {
  test('TC_REG_053 | Continue to summary, save and exit, search ref on home and in Salesforce global search, add terms, then change limit and save and rate', async ({ page }) => {
    test.setTimeout(900000);
    test.slow();

    const caseRef = `E2E-NB-SAVE-EXIT-${Date.now()}`;

    const brokerLogin = new LoginPage(page);
    const quoteManager = new QuoteManagerPage(page);
    const productSelection = new ProductSelectionPage(page);
    const statements = new StatementsOfFactPage(page);
    const quotes = new QuotesPage(page);
    const finalDetails = new FinalPolicyDetailsPage(page);
    const summary = new SummaryPage(page);
    const salesforce = new SalesforcePortalPage(page);
    const reg052 = new TCReg052AddTermsPage(page);

    // Create a new business quote and continue until Summary page.
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
    await reg052.clickSaveAndExit();
    await quoteManager.expectLoaded();

    // Search Quote/Policy reference on the home page and capture the generated reference.
    await reg052.searchQuoteManagerByReference(caseRef);
    const policyReference = await reg052.getGridReference(caseRef);

    // Open Salesforce, use global search, and open the Submission record.
    await salesforce.goto();
    const sfCreds = getSalesforceCredentials();
    await salesforce.login(sfCreds.username, sfCreds.password, { useJwt: true, fast: true });
    await reg052.searchSalesforceAndOpenExactPolicyFromGrid(salesforce, policyReference);

    // 1) Add terms: Statement of Fact.
    await reg052.clickAddTermsAndWait();
    await reg052.completeAddTermsAndSave('Statement of Fact', `Automated add terms note (SOF): ${caseRef}`);

    // 2) Add terms again: Terms and Condition.
    await reg052.clickAddTermsAndWait();
    await reg052.completeAddTermsAndSave('Terms and Condition', `Automated add terms note (T&C): ${caseRef}`);

    // 3) Add terms again: Uninsured matters.
    await reg052.clickAddTermsAndWait();
    await reg052.completeAddTermsAndSave('Uninsured matters', `Automated add terms note (Uninsured): ${caseRef}`);
    
    // 4) Change limit and save and rate, then change stage and save, then edit submission statement of facts and save.
    await reg052.changeLimitAndSaveAndRate('192345');
    await reg052.manageProductsAddAndSaveRate('Absence of easement - Services');
    await reg052.changeStageAndSave('In Progress');
    await reg052.editSubmissionStatementOfFactsAndSave(' Additional text added after Change Stage.');
  });
});
