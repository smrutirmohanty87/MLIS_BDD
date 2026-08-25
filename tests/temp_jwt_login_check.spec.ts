import { expect, test } from '@playwright/test';
import { getSalesforceCredentials } from '../src/config/env';
import { SalesforcePortalPage } from '../src/pages/salesforce-cancellation';

test('temp jwt login check', async ({ page }) => {
  test.setTimeout(180000);

  const salesforce = new SalesforcePortalPage(page);
  const sfCreds = getSalesforceCredentials();

  await salesforce.goto();
  await salesforce.login(sfCreds.username, sfCreds.password, { useJwt: true, fast: true });

  await expect(page.getByRole('link', { name: 'Accounts' }).first()).toBeVisible({ timeout: 60000 });
});