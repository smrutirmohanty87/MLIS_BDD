import { expect, test } from '@playwright/test';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { applyRunFilters, buildMetrics, buildStabilityTable } from '../../src/reporters/historical/analytics';
import { buildHistoricalHtml } from '../../src/reporters/historical/html';
import {
  createUniqueRunId,
  loadHistoricalData,
  persistHistoricalRun,
  syncFromDashboardRuns,
  tryPersistHistoricalRun,
} from '../../src/reporters/historical/store';
import type { HistoricalRunInput } from '../../src/reporters/historical/types';

function makeRunInput(runId: string, timestamp: string, status: 'passed' | 'failed' | 'timedout' | 'interrupted'): HistoricalRunInput {
  return {
    runId,
    timestamp,
    environment: 'UAT1',
    status,
    durationSeconds: 120,
    tests: [
      {
        testName: 'TC_SAN_001 | Create Commercial Policy',
        fullTitle: 'chrome › sanity/TC_SAN_001.spec.ts › @sanity | TC_SAN_001',
        file: 'tests/sanity/TC_SAN_001_create_commercial_ew_policy_multiple_products.spec.ts',
        project: 'chrome',
        status: 'passed',
        durationSeconds: 57,
      },
      {
        testName: 'TC_SAN_002 | Referral Policy',
        fullTitle: 'chrome › sanity/TC_SAN_002.spec.ts › @sanity | TC_SAN_002',
        file: 'tests/sanity/TC_SAN_002_create_commercial_ew_policy_multiple_products_via_referral.spec.ts',
        project: 'chrome',
        status: status === 'failed' ? 'failed' : 'passed',
        durationSeconds: 63,
      },
    ],
  };
}

test('createUniqueRunId avoids duplicates', async () => {
  const set = new Set<string>();
  const fixedDate = new Date('2026-09-18T14:52:00.123Z');
  const first = createUniqueRunId(set, fixedDate);
  set.add(first);
  const second = createUniqueRunId(set, fixedDate);

  expect(first).not.toEqual(second);
  expect(/^20260918_\d{6}_123(?:_\d{3})?$/.test(first)).toBeTruthy();
});

test('persistHistoricalRun appends runs without overwrite', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hist-store-'));

  persistHistoricalRun(tempDir, makeRunInput('20260918_145200', '2026-09-18T14:52:00.000Z', 'passed'));
  persistHistoricalRun(tempDir, makeRunInput('20260918_145300', '2026-09-18T14:53:00.000Z', 'failed'));

  const data = loadHistoricalData(tempDir);
  expect(data.runs.length).toBe(2);
  expect(data.tests.length).toBe(4);

  const run1 = data.runs.find((r) => r.runId === '20260918_145200');
  const run2 = data.runs.find((r) => r.runId === '20260918_145300');
  expect(run1?.passRate).toBe(100);
  expect(run2?.passRate).toBe(50);

  const archive1 = path.join(tempDir, 'archive', '2026-09-18', '20260918_145200.json');
  const archive2 = path.join(tempDir, 'archive', '2026-09-18', '20260918_145300.json');
  expect(fs.existsSync(archive1)).toBeTruthy();
  expect(fs.existsSync(archive2)).toBeTruthy();
});

test('analytics supports filtering and stability aggregation', async () => {
  const runs = [
    {
      runId: '1',
      timestamp: '2026-09-18T10:00:00.000Z',
      environment: 'UAT1',
      project: 'chrome',
      suite: 'Sanity',
      status: 'passed' as const,
      totalTests: 2,
      passed: 2,
      failed: 0,
      skipped: 0,
      timedOut: 0,
      interrupted: 0,
      passRate: 100,
      durationSeconds: 100,
    },
    {
      runId: '2',
      timestamp: '2026-09-18T12:00:00.000Z',
      environment: 'UAT1',
      project: 'chrome',
      suite: 'Sanity',
      status: 'failed' as const,
      totalTests: 2,
      passed: 1,
      failed: 1,
      skipped: 0,
      timedOut: 0,
      interrupted: 0,
      passRate: 50,
      durationSeconds: 120,
    },
  ];

  const filtered = applyRunFilters(runs, { environment: 'UAT1', status: 'failed' });
  expect(filtered.length).toBe(1);
  expect(filtered[0].runId).toBe('2');

  const metrics = buildMetrics(runs);
  expect(metrics.totalRuns).toBe(2);
  expect(metrics.averagePassRate).toBe(75);

  const stability = buildStabilityTable([
    {
      runId: '1',
      timestamp: '2026-09-18T10:00:00.000Z',
      testId: 'TC_SAN_001',
      testName: 'A',
      status: 'passed',
      durationSeconds: 55,
      environment: 'UAT1',
      suite: 'Sanity',
      project: 'chrome',
      file: 'tests/sanity/a.spec.ts',
    },
    {
      runId: '2',
      timestamp: '2026-09-18T12:00:00.000Z',
      testId: 'TC_SAN_001',
      testName: 'A',
      status: 'failed',
      durationSeconds: 60,
      environment: 'UAT1',
      suite: 'Sanity',
      project: 'chrome',
      file: 'tests/sanity/a.spec.ts',
    },
  ]);

  expect(stability.length).toBe(1);
  expect(stability[0].runs).toBe(2);
  expect(stability[0].passRate).toBe(50);
});

test('historical html renders no-data state text', async () => {
  const html = buildHistoricalHtml({
    runs: [],
    tests: [],
    metrics: {
      generatedAt: new Date().toISOString(),
      totalRuns: 0,
      totalTestsExecuted: 0,
      totalPassed: 0,
      totalFailed: 0,
      averagePassRate: 0,
      averageExecutionDurationSeconds: 0,
      totalExecutionDurationSeconds: 0,
    },
  });

  expect(html.includes('No historical data available')).toBeTruthy();
});

test('historical persistence failure is non-throwing', async () => {
  const result = tryPersistHistoricalRun('C:\\invalid\\path\\\u0000', makeRunInput('x', '2026-09-18T10:00:00.000Z', 'passed'));
  expect(result.ok).toBeFalsy();
});

test('syncFromDashboardRuns imports legacy environments and keeps append-only records', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hist-backfill-'));
  const historicalDir = path.join(root, 'historical');
  const dashboardRunsDir = path.join(root, 'dashboard', 'runs');
  fs.mkdirSync(dashboardRunsDir, { recursive: true });

  const legacyRun = {
    runId: '2026-09-17T15-21-13-001',
    createdAtIso: '2026-09-17T15:21:13.001Z',
    environment: 'SIT1',
    status: 'passed',
    totalDurationMs: 12345,
    projects: ['chrome'],
    tests: [
      {
        file: 'tests/sanity/TC_SAN_001_create_commercial_ew_policy_multiple_products.spec.ts',
        title: 'TC_SAN_001 | Create Commercial England & Wales policy (multiple products)',
        fullTitle: 'chrome › sanity › @sanity | E2E | Commercial | England & Wales › TC_SAN_001',
        project: 'chrome',
        status: 'passed',
        durationMs: 57000,
      },
    ],
  };

  fs.writeFileSync(
    path.join(dashboardRunsDir, 'run-2026-09-17T15-21-13-001.json'),
    JSON.stringify(legacyRun, null, 2),
    'utf-8',
  );

  const firstSync = syncFromDashboardRuns(historicalDir, dashboardRunsDir);
  expect(firstSync.runs.length).toBe(1);
  expect(firstSync.tests.length).toBe(1);
  expect(firstSync.runs[0].environment).toBe('SIT1');
  expect(firstSync.runs[0].suite).toBe('Sanity');

  const secondSync = syncFromDashboardRuns(historicalDir, dashboardRunsDir);
  expect(secondSync.runs.length).toBe(1);
  expect(secondSync.tests.length).toBe(1);
});
