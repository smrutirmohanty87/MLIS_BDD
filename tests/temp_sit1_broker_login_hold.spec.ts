import { test } from '@playwright/test';
import { CommercialLoginPage, CommercialQuoteManagerPage } from '../src/pages/mlis-portal-commercial';
import { getBrokerCredentials } from '../src/config/env';

test.describe('temp sit1 broker login hold', () => {
  test('login to SIT1 broker portal and hold session', async ({ page }) => {
    test.setTimeout(24 * 60 * 60 * 1000);

    process.env.TEST_ENV = 'SIT1';

    const loginPage = new CommercialLoginPage(page);
    const quoteManager = new CommercialQuoteManagerPage(page);

    await loginPage.goto();
    const brokerCreds = getBrokerCredentials();
    await loginPage.login(brokerCreds.username, brokerCreds.password);
    await quoteManager.expectLoaded();

    console.log('SIT1 broker login successful. Holding browser session open.');

    await new Promise<void>(() => {
      // Keep session open for manual testing.
    });
  });
});
