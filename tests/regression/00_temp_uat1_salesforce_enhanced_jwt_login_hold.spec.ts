import { test } from '@playwright/test';
import { SalesforcePortalPage } from '../../src/pages/salesforce-cancellation';

test('login as UAT1 Salesforce enhanced user with JWT and hold session until browser is closed', async ({ page }) => {
  test.setTimeout(0);
  process.env.TEST_ENV = 'UAT1';

  const username = (
    process.env.SALEFORCE_UAT1_ENHANCEDUSER
    ?? process.env.SALESFORCE_UAT1_ENHANCEDUSER
    ?? process.env.UAT1_SALESFORCE_USERNAME
    ?? ''
  ).trim();

  const password = (
    process.env.SALEFORCE_UAT1_ENHANCEDUSER_PASSWORD
    ?? process.env.SALESFORCE_UAT1_ENHANCEDUSER_PASSWORD
    ?? process.env.UAT1_SALESFORCE_PASSWORD
    ?? ''
  ).trim();

  const jwtUsername = (process.env.SALESFORCE_UAT1_JWT_USERNAME ?? username).trim();

  if (!username || !password) {
    throw new Error('Missing UAT1 enhanced Salesforce user credentials in .env.');
  }

  const salesforce = new SalesforcePortalPage(page);
  await salesforce.goto();
  await salesforce.login(username, password, {
    useJwt: true,
    fast: true,
    jwtUsername,
  });

  console.log('UAT1 enhanced Salesforce JWT login successful. Keeping session open until browser is closed.');

  while (true) {
    if (page.isClosed()) {
      break;
    }

    try {
      await page.waitForTimeout(1000);
    } catch {
      break;
    }
  }
});
