import * as crypto from 'crypto';
import * as fs from 'fs';
import { Page, expect } from '@playwright/test';
import { closeAllWorkspaceTabs } from '../utils/sf';

/**
 * Salesforce JWT Bearer-flow auth for the newprodqa2 sandbox (MFA-enforced).
 * Mints an access token for a pre-authorized user via a connected app + RSA
 * private key — no password, no MFA — and logs a browser session in through
 * `secur/frontdoor.jsp`. Used for the main (UW3) context and the UW5 approver
 * context alike.
 *
 * Config (env, never committed):
 *   SF_JWT_CLIENT_ID   connected-app consumer key
 *   SF_JWT_KEY_PATH    path to the RSA private key (PEM) matching the app cert
 *   SF_JWT_LOGIN_URL   token host / audience (default https://test.salesforce.com)
 */

export interface JwtSession {
  accessToken: string;
  instanceUrl: string;
  frontdoor: string;
}

function b64url(input: crypto.BinaryLike): string {
  return Buffer.from(input as Buffer)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/** Mint a JWT session for `username`. Throws with the SF error on failure. */
export async function mintSession(username: string): Promise<JwtSession> {
  const clientId = process.env.SF_JWT_CLIENT_ID;
  const keyPath = process.env.SF_JWT_KEY_PATH;
  const loginUrl = (process.env.SF_JWT_LOGIN_URL || 'https://test.salesforce.com').replace(/\/$/, '');
  const aud = process.env.SF_JWT_AUD || loginUrl;

  if (!clientId) throw new Error('SF_JWT_CLIENT_ID is not set');
  if (!keyPath) throw new Error('SF_JWT_KEY_PATH is not set');
  const privateKey = fs.readFileSync(keyPath, 'utf8');

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
  const assertion = `${signingInput}.${b64url(signer.sign(privateKey))}`;

  const res = await fetch(`${loginUrl}/services/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      `JWT auth failed for ${username} (${res.status}): ${JSON.stringify(json)}`
    );
  }
  return {
    accessToken: json.access_token,
    instanceUrl: json.instance_url,
    frontdoor: `${json.instance_url}/secur/frontdoor.jsp?sid=${json.access_token}`,
  };
}

/**
 * Run a SOQL query via the REST API (JWT-minted token) and return the first
 * record, or undefined. Used to resolve record ids so the flow can open a
 * record page directly — far more robust than driving console list views.
 */
export async function sfQueryOne(
  username: string,
  soql: string
): Promise<Record<string, unknown> | undefined> {
  const { accessToken, instanceUrl } = await mintSession(username);
  const res = await fetch(
    `${instanceUrl}/services/data/v60.0/query?q=${encodeURIComponent(soql)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const json: any = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(`SOQL query failed (${res.status}): ${JSON.stringify(json)}`);
  }
  return json.records?.[0];
}

/**
 * Log `page` into Salesforce as `username` via JWT + frontdoor (no password,
 * no MFA). Waits for the Lightning shell. Mirrors LoginPage.login()'s contract
 * so page objects work unchanged.
 */
export async function jwtLogin(page: Page, username: string): Promise<void> {
  const { frontdoor } = await mintSession(username);
  await page.goto(frontdoor);
  await page.waitForURL(/lightning/, { timeout: 120_000 });
  const shellReady = page
    .getByRole('button', { name: 'Search' })
    .or(page.getByRole('heading', { name: /Insurance Agent Console/ }))
    .first();
  await expect(shellReady).toBeVisible({ timeout: 120_000 });

  // The Salesforce console remembers open workspace tabs PER USER, so a fresh
  // JWT session can inherit stale tabs from a prior session — which forces
  // list views into a cramped split-view and breaks navigation. Close them all
  // (the doc's "after login close all open tabs" step).
  await closeAllWorkspaceTabs(page);
}
