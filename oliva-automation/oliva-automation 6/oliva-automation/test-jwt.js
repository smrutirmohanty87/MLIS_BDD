require('dotenv').config();

const crypto = require('crypto');
const fs = require('fs');

function b64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function testJWT() {
  const clientId = process.env.SF_JWT_CLIENT_ID;
  const keyPath = process.env.SF_JWT_KEY_PATH;
  const loginUrl = (process.env.SF_JWT_LOGIN_URL || 'https://test.salesforce.com').replace(/\/$/, '');
  const username = process.env.SF_USERNAME || 't-0011-con-uw3-auto-provar@scc.sit';

  console.log('=== JWT Configuration ===');
  console.log(`SF_BASE_URL: ${process.env.SF_BASE_URL}`);
  console.log(`SF_USERNAME: ${username}`);
  console.log(`SF_JWT_CLIENT_ID: ${clientId}`);
  console.log(`SF_JWT_KEY_PATH: ${keyPath}`);
  console.log(`SF_JWT_LOGIN_URL: ${loginUrl}`);
  console.log('');

  if (!clientId) {
    console.error('❌ ERROR: SF_JWT_CLIENT_ID is not set');
    process.exit(1);
  }

  if (!keyPath) {
    console.error('❌ ERROR: SF_JWT_KEY_PATH is not set');
    process.exit(1);
  }

  if (!fs.existsSync(keyPath)) {
    console.error(`❌ ERROR: Private key file not found: ${keyPath}`);
    process.exit(1);
  }

  const privateKey = fs.readFileSync(keyPath, 'utf8');
  console.log('✓ Private key file loaded');

  // Create JWT
  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(
    JSON.stringify({
      iss: clientId,
      sub: username,
      aud: loginUrl,
      exp: Math.floor(Date.now() / 1000) + 180,
    })
  );
  const signingInput = `${header}.${claims}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  const assertion = `${signingInput}.${b64url(signer.sign(privateKey))}`;

  console.log('✓ JWT assertion created');
  console.log('');
  console.log('=== JWT Token Payload ===');
  console.log(JSON.stringify(JSON.parse(Buffer.from(claims, 'base64').toString()), null, 2));
  console.log('');

  // Test token exchange
  console.log('=== Testing Token Exchange ===');
  try {
    const res = await fetch(`${loginUrl}/services/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
        assertion,
      }),
    });

    const json = await res.json().catch(() => ({}));

    console.log(`Status: ${res.status}`);
    console.log(`Response:`, JSON.stringify(json, null, 2));
    console.log('');

    if (res.ok) {
      console.log('✅ JWT Authentication SUCCESSFUL');
      console.log(`Access Token: ${json.access_token.substring(0, 20)}...`);
      console.log(`Instance URL: ${json.instance_url}`);
    } else {
      console.error('❌ JWT Authentication FAILED');
      console.error(`Error: ${json.error}`);
      console.error(`Description: ${json.error_description}`);
    }
  } catch (err) {
    console.error('❌ Network error:', err.message);
    process.exit(1);
  }
}

testJWT();
