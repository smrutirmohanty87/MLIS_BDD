import { test, expect } from '@playwright/test';
import { mintSession } from '../../src/auth/sfJwt';

test.describe('Hotfix Environment - Login & Pause', () => {
  test('Login to Hotfix Sandbox and Pause for Manual Testing', async ({ page }) => {
    // Override environment for hotfix
    process.env.SF_JWT_CLIENT_ID = process.env.SALESFORCE_HOTFIX_JWT_CLIENT_ID;
    process.env.SF_JWT_KEY_PATH = process.env.SALESFORCE_HOTFIX_JWT_PRIVATE_KEY_FILE || './automation_server.key';
    process.env.SF_JWT_LOGIN_URL = process.env.SALESFORCE_HOTFIX_JWT_LOGIN_URL || 'https://test.salesforce.com';

    const username = process.env.SALESFORCE_HOTFIX_SYSTEM_ADMIN_USERNAME;
    if (!username) {
      throw new Error('SALESFORCE_HOTFIX_SYSTEM_ADMIN_USERNAME is not set');
    }

    // Mint JWT session and login
    const session = await mintSession(username);
    console.log(`✅ JWT Session minted for ${username}`);
    console.log(`📍 Instance URL: ${session.instanceUrl}`);

    // Navigate to Salesforce via frontdoor
    await page.goto(session.frontdoor);
    console.log(`✅ Logged in to Salesforce Hotfix environment`);

    // Verify login by checking for Salesforce UI elements
    await expect(page).toHaveTitle(/Salesforce|Setup/);
    console.log(`✅ Salesforce page loaded successfully`);

    // Pause test for manual interaction
    console.log('⏸️  Test paused - you can now interact with the browser');
    console.log('📝 When done, close the browser or press Ctrl+C to exit');
    
    await page.pause();

    console.log('✅ Test resumed');
  });
});
