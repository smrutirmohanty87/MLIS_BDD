import { Browser, Page, expect } from '@playwright/test';
import { LoginPage } from '../pages/LoginPage';
import { AccountsPage } from '../pages/AccountsPage';
import { SubmissionWizardPage } from '../pages/SubmissionWizardPage';
import { SubmissionPage } from '../pages/SubmissionPage';
import { QuoteWizardPage } from '../pages/QuoteWizardPage';
import { QuotePage } from '../pages/QuotePage';
import { CoverageForms } from '../pages/CoverageForms';
import { PremiumPage } from '../pages/PremiumPage';
import { BindersPage } from '../pages/BindersPage';
import { RbsApprovalPage } from '../pages/RbsApprovalPage';
import { ClausesFeesPage } from '../pages/ClausesFeesPage';
import { QuoteStatusPage } from '../pages/QuoteStatusPage';
import {
  ACCOUNT, CLIENT_INFO, RISK_INFO, INSURABLE_2, INSURABLE_3, PREMIUMS,
} from '../data/testdata';
import { waitForSpinners } from '../utils/sf';
import { issueAndBond } from './issueAndBond';

/**
 * Create the base Oliva New Business policy for Care Howden end-to-end and
 * leave `page` on the resulting InsurancePolicy record ("Go To Policy" done).
 * The entire journey runs as UW3 (SF_USERNAME); the UW5/UAL branch fires only
 * if Salesforce raises the outstanding-referral toast (see {@link issueAndBond}).
 *
 * Shared by the standalone NB spec and by the CNR→MTA→Renewal→Cancellation
 * chain (which needs an in-force NB policy as its base).
 *
 * @param skipLogin - If true, skip password login (for JWT auth environments)
 * @returns the generated policy number.
 */
export async function createNbPolicy(page: Page, browser: Browser, skipLogin = false): Promise<string> {
  const insuredCard = 'Moorgarth'; // default UK insurable card contains this text
  const login = new LoginPage(page);
  const accounts = new AccountsPage(page);
  const wizard = new SubmissionWizardPage(page);
  const submission = new SubmissionPage(page);
  const quoteWizard = new QuoteWizardPage(page);
  const quote = new QuotePage(page);
  const forms = new CoverageForms(page);
  const premiums = new PremiumPage(page);
  const binders = new BindersPage(page);
  const rbs = new RbsApprovalPage(page);
  const clausesFees = new ClausesFeesPage(page);
  const status = new QuoteStatusPage(page);

  // Skip password login if skipLogin=true (JWT auth) or SF_PASSWORD is not set
  if (!skipLogin && process.env.SF_PASSWORD) {
    await login.login(process.env.SF_USERNAME!, process.env.SF_PASSWORD!);
  }

  // Fast-iteration escape hatch: skip the ~7-min NB build and start the
  // lifecycle chain from an existing in-force New Business policy.
  const basePolicyId = process.env.BASE_POLICY_ID;
  if (basePolicyId) {
    await page.goto(`/lightning/r/InsurancePolicy/${basePolicyId}/view`);
    await waitForSpinners(page);
    await expect(
      page.getByText('Insurance Policy', { exact: true }).first()
    ).toBeVisible({ timeout: 90_000 });
    console.log(`[createNbPolicy] using existing base policy ${basePolicyId}`);
    return basePolicyId;
  }

  await accounts.openAccount(ACCOUNT.name);
  await accounts.startNewOlivaSubmission();

  await wizard.fillSubmissionSource(ACCOUNT.intermediaryContact);
  await wizard.fillClientInformation(CLIENT_INFO);
  await wizard.fillRiskInformation(RISK_INFO);
  await wizard.submitClaimsHistory();
  expect(await submission.riskId()).toMatch(/DOU\/\d+\/CAHO\/\d+/);

  await submission.createNewQuote();
  await quoteWizard.completeWizard();

  // Coverages on the default UK insurable.
  await quote.showInsurableCoverages(insuredCard);
  await quote.addInsurableCoverage(insuredCard, 'Asset Protection - Property Damage');
  await forms.fillAssetProtection();
  await quote.showInsurableCoverages(insuredCard);
  await quote.addInsurableCoverage(insuredCard, 'Revenue Protection - Business Interruption');
  await forms.fillRevenueProtection();

  // Additional risk locations (Insurable 2 & 3) with their coverages.
  for (const loc of [INSURABLE_2, INSURABLE_3]) {
    await quote.addRiskLocation(loc);
    await quote.showInsurableCoverages(loc.insurableName);
    await quote.addInsurableCoverage(loc.insurableName, 'Revenue Protection - Business Interruption');
    await forms.fillRevenueProtection();
    await quote.showInsurableCoverages(loc.insurableName);
    await quote.addInsurableCoverage(loc.insurableName, 'Asset Protection - Property Damage');
    await forms.fillAssetProtection();
  }

  // Product-level Group Personal Accident.
  await quote.showProductCoverages();
  await quote.addProductCoverage('Group Personal Accident');
  await forms.fillGroupPersonalAccident();

  await quote.clickEnterPremiums();
  await premiums.fillAndSubmit(PREMIUMS);

  await binders.selectAllBinders();
  await rbs.approveFirstRbs();

  await clausesFees.savePredefinedClauses();
  await clausesFees.addFee();
  await status.setErnExempt();

  await issueAndBond(page, browser, status);

  const policyNumber = await status.createPolicy();
  expect(policyNumber).not.toEqual('');
  await status.goToPolicy();
  return policyNumber;
}
