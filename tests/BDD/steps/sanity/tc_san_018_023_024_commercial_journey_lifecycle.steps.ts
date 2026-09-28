import { createBdd, test } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { getSalesforceCredentials } from '../../../../src/config/env';
import { SalesforceQuoteJourneyCommercialEWPage } from '../../../../src/pages/salesforce-quote-journey-commercial-ew';
import { SalesforcePortalPage } from '../../../../src/pages/salesforce-cancellation';

const { Given, When, Then } = createBdd(test);

let lifecycleCaseRef = '';
let cnrCaseRef = '';
let cancellationCaseRef = '';

Given('I complete commercial quote journey and return to submission', async ({ page }) => {
  lifecycleCaseRef = `SF-QJ-COM-LIFECYCLE-${Date.now()}`;
  const sfCreds = getSalesforceCredentials();
  const quoteJourney = new SalesforceQuoteJourneyCommercialEWPage(page);

  await quoteJourney.loginAndOpenQuoteJourney(sfCreds.username, sfCreds.password);
  await quoteJourney.completeCommercialQuoteJourney(lifecycleCaseRef);
  await quoteJourney.returnToSubmission();
});

When('I perform MTA after return for commercial quote journey', async ({ page }) => {
  const quoteJourney = new SalesforceQuoteJourneyCommercialEWPage(page);
  await quoteJourney.performMtaAfterReturn(lifecycleCaseRef);
});

When('I perform CNR after return for commercial quote journey', async ({ page }) => {
  const quoteJourney = new SalesforceQuoteJourneyCommercialEWPage(page);
  await quoteJourney.performCnrAfterReturn(lifecycleCaseRef);
});

When('I perform cancellation after return for commercial quote journey', async ({ page }) => {
  const quoteJourney = new SalesforceQuoteJourneyCommercialEWPage(page);
  await quoteJourney.performCancellationAfterReturn(lifecycleCaseRef);
});

Then('commercial lifecycle actions should complete from quote journey context', async ({ page }) => {
  const salesforce = new SalesforcePortalPage(page);
  await salesforce.expectPolicyStatusCancelled();
});

Given('I complete commercial quote journey and return to submission for CNR', async ({ page }) => {
  cnrCaseRef = `SF-QJ-COM-E2E-CNR-${Date.now()}`;
  const sfCreds = getSalesforceCredentials();
  const quoteJourney = new SalesforceQuoteJourneyCommercialEWPage(page);

  await quoteJourney.loginAndOpenQuoteJourney(sfCreds.username, sfCreds.password);
  await quoteJourney.completeCommercialQuoteJourney(cnrCaseRef);
  await quoteJourney.returnToSubmission();
});

When('I perform CNR after return for commercial journey case', async ({ page }) => {
  const quoteJourney = new SalesforceQuoteJourneyCommercialEWPage(page);
  await quoteJourney.performCnrAfterReturn(cnrCaseRef);
});

Then('commercial CNR after return should complete', async ({ page }) => {
  await expect(page.getByRole('heading', { name: /Submission|Quote Journey/i }).first()).toBeVisible({ timeout: 120000 });
});

Given('I complete commercial quote journey and return to submission for cancellation', async ({ page }) => {
  cancellationCaseRef = `SF-QJ-COM-E2E-CAN-${Date.now()}`;
  const sfCreds = getSalesforceCredentials();
  const quoteJourney = new SalesforceQuoteJourneyCommercialEWPage(page);

  await quoteJourney.loginAndOpenQuoteJourney(sfCreds.username, sfCreds.password);
  await quoteJourney.completeCommercialQuoteJourney(cancellationCaseRef);
  await quoteJourney.returnToSubmission();
});

When('I perform cancellation after return for commercial journey case', async ({ page }) => {
  const quoteJourney = new SalesforceQuoteJourneyCommercialEWPage(page);
  await quoteJourney.performCancellationAfterReturn(cancellationCaseRef);
});

Then('commercial cancellation after return should complete', async ({ page }) => {
  const salesforce = new SalesforcePortalPage(page);
  await salesforce.expectPolicyStatusCancelled();
});
