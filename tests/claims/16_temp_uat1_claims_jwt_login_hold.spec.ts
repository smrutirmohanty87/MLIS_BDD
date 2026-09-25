import { test } from '@playwright/test';
import { SalesforcePortalPage } from '../../src/pages/salesforce-cancellation';

test('login as UAT1 claims user with JWT and hold session until browser is closed', async ({ page }) => {
  test.setTimeout(0);
  process.env.TEST_ENV = 'UAT1';

  const username = (process.env.SALEFORCE_UAT1_CLAIMUSER ?? process.env.SALESFORCE_UAT1_CLAIMUSER ?? '').trim();
  const password = (
    process.env.SALEFORCE_UAT1_CLAIMUSER_PASSWORD ?? process.env.SALESFORCE_UAT1_CLAIMUSER_PASSWORD ?? ''
  ).trim();

  if (!username || !password) {
    throw new Error('Missing UAT1 claims user credentials in .env.');
  }

  const salesforce = new SalesforcePortalPage(page);
  await salesforce.goto();
  await salesforce.login(username, password, {
    useJwt: true,
    fast: true,
    jwtUsername: username,
  });

  console.log('UAT1 claims user Salesforce JWT login successful. Keeping session open until browser is closed.');

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
