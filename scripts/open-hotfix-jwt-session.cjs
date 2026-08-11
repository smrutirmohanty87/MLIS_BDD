const fs = require('fs');
const crypto = require('crypto');
const path = require('path');
const { chromium } = require('playwright');
require('dotenv').config();

function readEnv(name, required = true) {
  const value = (process.env[name] || '').trim();
  if (!value && required) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

function readFirstEnv(names, required = true) {
  for (const name of names) {
    const value = (process.env[name] || '').trim();
    if (value) {
      return value;
    }
  }
  if (required) {
    throw new Error(`Missing required env var. Tried: ${names.join(', ')}`);
  }
  return '';
}

function b64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function createJwtAssertion({ clientId, username, loginUrl, privateKeyPem }) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = {
    iss: clientId,
    sub: username,
    aud: loginUrl,
    exp: now + 3 * 60,
  };

  const encodedHeader = b64url(JSON.stringify(header));
  const encodedPayload = b64url(JSON.stringify(payload));
  const signingInput = `${encodedHeader}.${encodedPayload}`;

  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  signer.end();

  const signature = signer
    .sign(privateKeyPem)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');

  return `${signingInput}.${signature}`;
}

async function getJwtToken({ clientId, username, loginUrl, privateKeyPem }) {
  const assertion = createJwtAssertion({ clientId, username, loginUrl, privateKeyPem });

  const response = await fetch(`${loginUrl}/services/oauth2/token`, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  const json = await response.json();
  if (!response.ok || !json.access_token || !json.instance_url) {
    throw new Error(`JWT auth failed (${response.status}): ${JSON.stringify(json)}`);
  }

  return {
    accessToken: json.access_token,
    instanceUrl: json.instance_url,
  };
}

async function main() {
  const envName = (process.env.TEST_ENV || 'HOTFIX').trim().toUpperCase();
  const username = readFirstEnv([
    `SALEFORCE_${envName}_ENHANCEDUSER`,
    `SALESFORCE_${envName}_ENHANCEDUSER`,
  ]);
  const clientId = readFirstEnv([
    `SALESFORCE_${envName}_JWT_CLIENT_ID`,
    `SALEFORCE_${envName}_JWT_CLIENT_ID`,
  ]);
  const loginUrl = readFirstEnv([
    `SALESFORCE_${envName}_JWT_LOGIN_URL`,
    `SALEFORCE_${envName}_JWT_LOGIN_URL`,
  ], false) || 'https://test.salesforce.com';
  const keyPathRaw = readFirstEnv([
    `SALESFORCE_${envName}_JWT_PRIVATE_KEY_PATH`,
    `SALEFORCE_${envName}_JWT_PRIVATE_KEY_PATH`,
  ]);
  const keyPath = path.resolve(keyPathRaw.replace(/^"|"$/g, ''));
  const privateKeyPem = fs.readFileSync(keyPath, 'utf8');

  console.log(`[jwt] Authenticating ${username} against ${loginUrl} ...`);
  const { accessToken, instanceUrl } = await getJwtToken({
    clientId,
    username,
    loginUrl,
    privateKeyPem,
  });

  const browser = await chromium.launch({ headless: false, channel: 'chrome' });
  const context = await browser.newContext();
  const page = await context.newPage();

  const frontdoorUrl = `${instanceUrl}/secur/frontdoor.jsp?sid=${encodeURIComponent(accessToken)}`;
  await page.goto(frontdoorUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForLoadState('networkidle', { timeout: 120000 }).catch(() => undefined);

  console.log('[jwt] HOTFIX opened successfully. Close the browser window to end this session.');

  await new Promise((resolve) => browser.on('disconnected', resolve));
  console.log('[jwt] Browser closed by user. Exiting.');
}

main().catch((error) => {
  console.error(`[jwt] Failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
