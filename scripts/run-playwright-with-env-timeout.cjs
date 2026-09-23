const { spawnSync } = require('child_process');

const cliArgs = process.argv.slice(2);
const envName = (process.env.TEST_ENV || '').trim().toUpperCase();

const hasTimeoutArg = cliArgs.some((arg, index) => {
  if (arg.startsWith('--timeout=')) {
    return true;
  }

  if (arg === '--timeout') {
    return index < cliArgs.length - 1;
  }

  return false;
});

if (envName === 'CLAIMSQA' && !hasTimeoutArg) {
  cliArgs.push('--timeout=1800000');
  console.log('[runner] TEST_ENV=claimsqa detected. Applying Playwright timeout: 1800000ms');
}

const result = spawnSync('npx', ['playwright', ...cliArgs], {
  stdio: 'inherit',
  shell: true,
  env: process.env,
});

if (typeof result.status === 'number') {
  process.exit(result.status);
}

process.exit(1);
