import { test } from '@playwright/test';
import { SalesforcePortalPage } from '../../src/pages/salesforce-cancellation';

function getSit1ClaimUserCredentials() {
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
    throw new Error(
      'Missing SIT1 claim user credentials. Set SALEFORCE_SIT1_CLAIMUSER and SALEFORCE_SIT1_CLAIMUSER_PASSWORD in .env.',
    );
  }

  return { username, password };
}

test.describe('temp sit1 claims login hold', () => {
  test('login as SIT1 claims user and hold session', async ({ page }) => {
    test.setTimeout(24 * 60 * 60 * 1000);

    process.env.TEST_ENV = 'SIT1';

    const salesforce = new SalesforcePortalPage(page);
    const claimCreds = getSit1ClaimUserCredentials();

    await salesforce.goto();
    await salesforce.login(claimCreds.username, claimCreds.password, {
      useJwt: true,
      fast: true,
      jwtUsername: claimCreds.username,
    });
    await salesforce.closeAllWorkspaceTabs();

    console.log('SIT1 claims user login successful. Holding browser session open.');

    await new Promise<void>(() => {
      // Keep session open for manual testing.
    });
  });
});
