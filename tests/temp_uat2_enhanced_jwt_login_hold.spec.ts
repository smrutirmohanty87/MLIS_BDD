import { expect, test } from '@playwright/test';
import { getSalesforceCredentials } from '../src/config/env';
import { SalesforcePortalPage } from '../src/pages/salesforce-cancellation';

test('UAT2 enhanced user Salesforce JWT login and hold', async ({ page }) => {
  test.setTimeout(0);
  process.env.TEST_ENV = 'UAT2';

  const credentials = getSalesforceCredentials();
  const salesforce = new SalesforcePortalPage(page);
  await salesforce.goto();
  await salesforce.login(credentials.username, credentials.password, {
    useJwt: true,
    fast: true,
  });

  await expect(page).toHaveURL(/(?:salesforce\.com|\.force\.com)/i);
  console.log('UAT2 enhanced-user JWT login successful. Holding browser session until window is closed manually.');
  await page.waitForEvent('close');
});
