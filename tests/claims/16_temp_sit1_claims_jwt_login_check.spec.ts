import { test } from '@playwright/test';
import { SalesforcePortalPage } from '../../src/pages/salesforce-cancellation';

test('SIT1 claims user Salesforce JWT login check', async ({ page }) => {
  test.setTimeout(180000);
  process.env.TEST_ENV = 'SIT1';

  const username = (
    process.env.SALEFORCE_SIT1_CLAIMUSER
    ?? process.env.SALESFORCE_SIT1_CLAIMUSER
    ?? ''
  ).trim();
  const password = (
    process.env.SALEFORCE_SIT1_CLAIMUSER_PASSWORD
    ?? process.env.SALESFORCE_SIT1_CLAIMUSER_PASSWORD
    ?? ''
  ).trim();

  if (!username || !password) {
    throw new Error('Missing SIT1 claims user credentials in .env.');
  }

  const salesforce = new SalesforcePortalPage(page);
  await salesforce.goto();
  await salesforce.login(username, password, {
    useJwt: true,
    fast: true,
    jwtUsername: username,
  });

  console.log('SIT1 claims user Salesforce JWT login successful.');
});
