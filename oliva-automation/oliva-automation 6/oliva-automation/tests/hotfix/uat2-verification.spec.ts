import { test, expect } from '@playwright/test';
import { mintSession } from '../../src/auth/sfJwt';

test.describe('UAT2 Environment - Verification', () => {
  test('Login to UAT2 Sandbox - Construction User', async ({ page }) => {
    // Override environment for UAT2
    process.env.SF_JWT_CLIENT_ID = process.env.SALESFORCE_UAT2_JWT_CLIENT_ID;
    process.env.SF_JWT_KEY_PATH = process.env.SALESFORCE_UAT2_JWT_PRIVATE_KEY_FILE || './automation_server.key';
    process.env.SF_JWT_LOGIN_URL = process.env.SALESFORCE_UAT2_JWT_LOGIN_URL || 'https://test.salesforce.com';

    const username = process.env.SALESFORCE_UAT2_JWT_USERNAME;
    if (!username) {
      throw new Error('SALESFORCE_UAT2_JWT_USERNAME is not set');
    }

    console.log(`🔐 Testing UAT2 Environment`);
    console.log(`👤 User: ${username}`);

    // Mint JWT session
    const session = await mintSession(username);
    console.log(`✅ JWT Session minted successfully`);
    console.log(`📍 Instance URL: ${session.instanceUrl}`);

    // Navigate to Salesforce via frontdoor
    await page.goto(session.frontdoor);
    console.log(`✅ Logged in to Salesforce UAT2 environment`);

    // Verify login by checking for Salesforce UI elements
    await expect(page).toHaveTitle(/Salesforce|Setup/);
    console.log(`✅ Salesforce page loaded successfully`);

    // Take screenshot to verify environment
    await page.screenshot({ path: 'test-results/uat2-login-verification.png' });
    console.log(`📸 Screenshot saved to test-results/uat2-login-verification.png`);

    console.log(`\n✅ UAT2 ENVIRONMENT SETUP IS GOOD TO RUN TESTS\n`);
  });

  test('Login to UAT2 Sandbox - Care User', async ({ page }) => {
    // Override environment for UAT2
    process.env.SF_JWT_CLIENT_ID = process.env.SALESFORCE_UAT2_JWT_CLIENT_ID;
    process.env.SF_JWT_KEY_PATH = process.env.SALESFORCE_UAT2_JWT_PRIVATE_KEY_FILE || './automation_server.key';
    process.env.SF_JWT_LOGIN_URL = process.env.SALESFORCE_UAT2_JWT_LOGIN_URL || 'https://test.salesforce.com';

    const username = process.env.SALESFORCE_UAT2_CARE_JWT_USERNAME;
    if (!username) {
      throw new Error('SALESFORCE_UAT2_CARE_JWT_USERNAME is not set');
    }

    console.log(`🔐 Testing UAT2 Environment - Care User`);
    console.log(`👤 User: ${username}`);

    // Mint JWT session
    const session = await mintSession(username);
    console.log(`✅ JWT Session minted successfully`);
    console.log(`📍 Instance URL: ${session.instanceUrl}`);

    // Navigate to Salesforce via frontdoor
    await page.goto(session.frontdoor);
    console.log(`✅ Logged in to Salesforce UAT2 environment`);

    // Verify login by checking for Salesforce UI elements
    await expect(page).toHaveTitle(/Salesforce|Setup/);
    console.log(`✅ Salesforce page loaded successfully`);

    console.log(`\n✅ UAT2 CARE USER SETUP IS GOOD\n`);
  });

  test('Login to UAT2 Sandbox - Care Approver User', async ({ page }) => {
    // Override environment for UAT2
    process.env.SF_JWT_CLIENT_ID = process.env.SALESFORCE_UAT2_JWT_CLIENT_ID;
    process.env.SF_JWT_KEY_PATH = process.env.SALESFORCE_UAT2_JWT_PRIVATE_KEY_FILE || './automation_server.key';
    process.env.SF_JWT_LOGIN_URL = process.env.SALESFORCE_UAT2_JWT_LOGIN_URL || 'https://test.salesforce.com';

    const username = process.env.SALESFORCE_UAT2_CARE_APPROVER_JWT_USERNAME;
    if (!username) {
      throw new Error('SALESFORCE_UAT2_CARE_APPROVER_JWT_USERNAME is not set');
    }

    console.log(`🔐 Testing UAT2 Environment - Care Approver User`);
    console.log(`👤 User: ${username}`);

    // Mint JWT session
    const session = await mintSession(username);
    console.log(`✅ JWT Session minted successfully`);
    console.log(`📍 Instance URL: ${session.instanceUrl}`);

    // Navigate to Salesforce via frontdoor
    await page.goto(session.frontdoor);
    console.log(`✅ Logged in to Salesforce UAT2 environment`);

    // Verify login by checking for Salesforce UI elements
    await expect(page).toHaveTitle(/Salesforce|Setup/);
    console.log(`✅ Salesforce page loaded successfully`);

    console.log(`\n✅ UAT2 CARE APPROVER USER SETUP IS GOOD\n`);
  });
});
