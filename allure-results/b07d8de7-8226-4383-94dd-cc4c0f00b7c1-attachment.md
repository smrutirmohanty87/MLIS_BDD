# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: tests\BDD\features\regression\tc_reg_011_open_notes_attachments_salesforce_ew_policy.spec.feature.spec.js >> Open Notes & Attachments in Salesforce (England & Wales policy) >> Execute legacy regression test for TC_REG_011
- Location: tests\BDD\.features-gen\tests\BDD\features\regression\tc_reg_011_open_notes_attachments_salesforce_ew_policy.spec.feature.spec.js:6:7

# Error details

```
Error: Original regression test TC_REG_011 failed when executed via BDD wrapper.

Error: No tests found.
Make sure that arguments are regular expressions matching test files.
You may need to escape symbols like "$" or "*" and quote the arguments.

[dashboard] Written: reports\dashboard\index.html
[dashboard] Opening: file:///C:/Users/smruti.r.a.mohanty/MLIS_BDD/MLIS_BDD/reports/dashboard/index.html
[dashboard] Opened via PowerShell Start-Process
[historical] Written: reports\historical\index.html

expect(received).toBeTruthy()

Received: false
```

# Test source

```ts
  1  | import { createBdd, test } from 'playwright-bdd';
  2  | import { expect } from '@playwright/test';
  3  | import path from 'path';
  4  | import { spawnSync } from 'child_process';
  5  | import { readdirSync } from 'fs';
  6  | 
  7  | const { Given, Then } = createBdd(test);
  8  | 
  9  | const regressionDir = path.resolve(__dirname, '../../../regression');
  10 | const regressionSpecById = new Map<string, string>();
  11 | const executionStatusById = new Map<string, { ok: boolean; output: string }>();
  12 | 
  13 | for (const fileName of readdirSync(regressionDir)) {
  14 |   const idMatch = fileName.match(/(TC_REG_\d{3})/i);
  15 |   if (!idMatch || !fileName.endsWith('.spec.ts')) continue;
  16 |   regressionSpecById.set(idMatch[1].toUpperCase(), path.join(regressionDir, fileName));
  17 | }
  18 | 
  19 | Given('I execute regression test case {string} from original suite', async ({}, tcId: string) => {
  20 |   const normalizedId = tcId.toUpperCase();
  21 |   const specPath = regressionSpecById.get(normalizedId);
  22 | 
  23 |   expect(specPath, `No original regression spec was found for ${normalizedId}`).toBeTruthy();
  24 |   if (!specPath) return;
  25 | 
  26 |   const result = spawnSync(
  27 |     'npx',
  28 |     ['playwright', 'test', specPath, '-c', 'playwright.config.ts', '--workers=1'],
  29 |     {
  30 |       cwd: path.resolve(__dirname, '../../../../'),
  31 |       shell: true,
  32 |       env: {
  33 |         ...process.env,
  34 |         PW_BDD_WRAPPER: '1',
  35 |       },
  36 |       encoding: 'utf-8',
  37 |     },
  38 |   );
  39 | 
  40 |   const output = [result.stdout ?? '', result.stderr ?? ''].join('\n').trim();
  41 |   executionStatusById.set(normalizedId, {
  42 |     ok: result.status === 0,
  43 |     output,
  44 |   });
  45 | });
  46 | 
  47 | Then('the regression test case {string} should complete successfully', async ({}, tcId: string) => {
  48 |   const normalizedId = tcId.toUpperCase();
  49 |   const result = executionStatusById.get(normalizedId);
  50 | 
  51 |   expect(result, `No execution result captured for ${normalizedId}`).toBeTruthy();
  52 |   expect(
  53 |     result?.ok,
  54 |     `Original regression test ${normalizedId} failed when executed via BDD wrapper.\n\n${result?.output ?? ''}`,
> 55 |   ).toBeTruthy();
     |     ^ Error: Original regression test TC_REG_011 failed when executed via BDD wrapper.
  56 | });
  57 | 
```