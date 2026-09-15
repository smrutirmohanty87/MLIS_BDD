import { test } from '@playwright/test';
import { SalesforcePortalPage } from '../../src/pages/salesforce-cancellation';

test('UAT2 claims user Salesforce JWT login check', async ({ page }) => {
  test.setTimeout(180000);
  process.env.TEST_ENV = 'UAT2';

  const username = (
    process.env.SALEFORCE_UAT2_CLAIMUSER
    ?? process.env.SALESFORCE_UAT2_CLAIMUSER
    ?? ''
  ).trim();
  const password = (
    process.env.SALEFORCE_UAT2_CLAIMUSER_PASSWORD
    ?? process.env.SALESFORCE_UAT2_CLAIMUSER_PASSWORD
    ?? ''
  ).trim();

  if (!username || !password) {
    throw new Error('Missing UAT2 claims user credentials in .env.');
  }

  const salesforce = new SalesforcePortalPage(page);
  await salesforce.goto();
  await salesforce.login(username, password, {
    useJwt: true,
    fast: true,
    jwtUsername: username,
  });

  console.log('UAT2 claims user Salesforce JWT login successful.');
});
