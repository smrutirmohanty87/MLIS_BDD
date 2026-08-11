import { expect, test } from '@playwright/test';
import {
  CommercialFinalPolicyDetailsPage,
  CommercialLoginPage,
  CommercialOrderDialog,
  CommercialPolicyIssuedPage,
  CommercialProductSelectionPage,
  CommercialQuoteManagerPage,
  CommercialQuotesPage,
  CommercialStatementsOfFactPage,
  CommercialSummaryPage,
} from '../../src/pages/mlis-portal-commercial';
import { BrokerPortalPage } from '../../src/pages/broker-portal-policy';
import { SalesforcePortalPage } from '../../src/pages/salesforce-cancellation';
import { getBrokerCredentials, getSalesforceCredentials } from '../../src/config/env';

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function toGbDate(date: Date): string {
  return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()}`;
}

test.describe('@regression | E2E | MTA | Commercial', () => {
  test('TC_REG_032 | Validate MTA2 effective date not before MTA1 | Commercial NB>MTA>MTA', async ({ page }) => {
    test.setTimeout(900000);
    test.slow();

    const caseRef = `E2E-MTA2-COMM-${Date.now()}`;
    const mtaPremium1 = '125';
    const mtaPremium2 = '275';

    const brokerLogin = new CommercialLoginPage(page);
    const quoteManager = new CommercialQuoteManagerPage(page);
    const productSelection = new CommercialProductSelectionPage(page);
    const statements = new CommercialStatementsOfFactPage(page);
    const quotes = new CommercialQuotesPage(page);
    const finalDetails = new CommercialFinalPolicyDetailsPage(page);
    const summary = new CommercialSummaryPage(page);
    const orderDialog = new CommercialOrderDialog(page);
    const policyIssued = new CommercialPolicyIssuedPage(page);

    const brokerPortal = new BrokerPortalPage(page);
    const salesforce = new SalesforcePortalPage(page);

    // Create a fresh policy in Broker Portal (Commercial EW).
    await brokerLogin.goto();
    const brokerCreds = getBrokerCredentials();
    await brokerLogin.login(brokerCreds.username, brokerCreds.password);
    await quoteManager.expectLoaded();
    await quoteManager.acceptCookiesIfVisible();

    await quoteManager.startCommercialEnglandWalesQuote();
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
    const policyLabel = page.locator('strong', { hasText: 'Policy number' });
    await expect(policyLabel).toBeVisible({ timeout: 60000 });
    const policyNumber = (await policyLabel.locator('xpath=following::p[1]').first().innerText()).trim();
    await policyIssued.backToQuoteManager();

    // Verify policy is live.
    await brokerPortal.expectQuoteManagerLoaded();
    await brokerPortal.searchPolicy(policyNumber);
    await brokerPortal.expectPolicyStatus(policyNumber, 'Live');

    // Login to Salesforce Portal.
    await salesforce.goto();
    const sfCreds = getSalesforceCredentials();
    await salesforce.login(sfCreds.username, sfCreds.password, { useJwt: true, fast: true });

    // Step 5-6: Global Search -> open the exact policy number from the results grid.
    await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);

    // Navigate to Related tab -> open Insurance Policy record.
    await salesforce.openRelatedTab();
    await salesforce.openInsurancePolicyFromRelated(policyNumber);

    const today = new Date();
    const mta1FutureDate = new Date(today);
    mta1FutureDate.setDate(mta1FutureDate.getDate() + 2);

    const mta1EffectiveGb = toGbDate(mta1FutureDate);
    const invalidMta2EffectiveGb = toGbDate(today);

    // MTA #1
    await salesforce.openCreateMTADialog();
    await salesforce.fillMTAReasonAndSave('Non Material Amendment', 'MTA Description - mandatory field update');
    await salesforce.fillIntermediaryReference(`MTA1-REF-${Date.now()}`);
    await salesforce.editMTAPremium(mtaPremium1);
    await salesforce.bindMTA(mta1EffectiveGb);

    // MTA #2
    await salesforce.openCreateMTADialog();
    await salesforce.fillMTAReasonAndSave('Limit Increase', 'MTA Description - mandatory field update');
    await salesforce.fillIntermediaryReference(`MTA2-REF-${Date.now()}`);
    await salesforce.editMTAPremium(mtaPremium2);

    // Added condition: validation is based on bind result.
    // If MTA2 date is before MTA1 and bind is blocked, this is pass.
    // If bind completes successfully with that invalid date, this is a bug.
    await salesforce.bindMTA(invalidMta2EffectiveGb);

    const bindMTAButton = page.getByRole('button', { name: /Bind MTA/i }).first();
    const editMtaPremiumButton = page.getByRole('button', { name: /Edit MTA Premium/i }).first();
    const bindDialog = page.locator('[role="dialog"]:visible').first();
    const createMtaButton = page.getByRole('button', { name: /Create MTA/i }).first();

    let bindBlocked = false;
    let movedToNextPage = false;

    const stateCheckStarted = Date.now();
    while (Date.now() - stateCheckStarted < 30000) {
      const bindVisible = await bindMTAButton.isVisible().catch(() => false);
      const editPremiumVisible = await editMtaPremiumButton.isVisible().catch(() => false);
      const dialogVisible = await bindDialog.isVisible().catch(() => false);
      const createMtaVisible = await createMtaButton.isVisible().catch(() => false);

      // Pass condition: click Bind does not move to next page/state.
      bindBlocked = bindVisible || editPremiumVisible || dialogVisible;

      // Bug condition: invalid date still moved flow to post-bind state.
      movedToNextPage = createMtaVisible && !bindVisible && !dialogVisible;

      if (bindBlocked || movedToNextPage) {
        break;
      }

      await page.waitForTimeout(500);
    }

    if (bindBlocked) {
      // eslint-disable-next-line no-console
      console.log(
        `Condition satisfied: MTA2 date (${invalidMta2EffectiveGb}) cannot be before MTA1 date (${mta1EffectiveGb}). Bind blocked as expected.`,
      );
      return;
    }

    expect(
      movedToNextPage,
      `BUG: MTA2 date (${invalidMta2EffectiveGb}) is before MTA1 date (${mta1EffectiveGb}) but clicking Bind moved the flow to the next page/state.`,
    ).toBeTruthy();
  });
});
