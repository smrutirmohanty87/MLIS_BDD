const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '..', '.env') });

function normalizeEnvName(value) {
  const env = String(value || '').trim().toUpperCase();
  if (!env) return 'SIT1';
  if (env === 'SIT') return 'SIT1';
  return env;
}

function firstNonEmpty(varNames) {
  for (const varName of varNames) {
    const value = String(process.env[varName] || '').trim();
    if (value) {
      return { varName, value };
    }
  }
  return null;
}

function getJwtVarCandidates(envName, suffix) {
  const aliases = envName === 'SIT1' ? ['SIT1', 'SIT'] : [envName];
  const candidates = [];

  for (const alias of aliases) {
    candidates.push(`SALEFORCE_${alias}_${suffix}`);
    candidates.push(`SALESFORCE_${alias}_${suffix}`);
  }

  return candidates;
}

function getBaseVarsForEnv(envName) {
  const isUnprefixedEnv = envName === 'UAT2';
  const prefix = isUnprefixedEnv ? '' : `${envName}_`;

  return {
    portalUrl: `${prefix}MLIS_PORTAL_URL`,
    sfUrl: `${prefix}SALESFORCE_LIGHTNING_URL`,
    brokerUsername: `${prefix}BROKER_USERNAME`,
    brokerPassword: `${prefix}BROKER_PASSWORD`,
    sfUsername: `${prefix}SALESFORCE_USERNAME`,
    sfPassword: `${prefix}SALESFORCE_PASSWORD`,
  };
}

function parseArgs() {
  const envsArg = process.argv.find((arg) => arg.startsWith('--envs='));
  const strictArg = process.argv.find((arg) => arg.startsWith('--strict='));

  const strict = strictArg ? !/^false$/i.test(strictArg.split('=')[1] || 'true') : true;

  if (!envsArg) {
    return {
      envs: [normalizeEnvName(process.env.TEST_ENV)],
      strict,
    };
  }

  const envs = envsArg
    .slice('--envs='.length)
    .split(',')
    .map((v) => normalizeEnvName(v))
    .filter(Boolean);

  return {
    envs: envs.length ? envs : [normalizeEnvName(process.env.TEST_ENV)],
    strict,
  };
}

function validateEnv(envName) {
  const errors = [];
  const warnings = [];
  const info = [];
  const baseVars = getBaseVarsForEnv(envName);

  for (const [label, varName] of Object.entries(baseVars)) {
    const resolved = firstNonEmpty([varName]);
    if (!resolved) {
      errors.push(`[missing] ${envName} ${label}: ${varName}`);
    } else {
      info.push(`[ok] ${envName} ${label}: ${resolved.varName}`);
    }
  }

  const enhancedUser = firstNonEmpty([
    `SALEFORCE_${envName}_ENHANCEDUSER`,
    `SALESFORCE_${envName}_ENHANCEDUSER`,
    baseVars.sfUsername,
  ]);
  const enhancedPassword = firstNonEmpty([
    `SALEFORCE_${envName}_ENHANCEDUSER_PASSWORD`,
    `SALESFORCE_${envName}_ENHANCEDUSER_PASSWORD`,
    baseVars.sfPassword,
  ]);

  if (!enhancedUser) {
    errors.push(`[missing] ${envName} enhanced user: SALEFORCE_${envName}_ENHANCEDUSER or SALESFORCE_${envName}_ENHANCEDUSER`);
  } else {
    info.push(`[ok] ${envName} enhanced user: ${enhancedUser.varName}`);
  }

  if (!enhancedPassword) {
    errors.push(`[missing] ${envName} enhanced user password: SALEFORCE_${envName}_ENHANCEDUSER_PASSWORD or SALESFORCE_${envName}_ENHANCEDUSER_PASSWORD`);
  } else {
    info.push(`[ok] ${envName} enhanced user password: ${enhancedPassword.varName}`);
  }

  const claimsUser = firstNonEmpty([
    `SALEFORCE_${envName}_CLAIMUSER`,
    `SALESFORCE_${envName}_CLAIMUSER`,
  ]);
  const claimsPassword = firstNonEmpty([
    `SALEFORCE_${envName}_CLAIMUSER_PASSWORD`,
    `SALESFORCE_${envName}_CLAIMUSER_PASSWORD`,
  ]);

  if (!claimsUser) {
    warnings.push(`[warn] ${envName} claims user not set: SALEFORCE_${envName}_CLAIMUSER or SALESFORCE_${envName}_CLAIMUSER`);
  } else {
    info.push(`[ok] ${envName} claims user: ${claimsUser.varName}`);
  }

  if (claimsUser && !claimsPassword) {
    errors.push(`[missing] ${envName} claims user password: SALEFORCE_${envName}_CLAIMUSER_PASSWORD or SALESFORCE_${envName}_CLAIMUSER_PASSWORD`);
  } else if (claimsPassword) {
    info.push(`[ok] ${envName} claims user password: ${claimsPassword.varName}`);
  }

  const jwtClientId = firstNonEmpty(getJwtVarCandidates(envName, 'JWT_CLIENT_ID'));
  const jwtPrivateKeyPath = firstNonEmpty(getJwtVarCandidates(envName, 'JWT_PRIVATE_KEY_PATH'));
  const jwtPrivateKey = firstNonEmpty(getJwtVarCandidates(envName, 'JWT_PRIVATE_KEY'));
  const jwtUsername = firstNonEmpty(getJwtVarCandidates(envName, 'JWT_USERNAME'));

  if (!jwtClientId) {
    errors.push(`[missing] ${envName} JWT client id: ${getJwtVarCandidates(envName, 'JWT_CLIENT_ID').join(' or ')}`);
  } else {
    info.push(`[ok] ${envName} JWT client id: ${jwtClientId.varName}`);
  }

  if (!jwtPrivateKeyPath && !jwtPrivateKey) {
    errors.push(`[missing] ${envName} JWT private key: one of ${getJwtVarCandidates(envName, 'JWT_PRIVATE_KEY_PATH').join(', ')} or ${getJwtVarCandidates(envName, 'JWT_PRIVATE_KEY').join(', ')}`);
  } else if (jwtPrivateKeyPath) {
    const keyFile = path.resolve(jwtPrivateKeyPath.value.replace(/^"|"$/g, ''));
    if (!fs.existsSync(keyFile)) {
      errors.push(`[missing] ${envName} JWT private key file not found: ${jwtPrivateKeyPath.varName} -> ${keyFile}`);
    } else {
      info.push(`[ok] ${envName} JWT private key path: ${jwtPrivateKeyPath.varName}`);
    }
  } else {
    info.push(`[ok] ${envName} JWT private key inline: ${jwtPrivateKey.varName}`);
  }

  if (!jwtUsername) {
    warnings.push(`[warn] ${envName} JWT username is not set. Fallback is the username passed to login() in tests.`);
  } else {
    info.push(`[ok] ${envName} JWT username: ${jwtUsername.varName}`);
  }

  return { envName, errors, warnings, info };
}

function main() {
  const { envs, strict } = parseArgs();
  const allResults = envs.map(validateEnv);

  console.log(`[env-check] validating env mapping for: ${envs.join(', ')}`);

  for (const result of allResults) {
    console.log(`\n[env-check] ${result.envName}`);
    for (const line of result.info) console.log(`  ${line}`);
    for (const line of result.warnings) console.log(`  ${line}`);
    for (const line of result.errors) console.log(`  ${line}`);
  }

  const errorCount = allResults.reduce((sum, r) => sum + r.errors.length, 0);
  const warningCount = allResults.reduce((sum, r) => sum + r.warnings.length, 0);

  console.log(`\n[env-check] summary: errors=${errorCount}, warnings=${warningCount}`);

  if (strict && errorCount > 0) {
    process.exit(1);
  }
}

main();