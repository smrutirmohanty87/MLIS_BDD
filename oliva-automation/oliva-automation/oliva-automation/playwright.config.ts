import { defineConfig } from '@playwright/test';
import * as dotenv from 'dotenv';

// Force dotenv to override existing env vars so multi-environment switching works
dotenv.config({ override: true });

/**
 * Environment Switching — map ENVIRONMENT flag to .env variables
 * Usage: ENVIRONMENT=uat2 npx playwright test
 * Default: sit
 */
const ENVIRONMENT = process.env.ENVIRONMENT || 'sit';

const environmentConfig: Record<string, Record<string, string>> = {
  sit: {
    baseUrl: process.env.SF_BASE_URL || 'https://dualgroup--sit.sandbox.my.salesforce.com',
    jwtClientId: process.env.SF_JWT_CLIENT_ID || '',
    jwtLoginUrl: process.env.SF_JWT_LOGIN_URL || 'https://test.salesforce.com',
    username: process.env.SF_USERNAME || '',
    ualApproverUsername: process.env.SF_UAL_APPROVER_USERNAME || '',
    careUsername: process.env.SF_CARE_USERNAME || '',
    careUalApproverUsername: process.env.SF_CARE_UAL_APPROVER_USERNAME || '',
  },
  uat2: {
    baseUrl: process.env.SF_BASE_URL_UAT2 || 'https://dualgroup--uat2.sandbox.my.salesforce.com',
    jwtClientId: process.env.SALESFORCE_UAT2_JWT_CLIENT_ID || '',
    jwtLoginUrl: 'https://test.salesforce.com',
    username: process.env.SALESFORCE_UAT2_JWT_USERNAME || '',
    ualApproverUsername: process.env.SF_CON_UAL_APPROVER_USERNAME_UAT2 || '',
    careUsername: process.env.SF_CARE_USERNAME_UAT2 || '',
    careUalApproverUsername: process.env.SF_CARE_UAL_APPROVER_USERNAME_UAT2 || '',
  },
  newprodqa2: {
    baseUrl: process.env.SF_BASE_URL_NEWPRODQA2 || 'https://dualgroup--newprodqa2.sandbox.my.salesforce.com',
    jwtClientId: process.env.SALESFORCE_NEWPRODQA2_JWT_CLIENT_ID || '',
    jwtLoginUrl: 'https://test.salesforce.com',
    username: process.env.SALESFORCE_NEWPRODQA2_JWT_USERNAME || '',
    ualApproverUsername: process.env.SF_CON_UAL_APPROVER_USERNAME_NEWPRODQA2 || '',
    careUsername: process.env.SF_CARE_USERNAME_NEWPRODQA2 || '',
    careUalApproverUsername: process.env.SF_CARE_UAL_APPROVER_USERNAME_NEWPRODQA2 || '',
  },
};

const config = environmentConfig[ENVIRONMENT];
if (!config) {
  throw new Error(`Unknown environment: ${ENVIRONMENT}. Valid options: sit, uat2, newprodqa2`);
}

// Auto-set active environment variables for tests
process.env.SF_BASE_URL = config.baseUrl;
process.env.SF_JWT_CLIENT_ID = config.jwtClientId;
process.env.SF_JWT_LOGIN_URL = config.jwtLoginUrl;
process.env.SF_USERNAME = config.username;
process.env.SF_UAL_APPROVER_USERNAME = config.ualApproverUsername;
process.env.SF_CARE_USERNAME = config.careUsername;
process.env.SF_CARE_UAL_APPROVER_USERNAME = config.careUalApproverUsername;

console.log(`🔧 Environment: ${ENVIRONMENT}`);
console.log(`📍 Base URL: ${config.baseUrl}`);

/**
 * Salesforce Lightning is slow and stateful: single worker, no parallelism,
 * generous timeouts. The full NB-policy journey is one long E2E test.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 30 * 60 * 1000,
  expect: { timeout: 45_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: config.baseUrl,
    actionTimeout: 45_000,
    navigationTimeout: 90_000,
    viewport: { width: 1920, height: 1080 },
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',
  },
});
