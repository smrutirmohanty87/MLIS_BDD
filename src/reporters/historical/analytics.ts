import type { HistoricalFilter, HistoricalMetrics, HistoricalRunSummary, HistoricalTestEntry } from './types';

function asDate(value: string): Date | null {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed;
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function suiteRank(suite: string): number {
  const normalized = suite.toLowerCase();
  if (normalized === 'sanity') return 1;
  if (normalized === 'regression') return 2;
  if (normalized === 'claims') return 3;
  if (normalized === 'bdx') return 4;
  if (normalized === 'mixed') return 5;
  return 9;
}

export function buildMetrics(runs: HistoricalRunSummary[]): HistoricalMetrics {
  const totalRuns = runs.length;
  const totalTestsExecuted = runs.reduce((sum, run) => sum + run.totalTests, 0);
  const totalPassed = runs.reduce((sum, run) => sum + run.passed, 0);
  const totalFailed = runs.reduce((sum, run) => sum + run.failed, 0);
  const totalExecutionDurationSeconds = runs.reduce((sum, run) => sum + run.durationSeconds, 0);

  const averagePassRate = totalRuns > 0
    ? round2(runs.reduce((sum, run) => sum + run.passRate, 0) / totalRuns)
    : 0;

  const averageExecutionDurationSeconds = totalRuns > 0
    ? round2(totalExecutionDurationSeconds / totalRuns)
    : 0;

  return {
    generatedAt: new Date().toISOString(),
    totalRuns,
    totalTestsExecuted,
    totalPassed,
    totalFailed,
    averagePassRate,
    averageExecutionDurationSeconds,
    totalExecutionDurationSeconds,
  };
}

export function applyRunFilters(runs: HistoricalRunSummary[], filter: HistoricalFilter): HistoricalRunSummary[] {
  return runs.filter((run) => {
    if (filter.environment && filter.environment !== 'ALL' && run.environment !== filter.environment) return false;
    if (filter.suite && filter.suite !== 'ALL' && run.suite !== filter.suite) return false;
    if (filter.project && filter.project !== 'ALL' && run.project !== filter.project) return false;
    if (filter.status && filter.status !== 'ALL' && run.status !== filter.status) return false;

    const runDate = asDate(run.timestamp);
    if (!runDate) return false;

    if (filter.fromDate) {
      const from = asDate(filter.fromDate);
      if (from && runDate < from) return false;
    }

    if (filter.toDate) {
      const to = asDate(filter.toDate);
      if (to && runDate > to) return false;
    }

    return true;
  });
}

export function buildStabilityTable(tests: HistoricalTestEntry[]) {
  const map = new Map<string, { testName: string; testId: string; suite: string; runs: number; passed: number; failed: number }>();

  for (const t of tests) {
    const key = `${t.testId}::${t.suite}`;
    const existing = map.get(key) ?? {
      testName: t.testName,
      testId: t.testId,
      suite: t.suite,
      runs: 0,
      passed: 0,
      failed: 0,
    };

    existing.runs += 1;
    if (t.status === 'passed') existing.passed += 1;
    if (t.status === 'failed' || t.status === 'timedOut' || t.status === 'interrupted') existing.failed += 1;

    map.set(key, existing);
  }

  return Array.from(map.values())
    .map((row) => ({
      ...row,
      passRate: row.runs > 0 ? round2((row.passed / row.runs) * 100) : 0,
    }))
    .sort((a, b) => {
      if (a.passRate !== b.passRate) return a.passRate - b.passRate;
      if (a.runs !== b.runs) return b.runs - a.runs;
      return a.testId.localeCompare(b.testId);
    });
}
