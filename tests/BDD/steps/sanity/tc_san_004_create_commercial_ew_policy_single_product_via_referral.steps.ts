import { createBdd, test } from 'playwright-bdd';
import { CommercialQuoteManagerPage, CommercialReferralSubmittedPage } from '../../../../src/pages/mlis-portal-commercial';

const { Then } = createBdd(test);

Then('I should see commercial referral submitted confirmation', async ({ page }) => {
  const referralSubmitted = new CommercialReferralSubmittedPage(page);
  await referralSubmitted.expectLoaded();
});

Then('I should return to quote manager from referral submitted page', async ({ page }) => {
  const referralSubmitted = new CommercialReferralSubmittedPage(page);
  const quoteManager = new CommercialQuoteManagerPage(page);

  await referralSubmitted.backToQuoteManager();
  await quoteManager.expectLoaded();
});
