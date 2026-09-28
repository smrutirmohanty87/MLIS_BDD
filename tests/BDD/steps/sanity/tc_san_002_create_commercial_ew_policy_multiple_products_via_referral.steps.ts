import { createBdd, test } from 'playwright-bdd';
import type { Page } from '@playwright/test';
import {
  CommercialQuoteManagerPage,
  CommercialStatementsOfFactPage,
  CommercialReferralDetailsPage,
  CommercialReferralSubmitPage,
  CommercialPolicyIssuedPage,
} from '../../../../src/pages/mlis-portal-commercial';

const { When, Then } = createBdd(test);

function pages(page: Page) {
  return {
    quoteManager: new CommercialQuoteManagerPage(page),
    statements: new CommercialStatementsOfFactPage(page),
    referralDetails: new CommercialReferralDetailsPage(page),
    referralSubmit: new CommercialReferralSubmitPage(page),
    policyIssued: new CommercialPolicyIssuedPage(page),
  };
}

When('I proceed with referral from statements of fact', async ({ page }) => {
  const p = pages(page);
  await p.statements.proceedWithReferral();
  await p.referralDetails.expectLoaded();
});

When('I fill required referral details', async ({ page }) => {
  const p = pages(page);
  await p.referralDetails.fillRequiredDetails();
});

When('I submit the referral to underwriter', async ({ page }) => {
  const p = pages(page);
  await p.referralDetails.submitReferral();
  await p.referralSubmit.expectLoaded();
  await p.referralSubmit.submitToUnderwriter();
});

Then('I should see a referred commercial policy issued', async ({ page }) => {
  const p = pages(page);
  await p.policyIssued.expectPolicyIssued(/^[A-Z]{2,3}-MLI-\d{9}$/);
});

Then('I should return to commercial quote manager', async ({ page }) => {
  const p = pages(page);
  await p.policyIssued.backToQuoteManager();
  await p.quoteManager.expectLoaded();
});
