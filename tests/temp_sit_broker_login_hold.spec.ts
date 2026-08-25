import { test } from '@playwright/test';
import { LoginPage, QuoteManagerPage } from '../src/pages/mlis-portal';
import { getBrokerCredentials } from '../src/config/env';

test('temp SIT broker login and hold', async ({ page }) => {
  // Keep this session available for manual checks.
  test.setTimeout(24 * 60 * 60 * 1000);

  const loginPage = new LoginPage(page);
  const quoteManager = new QuoteManagerPage(page);
  const brokerCreds = getBrokerCredentials();

  await loginPage.goto();
  await loginPage.login(brokerCreds.username, brokerCreds.password);
  await quoteManager.expectLoaded();

  console.log('SIT broker login successful. Holding browser open.');
  await page.waitForTimeout(24 * 60 * 60 * 1000);
});
