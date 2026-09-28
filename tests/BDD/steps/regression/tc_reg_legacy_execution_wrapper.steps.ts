import { createBdd, test } from 'playwright-bdd';
import { expect } from '@playwright/test';
import path from 'path';
import { spawnSync } from 'child_process';
import { readdirSync } from 'fs';

const { Given, Then } = createBdd(test);

const regressionDir = path.resolve(__dirname, '../../../regression');
const regressionSpecById = new Map<string, string>();
const executionStatusById = new Map<string, { ok: boolean; output: string }>();

for (const fileName of readdirSync(regressionDir)) {
  const idMatch = fileName.match(/(TC_REG_\d{3})/i);
  if (!idMatch || !fileName.endsWith('.spec.ts')) continue;
  regressionSpecById.set(idMatch[1].toUpperCase(), path.join(regressionDir, fileName));
}

Given('I execute regression test case {string} from original suite', async ({}, tcId: string) => {
  const normalizedId = tcId.toUpperCase();
  const specPath = regressionSpecById.get(normalizedId);

  expect(specPath, `No original regression spec was found for ${normalizedId}`).toBeTruthy();
  if (!specPath) return;

  const result = spawnSync(
    'npx',
    ['playwright', 'test', specPath, '-c', 'playwright.config.ts', '--workers=1'],
    {
      cwd: path.resolve(__dirname, '../../../../'),
      shell: true,
      env: {
        ...process.env,
        PW_BDD_WRAPPER: '1',
      },
      encoding: 'utf-8',
    },
  );

  const output = [result.stdout ?? '', result.stderr ?? ''].join('\n').trim();
  executionStatusById.set(normalizedId, {
    ok: result.status === 0,
    output,
  });
});

Then('the regression test case {string} should complete successfully', async ({}, tcId: string) => {
  const normalizedId = tcId.toUpperCase();
  const result = executionStatusById.get(normalizedId);

  expect(result, `No execution result captured for ${normalizedId}`).toBeTruthy();
  expect(
    result?.ok,
    `Original regression test ${normalizedId} failed when executed via BDD wrapper.\n\n${result?.output ?? ''}`,
  ).toBeTruthy();
});
