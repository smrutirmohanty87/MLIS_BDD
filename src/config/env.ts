import { getEnvConfig as getManagedEnvConfig } from './envManager';

type Credentials = { username: string; password: string };
type BrokerProfile = 'NO_COMM' | 'INTER_COMM' | 'BDE_COMM' | 'INTRO_COMM';
type SalesforceJwtConfig = {
  clientId: string;
  privateKey?: string;
  privateKeyPath?: string;
  loginUrl: string;
  audience: string;
};

type EnvConfig = {
  mlisPortalUrl: string;
  salesforceLightningUrl: string;
  broker: Credentials;
  salesforce: Credentials;
};

export function getEnvConfig(): EnvConfig {
  const managed = getManagedEnvConfig();
  return {
    mlisPortalUrl: managed.portalUrl,
    salesforceLightningUrl: managed.salesforceUrl,
    broker: {
      username: managed.brokerUsername,
      password: managed.brokerPassword,
    },
    salesforce: {
      username: managed.salesforceUsername,
      password: managed.salesforcePassword,
    },
  };
}

export function getBrokerCredentials(): Credentials {
  return getEnvConfig().broker;
}

function normalizeEnvName(value: string | undefined): string {
  const env = (value ?? '').trim().toUpperCase();
  if (!env) return 'SIT1';
  if (env === 'SIT') return 'SIT1';
  return env;
}

function getEnvAliasNames(envName: string): string[] {
  if (envName === 'SIT1') return [envName, 'SIT'];
  return [envName];
}

function getOptionalEnvValue(varNames: string[]): string | undefined {
  for (const varName of varNames) {
    const value = process.env[varName]?.trim();
    if (value) return value;
  }
  return undefined;
}

function getJwtVarCandidates(envName: string, suffix: string): string[] {
  const candidates: string[] = [];
  for (const alias of getEnvAliasNames(envName)) {
    candidates.push(`SALEFORCE_${alias}_${suffix}`);
    candidates.push(`SALESFORCE_${alias}_${suffix}`);
  }
  return candidates;
}

export function getBrokerCredentialsForProfile(profile: BrokerProfile): Credentials {
  const envName = normalizeEnvName(process.env.TEST_ENV);
  const normalizedProfile = profile.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '_');

  const usernameVar = `SALEFORCE_${envName}_${normalizedProfile}_BROKERUSER`;
  const passwordVar = `SALEFORCE_${envName}_${normalizedProfile}_BROKERPASSWORD`;

  const username = process.env[usernameVar];
  const password = process.env[passwordVar];

  if (username && password) {
    return { username, password };
  }

  return getBrokerCredentials();
}

export function getSalesforceCredentials(): Credentials {
  return getEnvConfig().salesforce;
}

export function getSalesforceJwtConfig(): SalesforceJwtConfig | null {
  const envName = normalizeEnvName(process.env.TEST_ENV);

  const clientId = getOptionalEnvValue(getJwtVarCandidates(envName, 'JWT_CLIENT_ID'));
  if (!clientId) return null;

  const privateKey = getOptionalEnvValue(getJwtVarCandidates(envName, 'JWT_PRIVATE_KEY'));
  const privateKeyPath = getOptionalEnvValue(getJwtVarCandidates(envName, 'JWT_PRIVATE_KEY_PATH'));

  if (!privateKey && !privateKeyPath) {
    const expectedVars = getJwtVarCandidates(envName, 'JWT_PRIVATE_KEY_PATH').concat(
      getJwtVarCandidates(envName, 'JWT_PRIVATE_KEY'),
    );
    throw new Error(
      `[env] Salesforce JWT is configured for ${envName} but no private key was provided. Set one of: ${expectedVars.join(', ')}`,
    );
  }

  const loginUrl =
    getOptionalEnvValue(getJwtVarCandidates(envName, 'JWT_LOGIN_URL')) ?? 'https://test.salesforce.com';
  const audience = getOptionalEnvValue(getJwtVarCandidates(envName, 'JWT_AUD')) ?? loginUrl;

  return {
    clientId,
    privateKey,
    privateKeyPath,
    loginUrl,
    audience,
  };
}

export function getSalesforceJwtUsername(): string | undefined {
  const envName = normalizeEnvName(process.env.TEST_ENV);
  return getOptionalEnvValue(getJwtVarCandidates(envName, 'JWT_USERNAME'));
}

export function getMlisPortalUrl(): string {
  return getEnvConfig().mlisPortalUrl;
}

export function getSalesforceLightningUrl(): string {
  return getEnvConfig().salesforceLightningUrl;
}
