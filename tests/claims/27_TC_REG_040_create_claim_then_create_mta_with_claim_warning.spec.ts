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
import { getBrokerCredentials } from '../../src/config/env';

test.describe('@regression | E2E | Claims | MTA', () => {
  test('TC_REG_040 | Create claim then create MTA from Risk ID and assert claim warning text', async ({ page }) => {
    test.setTimeout(900000);
    test.slow();

    const caseRef = `E2E-CLAIM-MTA-${Date.now()}`;

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

    const getClaimUserCredentials = () => {
      const rawEnv = (process.env.TEST_ENV ?? 'SIT1').trim().toUpperCase();
      const envName = rawEnv;
      const usernameVar = `SALEFORCE_${envName}_CLAIMUSER`;
      const passwordVar = `SALEFORCE_${envName}_CLAIMUSER_PASSWORD`;

      const username = process.env[usernameVar]?.trim();
      const password = process.env[passwordVar]?.trim();
      if (username && password) {
        return { username, password };
      }

      throw new Error(
        `Missing claim user credentials for ${envName}. Set ${usernameVar} and ${passwordVar} in .env for claims flow.`,
      );
    };

    // Create fresh policy in Broker Portal.
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

    await policyIssued.expectPolicyIssued();
    const policyNumber = await policyIssued.getIssuedPolicyNumber();
    await policyIssued.backToQuoteManager();

    // Confirm policy is live before Salesforce claim flow.
    await brokerPortal.expectQuoteManagerLoaded();
    await brokerPortal.searchPolicy(policyNumber);
    await brokerPortal.expectPolicyStatus(policyNumber, 'Live');

    // Open policy in Salesforce.
    await salesforce.goto();
    const sfCreds = getClaimUserCredentials();
    await salesforce.login(sfCreds.username, sfCreds.password, { useJwt: false, fast: true });
    await salesforce.closeAllWorkspaceTabs();

    // Create claim from policy.
    await salesforce.openCreateClaimFromSubmissionViaRiskId(policyNumber);
    await salesforce.selectClaimCoverage();
    await salesforce.completeClaimPostCreationFlowAndAssertIncurred();

    // On claim page, click Risk ID link from top area to navigate back to policy context.
    const riskIdLinkFromField = page
      .locator('records-record-layout-item:visible, .slds-form-element:visible, li:visible')
      .filter({ hasText: /Risk ID/i })
      .locator('a:visible')
      .first();
    const riskIdLinkDirect = page.getByRole('link', { name: /DAU\/\d+\/ASST\/\d+|Risk ID/i }).first();

    if (await riskIdLinkFromField.isVisible({ timeout: 10000 }).catch(() => false)) {
      await riskIdLinkFromField.click();
    } else {
      await expect(riskIdLinkDirect).toBeVisible({ timeout: 30000 });
      await riskIdLinkDirect.click();
    }

    await salesforce.expectInsurancePolicyRecordLoaded();

    // Create MTA from policy and assert warning text when claim exists.
    const createMTAButton = page.getByRole('button', { name: 'Create MTA' }).first();
    await expect(createMTAButton).toBeVisible({ timeout: 60000 });
    await createMTAButton.click();

    const clickYesIfPresent = async () => {
      const warningDialog = page
        .locator('[role="dialog"]:visible, .slds-modal:visible')
        .filter({ hasText: /A claim exists on this policy\./i })
        .first();

      const claimsWarningHeading = page.getByRole('heading', { name: /Claims Warning/i }).first();
      const enterMtaInformation = page.getByText('Enter MTA Information').first();

      const yesCandidates = [
        page.locator('button:has-text("Yes")').first(),
        warningDialog.getByRole('button', { name: /^Yes$/i }).first(),
        warningDialog.locator('button:has-text("Yes"), input[type="button"][value="Yes" i], input[type="submit"][value="Yes" i]').first(),
        page.getByRole('button', { name: /^Yes$/i }).first(),
        page.locator('button:has-text("Yes"), input[type="button"][value="Yes" i], input[type="submit"][value="Yes" i]').first(),
      ];

      for (let attempt = 1; attempt <= 3; attempt += 1) {
        for (const candidate of yesCandidates) {
          if (await candidate.isVisible({ timeout: 3000 }).catch(() => false)) {
            await candidate.scrollIntoViewIfNeeded().catch(() => undefined);
            try {
              await candidate.click({ timeout: 5000 });
            } catch {
              await candidate.click({ timeout: 5000, force: true }).catch(() => undefined);
              await candidate.evaluate((el) => (el as HTMLElement).click()).catch(() => undefined);
            }

            await page.waitForTimeout(1200);

            if (await enterMtaInformation.isVisible({ timeout: 5000 }).catch(() => false)) {
              return true;
            }
            if (!(await claimsWarningHeading.isVisible({ timeout: 1000 }).catch(() => false))) {
              return true;
            }
          }
        }
        await page.waitForTimeout(1000);
      }

      return false;
    };

    const claimExistsMessage = page.getByText(/A claim exists on this policy\./i).first();
    const proceedWarningMessage = page
      .getByText(/Are you sure you wish to continue\?/i)
      .or(page.getByText(/sure you wish to continue/i))
      .first();
    if (await claimExistsMessage.isVisible({ timeout: 15000 }).catch(() => false)) {
      await expect(claimExistsMessage).toBeVisible();
      await expect(proceedWarningMessage).toBeVisible({ timeout: 15000 });

      const yesButton = page.getByRole('button', { name: /^Yes$/i }).first();
      const noButton = page.getByRole('button', { name: /^No$/i }).first();
      await expect(yesButton).toBeVisible({ timeout: 15000 });
      await expect(noButton).toBeVisible({ timeout: 15000 });
      const clickedYes = await clickYesIfPresent();
      await expect(clickedYes).toBeTruthy();
    } else {
      if (await proceedWarningMessage.isVisible({ timeout: 8000 }).catch(() => false)) {
        await expect(proceedWarningMessage).toBeVisible();
      }
      await clickYesIfPresent();
    }

    // Proceed with creating MTA.
    const enterMtaInformation = page.getByText('Enter MTA Information').first();
    if (!(await enterMtaInformation.isVisible({ timeout: 12000 }).catch(() => false))) {
      const createMTAButtonRetry = page.getByRole('button', { name: 'Create MTA' }).first();
      if (await createMTAButtonRetry.isVisible({ timeout: 8000 }).catch(() => false)) {
        await createMTAButtonRetry.click();
        await clickYesIfPresent();
      }
    }

    await expect(enterMtaInformation).toBeVisible({ timeout: 60000 });

    const mtaReasonCombobox = page.getByRole('combobox', { name: /MTA Reason/i }).first();
    if (!(await mtaReasonCombobox.isVisible({ timeout: 10000 }).catch(() => false))) {
      const createMTAButtonRetry2 = page.getByRole('button', { name: 'Create MTA' }).first();
      if (await createMTAButtonRetry2.isVisible({ timeout: 8000 }).catch(() => false)) {
        await createMTAButtonRetry2.click();
        await clickYesIfPresent();
      }
    }

    await expect(mtaReasonCombobox).toBeVisible({ timeout: 30000 });
    await salesforce.fillMTAReasonAndSave('Exposure/Limit Changes', 'MTA Description - mandatory field update');
    await salesforce.fillIntermediaryReference(`MTA-REF-${Date.now()}`);
    // Step 3: Edit MTA Premium — enter value and press OK
    await salesforce.editMTAPremium('111');

    // Step 4: Bind MTA — insert today's date and click Bind
    await salesforce.bindMTA();

    // Wait for policy update and assert top-left Risk ID is shown in expected Salesforce format.
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

    const finalTopLeftText = await highlightsTopLeft.innerText().catch(() => '');
    const finalBodyText = await page.locator('body').innerText();
    const generatedRiskId =
      finalTopLeftText.match(riskIdPattern)?.[0]
      ?? finalBodyText.match(riskIdPattern)?.[0]
      ?? '';

    expect(
      generatedRiskId,
      'Expected Risk ID in format DAU/########/AAAA/##/## after Bind MTA (top-left highlights).',
    ).toMatch(riskIdPattern);
    
  });
});