import { expect, Locator, Page } from '@playwright/test';
import { SalesforcePortalPage } from './salesforce-cancellation';

export class SalesforceQuoteJourneyCommercialEWPage {
  constructor(private readonly page: Page) {}

  async loginAndOpenQuoteJourney(username: string, password: string) {
    const salesforce = new SalesforcePortalPage(this.page);
    await salesforce.login(username, password, { useJwt: true, fast: true });
    await expect(this.page.getByRole('link', { name: 'Quote Journey' })).toBeVisible({ timeout: 120000 });

    await this.clickWhenReady(this.page.getByRole('link', { name: 'Quote Journey' }));
    await expect(this.page.getByRole('heading', { name: /quote journey/i })).toBeVisible({ timeout: 120000 });
    await expect(this.page.getByRole('heading', { name: /product selection/i }).first()).toBeVisible({ timeout: 120000 });
  }

  async completeCommercialQuoteJourney(caseRef: string) {
    await this.selectLookupOption('Broker Account', 'MLIS intermediary', 'MLIS Test Intermediary');
    await this.selectLookupOption('Broker User', 'test', 'test');
    await this.selectComboboxOption('Brand', 'My Legal Indemnity Shop');
    await this.selectComboboxOption('Quote Type', 'Commercial');
    await this.selectComboboxOption('Jurisdiction', 'England and Wales');

    const caseRefInput = await this.pickFirstVisible([
      this.page.getByRole('textbox', { name: /my case reference|case reference|file number/i }),
      this.page.locator('input[placeholder*="case reference" i]'),
    ]);
    await caseRefInput.fill(caseRef);

    const loiInput = await this.pickFirstVisible([
      this.page.getByRole('spinbutton', { name: /limit of indemnity/i }),
      this.page.locator('input[type="number"][name*="limit" i]'),
      this.page.locator('input[aria-label*="Limit of indemnity"]'),
    ]);
    await loiInput.fill('500000');

    const preferredCard = this.page.locator('article, div').filter({ hasText: /Absence of easement - Access/i }).first();
    const preferredSelectButton = preferredCard.getByRole('button', { name: /select/i }).first();
    const anySelectButton = this.page.getByRole('button', { name: /^Select$/ }).first();
    const selectedProductsHeading = this.page.getByText(/You have selected\s+\d+\s+product/i).first();

    if (await preferredSelectButton.isVisible({ timeout: 5000 }).catch(() => false)) {
      await this.clickWhenReady(preferredSelectButton);
    } else {
      await this.clickWhenReady(anySelectButton);
    }

    if (!(await selectedProductsHeading.isVisible({ timeout: 5000 }).catch(() => false))) {
      await this.clickWhenReady(anySelectButton);
    }

    await expect(selectedProductsHeading).toBeVisible({ timeout: 20000 });
    await this.clickWhenReady(this.page.getByRole('button', { name: /^Proceed$/ }).first());

    await expect(this.page.getByRole('heading', { name: /statements of fact/i })).toBeVisible({ timeout: 120000 });
    await this.confirmAllStatementsOfFact();

    await this.clickWhenReady(this.page.getByRole('button', { name: /^Proceed$/ }).first());

    await expect(this.page.getByRole('heading', { name: /quotes/i })).toBeVisible({ timeout: 120000 });
    await this.clickWhenReady(this.page.getByRole('button', { name: /Select quote/i }).first());

    await expect(this.page.getByRole('heading', { name: /final policy details/i })).toBeVisible({ timeout: 120000 });
    await this.fillFinalPolicyDetails();

    await this.clickWhenReady(this.page.getByRole('button', { name: /next|proceed/i }).first());

    await expect(this.page.getByRole('heading', { name: /^Summary$/i })).toBeVisible({ timeout: 120000 });
    await this.clickWhenReady(this.page.getByRole('button', { name: /Proceed to order/i }));

    const commencementDateInput = await this.pickFirstVisible([
      this.page.getByRole('textbox', { name: /commencement date/i }),
      this.page.locator('input[placeholder="DD/MM/YYYY"]'),
    ], 30000);
    await commencementDateInput.fill('14/04/2026');
    await this.clickWhenReady(this.page.getByRole('heading', { name: /Final policy details/i }).first());

    const orderNow = this.page.getByRole('button', { name: /Order now/i }).first();
    await expect(orderNow).toBeEnabled({ timeout: 30000 });
    await this.clickWhenReady(orderNow);

    await expect(this.page.getByRole('heading', { name: /Policy issued/i })).toBeVisible({ timeout: 180000 });
  }

  async returnToSubmission() {
    const returnToSubmissionTarget = await this.pickFirstVisible([
      this.page.getByRole('button', { name: /Return to submission/i }),
      this.page.getByRole('link', { name: /Return to submission/i }),
    ], 60000);

    await this.clickWhenReady(returnToSubmissionTarget);
    await this.waitForLightningIdle();

    const submissionMarkers = [
      this.page.getByRole('heading', { name: /Submission/i }).first(),
      this.page.getByRole('link', { name: /Quote Journey/i }).first(),
      this.page.getByText(/Submission Statement Of Facts|Submission Uninsured Matters|Submission Terms\s*&\s*Conditions/i).first(),
    ];

    await expect
      .poll(async () => {
        for (const marker of submissionMarkers) {
          if (await marker.isVisible().catch(() => false)) {
            return true;
          }
        }
        return false;
      }, { timeout: 120000 })
      .toBe(true);
  }

  async performMtaAfterReturn(caseRef: string) {
    const salesforce = new SalesforcePortalPage(this.page);

    await salesforce.openRelatedTab();
    await salesforce.openInsurancePolicyFromRelated();
    await salesforce.expectInsurancePolicyRecordLoaded();
    await salesforce.openCreateMTADialog();
    await salesforce.fillMTAReasonAndSave(
      'Exposure/Limit Changes',
      `MTA from quote journey flow ${caseRef}`,
    );
    await salesforce.fillIntermediaryReference(`QJ-MTA-${Date.now()}`);
    await salesforce.editMTAPremium('111');
    await salesforce.bindMTA();

    // Bind MTA can trigger asynchronous Lightning re-renders. Wait until the policy page
    // is stable before asserting generated identifiers.
    await this.waitForPageReadyAfterBindMta();

    const riskIdPattern = /\bDAU\/\d{8}\/[A-Z]{4}\/\d{2}\/[A-Z0-9]{2,8}\b/;
    const pageText = await this.page.locator('body').innerText();
    expect(pageText, 'Expected generated Risk ID after Bind MTA.').toMatch(riskIdPattern);
  }

  private async waitForPageReadyAfterBindMta() {
    await this.page.waitForLoadState('domcontentloaded', { timeout: 120000 }).catch(() => {});
    await this.waitForLightningIdle();

    const insurancePolicyHeading = this.page.getByRole('heading', { name: /Insurance Policy/i }).first();
    const mtaActionButtons = [
      this.page.getByRole('button', { name: /Create MTA/i }).first(),
      this.page.getByRole('button', { name: /Show more actions/i }).first(),
    ];

    await expect
      .poll(async () => {
        const onPolicy = await insurancePolicyHeading.isVisible({ timeout: 500 }).catch(() => false);
        if (!onPolicy) return false;

        for (const actionButton of mtaActionButtons) {
          if (await actionButton.isVisible({ timeout: 500 }).catch(() => false)) {
            return true;
          }
        }

        return false;
      }, { timeout: 180000 })
      .toBe(true);
  }

  async performCnrAfterReturn(caseRef: string) {
    const salesforce = new SalesforcePortalPage(this.page);

    await salesforce.openRelatedTab();
    await salesforce.openInsurancePolicyFromRelated();
    await salesforce.expectInsurancePolicyRecordLoaded();

    await salesforce.openCancelAndReissueDialog();
    await salesforce.completeCancelAndReissueDialog({
      reasonForCR: 'User Error Correction',
      description: `CNR from quote journey flow ${caseRef}`,
    });

    await salesforce.completeReissueFinalPolicyDetails();
    await salesforce.completeReissueSummary();

    const today = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });

    const reissueCommencementDateInput = await this.pickFirstVisible([
      this.page.getByRole('textbox', { name: /commencement date/i }),
      this.page.locator('input[placeholder="DD/MM/YYYY"]'),
    ], 30000);
    await reissueCommencementDateInput.fill(today);
    await this.clickWhenReady(this.page.getByRole('heading', { name: /Final policy details/i }).first());

    const reissueOrderNow = this.page.getByRole('button', { name: /Order now/i }).first();
    await expect(reissueOrderNow).toBeEnabled({ timeout: 30000 });
    await this.clickWhenReady(reissueOrderNow);

    await expect(this.page.getByRole('heading', { name: /Policy issued/i })).toBeVisible({ timeout: 180000 });
    await this.returnToSubmission();
  }

  async performCancellationAfterReturn(caseRef: string) {
    const salesforce = new SalesforcePortalPage(this.page);

    await salesforce.openRelatedTab();
    await salesforce.openInsurancePolicyFromRelated();
    await salesforce.expectInsurancePolicyRecordLoaded();
    await salesforce.openCancelPolicyWizard();
    await salesforce.completeCancelMidtermStep1(`Cancellation from quote journey flow ${caseRef}`);
    await salesforce.completePremiumStepCalculateTaxOkAndNext();
    await salesforce.expectPolicyStatusCancelled();
  }

  private async confirmAllStatementsOfFact() {
    const statementsHeading = this.page.getByRole('heading', { name: /statements of fact to agree/i }).first();
    await expect(statementsHeading).toBeVisible({ timeout: 120000 });

    const headingText = (await statementsHeading.textContent()) ?? '';
    const statementsToConfirm = Number(headingText.match(/(\d+)\s+statements?/i)?.[1] ?? '0');

    const confirmButtonsByXpath = this.page.locator(
      'xpath=//*[@id="brandBand_2"]//c-mlis-statement-of-fact//button[normalize-space()="Confirm"]'
    );

    if (statementsToConfirm > 0) {
      await expect
        .poll(async () => confirmButtonsByXpath.count(), { timeout: 60000 })
        .toBeGreaterThan(0);
    }

    let clicked = 0;
    for (let attempts = 0; attempts < Math.max(80, statementsToConfirm * 6) && clicked < statementsToConfirm; attempts += 1) {
      const count = await confirmButtonsByXpath.count();
      if (count === 0) {
        break;
      }

      const firstConfirm = confirmButtonsByXpath.first();
      await firstConfirm.scrollIntoViewIfNeeded();
      await firstConfirm.click({ force: true, timeout: 20000 });
      clicked += 1;
      await this.page.waitForTimeout(300);
    }

    expect(clicked, `Confirmed ${clicked} statements, but expected ${statementsToConfirm}.`).toBeGreaterThanOrEqual(statementsToConfirm);
    await expect(confirmButtonsByXpath).toHaveCount(0, { timeout: 15000 });
  }

  private async fillFinalPolicyDetails() {
    let requiredInputs = this.page.locator('input[required]');
    await expect(requiredInputs.nth(0)).toBeVisible({ timeout: 30000 });
    await requiredInputs.nth(0).fill('John Smith');
    await requiredInputs.nth(1).fill('SW1A 1AA');
    await requiredInputs.nth(1).press('Tab').catch(() => {});

    const enterManually = this.page
      .getByRole('button', { name: /enter manually/i })
      .or(this.page.getByRole('link', { name: /enter manually/i }))
      .first();
    if (await enterManually.isVisible({ timeout: 3000 }).catch(() => false)) {
      await this.clickWhenReady(enterManually);
    }

    requiredInputs = this.page.locator('input[required]');
    await expect(requiredInputs.nth(2)).toBeVisible({ timeout: 30000 });
    await requiredInputs.nth(2).fill('10 Downing Street');
    await requiredInputs.nth(3).fill('London');
  }

  private async waitForLightningIdle() {
    await this.page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
    await this.page.waitForTimeout(750);

    const knownBusyLocators = [
      this.page.locator('[role="progressbar"]'),
      this.page.locator('.slds-spinner:visible'),
      this.page.locator('text=Loading...'),
      this.page.locator('text=Processing Request'),
    ];

    for (const busy of knownBusyLocators) {
      await busy.first().waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
    }
  }

  private async clickWhenReady(locator: Locator) {
    for (let attempt = 1; attempt <= 4; attempt += 1) {
      await this.waitForLightningIdle();
      try {
        await locator.click({ timeout: 15000 });
        return;
      } catch (error) {
        if (attempt === 4) {
          throw error;
        }
        await this.page.keyboard.press('Escape').catch(() => {});
        await this.page.waitForTimeout(1000);
      }
    }
  }

  private async pickFirstVisible(candidates: Locator[], timeoutMs = 15000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
      for (const candidate of candidates) {
        const target = candidate.first();
        if (await target.isVisible().catch(() => false)) {
          return target;
        }
      }
      await candidates[0].page().waitForTimeout(250);
    }
    throw new Error('Unable to find a visible locator from provided candidates.');
  }

  private async findLookupInput(fieldLabel: string) {
    return this.pickFirstVisible([
      this.page.getByRole('combobox', { name: new RegExp(fieldLabel, 'i') }),
      this.page.getByRole('searchbox', { name: new RegExp(fieldLabel, 'i') }),
      this.page.locator(`input[aria-label*="${fieldLabel}"]`),
      this.page.locator(`input[placeholder*="${fieldLabel}"]`),
    ]);
  }

  private async selectLookupOption(fieldLabel: string, query: string, optionText: string) {
    const input = await this.findLookupInput(fieldLabel);
    await this.clickWhenReady(input);
    await input.fill(query);

    await this.page.keyboard.press('Control+A');
    await this.page.keyboard.press('Backspace');
    await input.fill(query.slice(0, Math.min(4, query.length)) || query);

    const option = await this.pickFirstVisible([
      this.page.getByRole('option', { name: new RegExp(optionText, 'i') }),
      this.page.getByRole('link', { name: new RegExp(optionText, 'i') }),
      this.page.locator(`li:has-text("${optionText}")`),
    ], 30000);
    await this.clickWhenReady(option);
  }

  private async selectComboboxOption(label: string, optionText: string) {
    const combobox = await this.pickFirstVisible([
      this.page.getByRole('combobox', { name: new RegExp(label, 'i') }),
      this.page.locator(`button[aria-label*="${label}"]`),
      this.page.locator(`[data-target-selection-name*="${label.toLowerCase().replace(/\s+/g, '-')}"]`),
    ]);

    await this.clickWhenReady(combobox);

    const option = await this.pickFirstVisible([
      this.page.getByRole('option', { name: new RegExp(optionText, 'i') }),
      this.page.locator(`[role="option"]:has-text("${optionText}")`),
      this.page.getByText(new RegExp(`^${optionText}$`, 'i')).first(),
    ], 20000);

    await this.clickWhenReady(option);
    await this.waitForLightningIdle();
  }
}
