import { test } from '@playwright/test';
import { SalesforcePortalPage } from '../../src/pages/salesforce-cancellation';

test.describe('temp uat2 claims login hold', () => {
  test('login as UAT2 claims user and hold session', async ({ page }) => {
    test.setTimeout(0);
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
      throw new Error('Missing UAT2 claims user credentials. Set SALEFORCE_UAT2_CLAIMUSER and SALEFORCE_UAT2_CLAIMUSER_PASSWORD in .env.');
    }

    const salesforce = new SalesforcePortalPage(page);
    await salesforce.goto();
    await salesforce.login(username, password, {
      useJwt: false,
      fast: true,
    });

    console.log('UAT2 claims login successful. Holding browser session until window is closed manually.');

    await page.waitForEvent('close');
  });
});
