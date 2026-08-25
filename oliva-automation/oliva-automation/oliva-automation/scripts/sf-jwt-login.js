#!/usr/bin/env node
/**
 * Salesforce JWT Bearer-flow login — mints an access token for a pre-authorized
 * user via a connected app + RSA private key. No password, no MFA (ideal for the
 * newprodqa2 sandbox where MFA is enforced).
 *
 * Inputs (env):
 *   SF_JWT_CLIENT_ID  connected-app consumer key
 *   SF_JWT_USERNAME   username to impersonate (must be pre-authorized on the app)
 *   SF_JWT_KEY_PATH   path to the RSA private key (PEM) matching the app's cert
 *   SF_LOGIN_URL      token host (default https://test.salesforce.com for sandbox)
 *   SF_JWT_AUD        audience claim (default = SF_LOGIN_URL)
 *
 * Output (stdout, JSON): { access_token, instance_url, frontdoor }
 *   `frontdoor` logs a browser straight in:  <instance_url>/secur/frontdoor.jsp?sid=<token>
 *
 * Usage:
 *   SF_JWT_CLIENT_ID=... SF_JWT_USERNAME=... SF_JWT_KEY_PATH=./server.key \
 *     node scripts/sf-jwt-login.js
 */
const crypto = require('crypto');
const fs = require('fs');

function b64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

async function main() {
  const clientId = process.env.SF_JWT_CLIENT_ID;
  const username = process.env.SF_JWT_USERNAME;
  const keyPath = process.env.SF_JWT_KEY_PATH;
  const loginUrl = (process.env.SF_LOGIN_URL || 'https://test.salesforce.com').replace(/\/$/, '');
  const aud = process.env.SF_JWT_AUD || loginUrl;

  const missing = [
    ['SF_JWT_CLIENT_ID', clientId],
    ['SF_JWT_USERNAME', username],
    ['SF_JWT_KEY_PATH', keyPath],
  ].filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) {
    console.error(`Missing required env: ${missing.join(', ')}`);
    process.exit(2);
  }

  let privateKey;
  try {
    privateKey = fs.readFileSync(keyPath, 'utf8');
  } catch (e) {
    console.error(`Cannot read private key at ${keyPath}: ${e.message}`);
    process.exit(2);
  }

  const header = b64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }));
  const claims = b64url(
    JSON.stringify({
      iss: clientId,
      sub: username,
      aud,
      exp: Math.floor(Date.now() / 1000) + 180,
    })
  );
  const signingInput = `${header}.${claims}`;
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(signingInput);
  const signature = b64url(signer.sign(privateKey));
  const assertion = `${signingInput}.${signature}`;

  const tokenUrl = `${loginUrl}/services/oauth2/token`;
  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`JWT auth failed (${res.status}): ${JSON.stringify(json)}`);
    console.error(
      'Common causes: cert/key mismatch, user not pre-authorized on the ' +
        'connected app, wrong aud (try the My Domain URL), or clock skew.'
    );
    process.exit(1);
  }

  const frontdoor = `${json.instance_url}/secur/frontdoor.jsp?sid=${json.access_token}`;
  console.log(JSON.stringify({
    access_token: json.access_token,
    instance_url: json.instance_url,
    frontdoor,
  }));
}

main().catch((e) => {
  console.error(e.stack || String(e));
  process.exit(1);
});
