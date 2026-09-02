declare const process: { env: Record<string, string | undefined> };

export type EnvName = string;

export type EnvConfig = {
  portalUrl: string;
  salesforceUrl: string;
  brokerUsername: string;
  brokerPassword: string;
  salesforceUsername: string;
  salesforcePassword: string;
};

let cached: EnvConfig | null = null;
let didLog = false;

function normalizeEnvName(value: string | undefined): string {
  const env = (value ?? '').trim().toUpperCase();
  if (!env) return 'SIT1';
  if (env === 'SIT') return 'SIT1';
  return env;
}

function resolveEnvVarName(envName: string, baseName: string): string {
  // Backward compatibility: UAT2 uses unprefixed variables as per existing .env.
  if (envName === 'UAT2') return baseName;
  return `${envName}_${baseName}`;
}

function requiredEnvVar(varName: string): string {
  const value = process.env[varName];
  if (!value) {
    throw new Error(`[env] Missing ${varName}. Set it in .env (or export it in your shell).`);
  }
  return value;
}

function getEnvVarWithOptionalFallback(envName: string, baseName: string): string {
  const primaryVar = resolveEnvVarName(envName, baseName);
  const primaryValue = process.env[primaryVar];
  if (primaryValue) return primaryValue;

  return requiredEnvVar(primaryVar);
}

function normalizeBrokerProfile(value: string | undefined): string {
  const profile = (value ?? '').trim().toUpperCase();
  if (!profile) return 'NO_COMM';
  return profile.replace(/[^A-Z0-9]+/g, '_');
}

function getBrokerUsernameWithAlias(envName: string): string {
  const brokerProfile = normalizeBrokerProfile(process.env.TEST_BROKER_PROFILE);
  const aliasCandidates = [
    `SALEFORCE_${envName}_${brokerProfile}_BROKERUSER`,
    `SALEFORCE_${envName}_NO_COMM_BROKERUSER`,
  ];

  for (const aliasVar of aliasCandidates) {
    const aliasValue = process.env[aliasVar];
    if (aliasValue) return aliasValue;
  }

  return getEnvVarWithOptionalFallback(envName, 'BROKER_USERNAME');
}

function getSalesforceUsernameWithAlias(envName: string): string {
  const aliasVar = `SALEFORCE_${envName}_ENHANCEDUSER`;
  const aliasValue = process.env[aliasVar];
  if (aliasValue) return aliasValue;

  return getEnvVarWithOptionalFallback(envName, 'SALESFORCE_USERNAME');
}

function getBrokerPasswordWithAlias(envName: string): string {
  const brokerProfile = normalizeBrokerProfile(process.env.TEST_BROKER_PROFILE);
  const aliasCandidates = [
    `SALEFORCE_${envName}_${brokerProfile}_BROKERPASSWORD`,
    `SALEFORCE_${envName}_NO_COMM_BROKERPASSWORD`,
  ];

  for (const aliasVar of aliasCandidates) {
    const aliasValue = process.env[aliasVar];
    if (aliasValue) return aliasValue;
  }

  return getEnvVarWithOptionalFallback(envName, 'BROKER_PASSWORD');
}

function getSalesforcePasswordWithAlias(envName: string): string {
  const aliasVar = `SALEFORCE_${envName}_ENHANCEDUSER_PASSWORD`;
  const aliasValue = process.env[aliasVar];
  if (aliasValue) return aliasValue;

  return getEnvVarWithOptionalFallback(envName, 'SALESFORCE_PASSWORD');
}

/**
 * Centralized environment config resolver.
 *
 * Reads process.env.TEST_ENV (defaults to SIT1) and maps to the corresponding
 * .env variable set, returning a structured config object.
 */
export function getEnvConfig(): EnvConfig {
  if (cached) return cached;

  const envName = normalizeEnvName(process.env.TEST_ENV);

  if (!didLog) {
    // Required log statement (exact format).
    // eslint-disable-next-line no-console
    console.log(`Running tests in ${envName} environment`);
    didLog = true;
  }

  cached = {
    portalUrl: getEnvVarWithOptionalFallback(envName, 'MLIS_PORTAL_URL'),
    salesforceUrl: getEnvVarWithOptionalFallback(envName, 'SALESFORCE_LIGHTNING_URL'),
    brokerUsername: getBrokerUsernameWithAlias(envName),
    brokerPassword: getBrokerPasswordWithAlias(envName),
    salesforceUsername: getSalesforceUsernameWithAlias(envName),
    salesforcePassword: getSalesforcePasswordWithAlias(envName),
  };

  return cached;
}
