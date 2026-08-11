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
import { TCRegNiCommercialIntermediaryPage } from '../../src/pages/tc-reg-ni-commercial-intermediary';
import { getBrokerCredentials, getSalesforceCredentials } from '../../src/config/env';
test.describe('@regression | E2E | NI Commercial | NB | CNR | MTA | Cancellation Midterm', () => {
  test(
    'DT-MLIS-DF25.5.0 | CR-237340 |TC_34_S6_Verify Cancellation premiums are applied to the appropriate intermediary when user change the Intermediary Legal Entity on MTA _NB>CRN>MTA_Cancel the Policy Mid-term_NI commercial_Broker portal',
    async ({ page }) => {
      test.setTimeout(900000);
      test.slow();

      const caseRef = `E2E-NI-COMM-NB-CNR-MTA-CAN-${Date.now()}`;

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

      // Verify policy is live before CNR.
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

      // CNR: complete cancel and reissue flow.
      await salesforce.openCancelAndReissueDialog();
      await salesforce.completeCancelAndReissueDialog({
        reasonForCR: 'User Error Correction',
        description: `NB CNR MTA midterm flow (${policyNumber})`,
      });

      await salesforce.completeReissueFinalPolicyDetails();
      await salesforce.completeReissueSummary();

      // If Summary remains visible after first click, retry once.
      const reissueSummaryHeading = page.getByRole('heading', { name: /summary/i }).first();
      const reissueProceedToOrder = page.getByRole('button', { name: /proceed to order/i }).first();
      if (await reissueSummaryHeading.isVisible({ timeout: 5000 }).catch(() => false)) {
        await page.waitForTimeout(4000);
        if (await reissueSummaryHeading.isVisible({ timeout: 2000 }).catch(() => false)) {
          await reissueProceedToOrder.click();
        }
      }

      const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const commencementDateInput = page.getByRole('textbox', { name: /commencement date/i }).first();
      const genericDateInput = page.locator('input[placeholder="DD/MM/YYYY"]:visible').first();

      if (await commencementDateInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await commencementDateInput.fill(today);
        await page.getByRole('heading', { name: /final policy details/i }).first().click().catch(() => undefined);
      } else if (await genericDateInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await genericDateInput.fill(today);
        await page.getByRole('heading', { name: /final policy details/i }).first().click().catch(() => undefined);
      }

      const orderNow = page.getByRole('button', { name: /order now/i }).first();
      if (await orderNow.isVisible({ timeout: 10000 }).catch(() => false)) {
        await orderNow.click();
      }

      await expect(page.getByRole('heading', { name: /policy issued/i }).first()).toBeVisible({ timeout: 180000 });
      await salesforce.clickReturnToSubmission();

      // Re-open policy after CNR, then create MTA.
      //await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);
      await salesforce.openRelatedTab();
      
      await salesforce.openInsurancePolicyFromRelated(policyNumber);

      await salesforce.openCreateMTADialog();
      await salesforce.fillMTAReasonAndSave(
        'Exposure/Limit Changes',
        `MTA Description - Intermediary Legal Entity change for ${policyNumber}`,
      );
      await salesforce.fillIntermediaryReference(`MTA-REF-${Date.now()}`);
      await regNiIntermediary.updateSubmissionSourceIntermediaryFields();
      await salesforce.editMTAPremium('100');
      await salesforce.bindMTA();

      // Cancel policy mid-term after MTA.
      await salesforce.openCancelPolicyWizard();
      await salesforce.completeCancelFromInceptionStep3(
        `Mid-term cancellation after NB->CNR->MTA flow (${policyNumber})`,
      );
      await salesforce.completePremiumStepWithTaxCalculation();
      await salesforce.submitCancellation();
      await salesforce.expectPolicyStatusCancelled();
    },
  );
});