import { expect, test } from '@playwright/test';
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
import { TCReg043MtaCnrMtaPage } from '../../src/pages/tc-reg-043-mta-cnr-mta';
import { getBrokerCredentials, getSalesforceCredentials } from '../../src/config/env';

test.describe('@regression | E2E | MTA | Cancel and Reissue', () => {
  test('TC_REG_043 | Create MTA then Cancel and Reissue then Create MTA', async ({ page }) => {
    test.setTimeout(900000);
    test.slow();

    const caseRef = `E2E-MTA-CNR-MTA-${Date.now()}`;

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
    const reg043 = new TCReg043MtaCnrMtaPage(page);

    reg043.logStep('START', 'Begin MTA -> CNR (new flow) -> MTA scenario');

    // Create a fresh policy in Broker Portal.
    reg043.logStep('NB-01', 'Login to Broker Portal and start new quote');
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
    reg043.logStep('NB-02', 'Order completed for newly created policy');

    await policyIssued.expectPolicyIssued();
    const policyNumber = await policyIssued.getIssuedPolicyNumber();
    reg043.logStep('NB-03', `Policy created: ${policyNumber}`);
    await policyIssued.backToQuoteManager();

    // Verify policy is live.
    await brokerPortal.expectQuoteManagerLoaded();
    await brokerPortal.searchPolicy(policyNumber);
    await brokerPortal.expectPolicyStatus(policyNumber, 'Live');
    reg043.logStep('NB-04', 'Policy status verified as Live in Broker Portal');

    // Login to Salesforce.
    reg043.logStep('SF-01', 'Login to Salesforce and open policy');
    await salesforce.goto();
    const sfCreds = getSalesforceCredentials();
    await salesforce.login(sfCreds.username, sfCreds.password, { useJwt: true, fast: true });

    // Global Search -> open exact policy.
    let openedFromSearch = false;
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      try {
        await salesforce.searchAndOpenExactFromGlobalSearchGrid(policyNumber);
        openedFromSearch = true;
        break;
      } catch (error) {
        if (attempt === 2) throw error;
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(4000);
      }
    }
    expect(openedFromSearch).toBeTruthy();

    await salesforce.openRelatedTab();
    await salesforce.openInsurancePolicyFromRelated(policyNumber);
    reg043.logStep('SF-02', 'Insurance Policy record opened from Related tab');

    // MTA #1
    reg043.logStep('MTA1-01', 'Open Create MTA dialog');
    await salesforce.openCreateMTADialog();
    await salesforce.fillMTAReasonAndSave('Non Material Amendment', 'MTA Description - mandatory field update');

    reg043.logStep('MTA1-02', 'Set Status Reason to Internal referral before intermediary reference');
    await reg043.setStatusReasonInternalReferral();

    reg043.logStep('MTA1-03', 'Fill intermediary reference, edit premium, bind MTA #1');
    await salesforce.fillIntermediaryReference(`MTA1-REF-${Date.now()}`);
    await salesforce.editMTAPremium('100');
    await salesforce.bindMTA();
    reg043.logStep('MTA1-04', 'MTA #1 bind completed');

    await salesforce.openRelatedTab();
    await reg043.verifyNoDocumentsInNotesAndAttachments(salesforce, 'After MTA #1 completion');

    // Start Cancel and Reissue.
    reg043.logStep('CNR-01', 'Open Cancel and Reissue dialog and submit details');
    await salesforce.openCancelAndReissueDialog();
    await salesforce.completeCancelAndReissueDialog({
      reasonForCR: 'User Error Correction',
      description: `CNR after MTA test (${policyNumber})`,
    });

    // MTA-CNR flow is always the new flow:
    // on Quote Journey / Final policy details, return to submission, then bind.
    await expect(page.getByRole('heading', { name: /Quote Journey/i })).toBeVisible({ timeout: 120000 });
    await expect(page.getByRole('heading', { name: /Final policy details/i })).toBeVisible({ timeout: 120000 });
    await page.waitForTimeout(5000);

    const returnToSubmission = page
      .getByRole('button', { name: /Return to submission/i })
      .or(page.getByRole('link', { name: /Return to submission/i }))
      .first();
    await expect(returnToSubmission).toBeVisible({ timeout: 60000 });
    await returnToSubmission.click();
    await page.waitForTimeout(5000);

    reg043.logStep('CNR-02', 'Bind from returned submission (new flow)');
    await salesforce.bindMTA();
    reg043.logStep('CNR-03', 'CNR bind completed');

    // Open policy again after CnR, then run MTA #2.
    reg043.logStep('MTA2-01', 'Re-open policy and start MTA #2 (same flow as MTA #1)');
    await salesforce.openCreateMTADialog();
    await salesforce.fillMTAReasonAndSave('Non Material Amendment', 'MTA Description - mandatory field update');

    reg043.logStep('MTA2-02', 'Set Status Reason to Internal referral before intermediary reference');
    await reg043.setStatusReasonInternalReferral();

    reg043.logStep('MTA2-03', 'Fill intermediary reference, edit premium, bind MTA #2');
    await salesforce.fillIntermediaryReference(`MTA2-REF-${Date.now()}`);
    await salesforce.editMTAPremium('100');
    await salesforce.bindMTA();
    reg043.logStep('MTA2-04', 'MTA #2 bind completed');

    reg043.logStep('END', 'Flow completed: MTA #1 -> Notes check -> CNR -> MTA #2 (same as MTA #1)');
  });
});
