import { expect, test } from '@playwright/test';
import {
  NiCommercialFinalPolicyDetailsPage,
  NiCommercialLoginPage,
  NiCommercialOrderDialog,
  NiCommercialPolicyIssuedPage,
  NiCommercialProductSelectionPage,
  NiCommercialQuoteManagerPage,
  NiCommercialQuotesPage,
  NiCommercialStatementsOfFactPage,
  NiCommercialSummaryPage,
} from '../../src/pages/mlis-portal-ni-commercial';
import { BrokerPortalPage } from '../../src/pages/broker-portal-policy';
import { SalesforcePortalPage } from '../../src/pages/salesforce-cancellation';
import { TCRegNiCommercialIntermediaryPage, updatedIntermediaryLegalEntity } from '../../src/pages/tc-reg-ni-commercial-intermediary';
import { getBrokerCredentials, getSalesforceCredentials } from '../../src/config/env';

test.describe('@regression | E2E | NI Commercial | NB | MTA | Negative Premium Bind Validation', () => {
  test(
    'DT-MLIS-DF25.5.0 | CR-237340 | TC_34_S6_NB>MTA_Negative MTA Premium should not allow Bind_NI commercial_Broker portal',
    async ({ page }) => {
      test.setTimeout(900000);
      test.slow();

      const caseRef = `E2E-NI-COMM-NB-MTA-NEG-${Date.now()}`;

      const brokerLogin = new NiCommercialLoginPage(page);
      const quoteManager = new NiCommercialQuoteManagerPage(page);
      const productSelection = new NiCommercialProductSelectionPage(page);
      const statements = new NiCommercialStatementsOfFactPage(page);
      const quotes = new NiCommercialQuotesPage(page);
      const finalDetails = new NiCommercialFinalPolicyDetailsPage(page);
      const summary = new NiCommercialSummaryPage(page);
      const orderDialog = new NiCommercialOrderDialog(page);
      const policyIssued = new NiCommercialPolicyIssuedPage(page);

      const brokerPortal = new BrokerPortalPage(page);
      const salesforce = new SalesforcePortalPage(page);
      const regNiIntermediary = new TCRegNiCommercialIntermediaryPage(page);

      // NB: Create a fresh NI Commercial policy in Broker Portal.
      await brokerLogin.goto();
      const brokerCreds = getBrokerCredentials();
      await brokerLogin.login(brokerCreds.username, brokerCreds.password);
      await quoteManager.expectLoaded();

      await quoteManager.startCommercialNorthernIrelandQuote();
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

      // Verify policy is live before MTA.
      await brokerPortal.expectQuoteManagerLoaded();
      await brokerPortal.searchPolicy(policyNumber);
      await brokerPortal.expectPolicyStatus(policyNumber, 'Live');

      // Login to Salesforce and open policy record.
      await salesforce.goto();
      const sfCreds = getSalesforceCredentials();
      await salesforce.login(sfCreds.username, sfCreds.password, { useJwt: true, fast: true });

      await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);
      await salesforce.openRelatedTab();
      await salesforce.openInsurancePolicyFromRelated(policyNumber);

      // NB -> MTA flow (no CNR, no cancellation)
      await salesforce.openCreateMTADialog();
      await salesforce.fillMTAReasonAndSave(
        'Exposure/Limit Changes',
        `MTA Description - negative premium bind validation for ${policyNumber}`,
      );
      await salesforce.fillIntermediaryReference(`MTA-NEG-REF-${Date.now()}`);
      await regNiIntermediary.updateSubmissionSourceIntermediaryFields(updatedIntermediaryLegalEntity);

      // Enter negative MTA premium and assert Save is not enabled.
      const editPremiumButton = page.getByRole('button', { name: /Edit MTA Premium/i }).first();
      await expect(editPremiumButton).toBeVisible({ timeout: 30000 });
      await editPremiumButton.click();

      const premiumDialog = page.getByRole('dialog', { name: /Edit MTA Premium/i });
      await expect(premiumDialog).toBeVisible({ timeout: 30000 });

      const spinInput = premiumDialog.getByRole('spinbutton', { name: /MTA.*Premium/i }).first();
      const textInput = premiumDialog.getByRole('textbox', { name: /MTA.*Premium/i }).first();
      const numberInput = premiumDialog.locator('input[type="number"]:visible').first();
      const visibleTextInput = premiumDialog.locator('input[type="text"]:visible').first();
      const anyVisibleInput = premiumDialog.locator('input:visible').first();

      let enteredNegativePremium = false;
      for (const input of [spinInput, textInput, numberInput, visibleTextInput, anyVisibleInput]) {
        const isVisible = await input.isVisible({ timeout: 2000 }).catch(() => false);
        if (!isVisible) continue;

        const isEditable = await input.isEditable().catch(() => false);
        if (!isEditable) continue;

        await input.fill('-100');
        await input.press('Tab').catch(() => undefined);
        enteredNegativePremium = true;
        break;
      }

      expect(enteredNegativePremium, 'Could not find editable premium input in Edit MTA Premium dialog.').toBeTruthy();

      const saveButton = premiumDialog.getByRole('button', { name: /Save/i }).first();
      await expect(saveButton).toBeVisible({ timeout: 15000 });

      const saveDisabled = await saveButton.isDisabled().catch(() => false);
      const saveAriaDisabled = (await saveButton.getAttribute('aria-disabled').catch(() => null)) === 'true';

      expect(
        saveDisabled || saveAriaDisabled,
        `Save button is enabled for negative MTA premium (-100) on policy ${policyNumber}.`,
      ).toBeTruthy();

      // Close dialog only if explicit close is available.
      const closeButton = premiumDialog.getByRole('button', { name: /Close|Cancel/i }).first();
      if (await closeButton.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeButton.click();
      }
    },
  );
});
