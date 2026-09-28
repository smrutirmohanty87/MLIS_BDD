import { createBdd, test } from 'playwright-bdd';
import { expect } from '@playwright/test';
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
} from '../../../../src/pages/mlis-portal';
import { BrokerPortalPage } from '../../../../src/pages/broker-portal-policy';
import { SalesforcePortalPage } from '../../../../src/pages/salesforce-cancellation';
import { getBrokerCredentials, getSalesforceCredentials } from '../../../../src/config/env';

declare const require: (moduleName: string) => any;

const policyData = require('../../../test-data/policy-creation.json') as {
  Insuredname: string;
  Landregisternumber: string;
  legalOfIndemnity: string;
};

const { Given, When, Then } = createBdd(test);

let dualSharePolicyNumber = '';
let mtaPolicyNumber = '';
let cnrPolicyNumber = '';

async function createResidentialPolicy(page: any, caseRef: string, usePolicyData: boolean) {
  const brokerLogin = new LoginPage(page);
  const quoteManager = new QuoteManagerPage(page);
  const productSelection = new ProductSelectionPage(page);
  const statements = new StatementsOfFactPage(page);
  const quotes = new QuotesPage(page);
  const finalDetails = new FinalPolicyDetailsPage(page);
  const summary = new SummaryPage(page);
  const orderDialog = new OrderDialog(page);
  const policyIssued = new PolicyIssuedPage(page);

  await brokerLogin.goto();
  const brokerCreds = getBrokerCredentials();
  await brokerLogin.login(brokerCreds.username, brokerCreds.password);
  await quoteManager.expectLoaded();
  await quoteManager.acceptCookiesIfVisible();

  await quoteManager.startResidentialEnglandWalesQuote();
  await productSelection.expectLoaded();
  await productSelection.fillCaseReferenceAndLimit(caseRef, usePolicyData ? policyData.legalOfIndemnity : '500000');
  await productSelection.selectProductsByIndex([1]);
  await productSelection.proceed();

  await statements.expectLoaded();
  await statements.confirmAllStatements();
  await statements.proceed();

  await quotes.expectLoaded();
  await quotes.selectFirstQuote();

  await finalDetails.expectLoaded();
  if (usePolicyData) {
    await finalDetails.fillRequiredDetails({
      insuredName: policyData.Insuredname,
      landRegisterNumber: policyData.Landregisternumber,
    });
  } else {
    await finalDetails.fillRequiredDetails();
  }
  await finalDetails.proceed();

  await summary.expectLoaded();
  if (usePolicyData) {
    await summary.expectSummaryData(caseRef, {
      limitOfIndemnity: policyData.legalOfIndemnity,
      insuredName: policyData.Insuredname,
    });
  } else {
    await summary.expectSummaryData(caseRef);
  }
  await summary.proceedToOrder();
  await orderDialog.selectTodayAndOrder();

  await policyIssued.expectPolicyIssued();
  const policyNumber = await policyIssued.getIssuedPolicyNumber();
  await policyIssued.backToQuoteManager();
  return policyNumber;
}

Given('I create a fresh EW residential policy for dual share verification', async ({ page }) => {
  const caseRef = `E2E-SAN-DUAL-GWP-${Date.now()}`;
  dualSharePolicyNumber = await createResidentialPolicy(page, caseRef, true);

  const brokerPortal = new BrokerPortalPage(page);
  await brokerPortal.expectQuoteManagerLoaded();
  await brokerPortal.searchPolicy(dualSharePolicyNumber);
  await brokerPortal.expectPolicyStatus(dualSharePolicyNumber, 'Live');
});

Given('I open the created policy insurance details in Salesforce', async ({ page }) => {
  const salesforce = new SalesforcePortalPage(page);
  const sfCreds = getSalesforceCredentials();

  await salesforce.goto();
  await salesforce.login(sfCreds.username, sfCreds.password, { useJwt: true, fast: true });
  await salesforce.searchAndOpenExactFromGlobalSearchGrid(dualSharePolicyNumber);
  await salesforce.openRelatedTab();
  await salesforce.openInsurancePolicyFromRelated(dualSharePolicyNumber);

  const detailsTab = page.getByRole('tab', { name: /^Details$/i }).first();
  await expect(detailsTab).toBeVisible({ timeout: 120000 });
  await detailsTab.click();
});

Then('all visible DUAL Share GWP values should be consistent', async ({ page }) => {
  const parseCurrency = (raw: string): number => {
    const numeric = Number(raw.replace(/[^\d.-]/g, ''));
    return Number.isFinite(numeric) ? numeric : Number.NaN;
  };

  const extractLabelValues = (sourceText: string, labelRegexSource: string): number[] => {
    const money = '£?\\s*\\d[\\d,]*(?:\\.\\d{1,2})?';
    const regex = new RegExp(`${labelRegexSource}[\\s\\S]{0,120}?(${money})`, 'gi');
    const values: number[] = [];

    for (const match of sourceText.matchAll(regex)) {
      const value = parseCurrency(match[1]);
      if (!Number.isNaN(value)) values.push(value);
    }
    return values;
  };

  const collectDualShareGwpValues = async () => {
    const dualValues: number[] = [];
    const dualSeen = new Set<string>();

    for (let i = 0; i < 8; i += 1) {
      const detailsPanel = page.locator('main:visible, [role="tabpanel"]:visible').first();
      const text = await detailsPanel.innerText().catch(() => '');

      const currentDual = extractLabelValues(text, 'DUAL\\s*Share\\s*GWP');
      for (const value of currentDual) {
        const key = value.toFixed(2);
        if (!dualSeen.has(key)) {
          dualSeen.add(key);
          dualValues.push(value);
        }
      }

      await page.mouse.wheel(0, 1400);
      await page.waitForTimeout(400);
    }

    return dualValues;
  };

  const dualValues = await collectDualShareGwpValues();
  expect(dualValues.length).toBeGreaterThan(0);

  const topDualShareGwp = dualValues[0];
  for (const value of dualValues) {
    expect(value).toBeCloseTo(topDualShareGwp, 2);
  }
});

Given('I create a fresh live residential policy for MTA', async ({ page }) => {
  const caseRef = `E2E-MTA-${Date.now()}`;
  mtaPolicyNumber = await createResidentialPolicy(page, caseRef, false);

  const brokerPortal = new BrokerPortalPage(page);
  await brokerPortal.expectQuoteManagerLoaded();
  await brokerPortal.searchPolicy(mtaPolicyNumber);
  await brokerPortal.expectPolicyStatus(mtaPolicyNumber, 'Live');
});

When('I create and bind MTA for the policy in Salesforce', async ({ page }) => {
  const salesforce = new SalesforcePortalPage(page);
  const sfCreds = getSalesforceCredentials();

  await salesforce.goto();
  await salesforce.login(sfCreds.username, sfCreds.password, { useJwt: true, fast: true });
  await salesforce.searchAndOpenExactFromGlobalSearchGrid(mtaPolicyNumber);
  await salesforce.openRelatedTab();
  await salesforce.openInsurancePolicyFromRelated(mtaPolicyNumber);

  await salesforce.openCreateMTADialog();
  await salesforce.fillMTAReasonAndSave(
    'Exposure/Limit Changes',
    `MTA Description - mandatory field update for ${mtaPolicyNumber}`,
  );
  await salesforce.fillIntermediaryReference(`MTA-REF-${Date.now()}`);
  await salesforce.editMTAPremium('111');

  const futureBindDate = new Date();
  futureBindDate.setDate(futureBindDate.getDate() + 5);
  const futureBindDateValue = futureBindDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  await salesforce.bindMTA(futureBindDateValue);
});

Then('MTA should be bound with a valid risk identifier', async ({ page }) => {
  const riskIdPattern = /\bDAU\/\d{8}\/[A-Z]{4}\/\d{2}\/\d{2}\b/;
  const highlightsTopLeft = page.locator(
    '.slds-page-header, .forceHighlightsPanel, [data-aura-class*="forceHighlightsPanel"]',
  ).first();

  await expect
    .poll(async () => {
      await page.waitForLoadState('domcontentloaded');

      const topLeftText = await highlightsTopLeft.innerText().catch(() => '');
      if (riskIdPattern.test(topLeftText)) {
        return topLeftText.match(riskIdPattern)?.[0] ?? '';
      }

      const bodyText = await page.locator('body').innerText();
      return bodyText.match(riskIdPattern)?.[0] ?? '';
    }, { timeout: 180000, intervals: [2000, 5000] })
    .toMatch(riskIdPattern);
});

Given('I create a fresh live residential policy for cancel and reissue', async ({ page }) => {
  const caseRef = `E2E-CAN-REISSUE-${Date.now()}`;
  cnrPolicyNumber = await createResidentialPolicy(page, caseRef, false);

  const brokerPortal = new BrokerPortalPage(page);
  await brokerPortal.expectQuoteManagerLoaded();
  await brokerPortal.searchPolicy(cnrPolicyNumber);
  await brokerPortal.expectPolicyStatus(cnrPolicyNumber, 'Live');
});

When('I perform cancel and reissue for the policy in Salesforce', async ({ page }) => {
  const salesforce = new SalesforcePortalPage(page);
  const sfCreds = getSalesforceCredentials();

  await salesforce.goto();
  await salesforce.login(sfCreds.username, sfCreds.password, { useJwt: true, fast: true });
  await salesforce.searchAndOpenExactFromGlobalSearchGrid(cnrPolicyNumber);
  await salesforce.openRelatedTab();
  await salesforce.openInsurancePolicyFromRelated(cnrPolicyNumber);

  await salesforce.openCancelAndReissueDialog();
  await salesforce.completeCancelAndReissueDialog({
    reasonForCR: 'User Error Correction',
    description: `Cancel and reissue test (${cnrPolicyNumber})`,
  });

  await salesforce.completeReissueFinalPolicyDetails();
  await salesforce.completeReissueSummary();

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
});

Then('cancel and reissue should complete with policy issued view', async ({ page }) => {
  const salesforce = new SalesforcePortalPage(page);
  await expect(page.getByRole('heading', { name: /policy issued/i }).first()).toBeVisible({ timeout: 180000 });
  await salesforce.clickReturnToSubmission();
});
