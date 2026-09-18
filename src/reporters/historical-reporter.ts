import type { FullConfig, FullResult, Reporter, Suite, TestCase, TestResult } from '@playwright/test/reporter';
import fs from 'fs';
import path from 'path';
import { buildHistoricalHtml } from './historical/html';
import {
  createUniqueRunId,
  ensureDir,
  loadHistoricalData,
  syncFromDashboardRuns,
  tryPersistHistoricalRun,
} from './historical/store';
import type { HistoricalRunInput } from './historical/types';

type HistoricalReporterOptions = {
  outputDir?: string;
};

type TestCapture = {
  testName: string;
  fullTitle: string;
  file: string;
  project: string;
  status: 'passed' | 'failed' | 'skipped' | 'timedOut' | 'interrupted';
  durationSeconds: number;
};

function normalizeEnvName(value: string | undefined): string {
  const env = (value ?? '').trim().toUpperCase();
  return env || 'SIT1';
}

function runStatusFrom(result: FullResult['status']): 'passed' | 'failed' | 'timedout' | 'interrupted' {
  if (result === 'passed') return 'passed';
  if (result === 'failed') return 'failed';
  if (result === 'timedout') return 'timedout';
  return 'interrupted';
}

class HistoricalReporter implements Reporter {
  private readonly outputDir: string;

  private runStartedAt = new Date();
  private runId = '';
  private runEnvironment = 'SIT1';
  private captures: TestCapture[] = [];

  constructor(options: HistoricalReporterOptions = {}) {
    this.outputDir = options.outputDir ?? path.resolve(process.cwd(), 'reports', 'historical');
  }

  onBegin(config: FullConfig, suite: Suite): void {
    this.runStartedAt = new Date();
    this.runEnvironment = normalizeEnvName(process.env.TEST_ENV);
    this.captures = [];

    const existing = loadHistoricalData(this.outputDir);
    const runIds = new Set(existing.runs.map((r) => r.runId));
    this.runId = createUniqueRunId(runIds, this.runStartedAt);
  }

  onTestEnd(test: TestCase, result: TestResult): void {
    const titlePath = test.titlePath().filter(Boolean);
    const projectName = String(titlePath[0] ?? 'unknown');
    const file = path.relative(process.cwd(), test.location.file).replace(/\\/g, '/');

    this.captures.push({
      testName: test.title,
      fullTitle: titlePath.join(' › '),
      file,
      project: projectName,
      status: result.status,
      durationSeconds: Math.round((result.duration / 1000) * 100) / 100,
    });
  }

  async onEnd(result: FullResult): Promise<void> {
    const runEndedAt = new Date();
    const durationSeconds = Math.max(0, (runEndedAt.getTime() - this.runStartedAt.getTime()) / 1000);

    const input: HistoricalRunInput = {
      runId: this.runId,
      timestamp: this.runStartedAt.toISOString(),
      environment: this.runEnvironment,
      status: runStatusFrom(result.status),
      durationSeconds,
      tests: this.captures,
    };

    try {
      const persisted = tryPersistHistoricalRun(this.outputDir, input);
      if (!persisted.ok) {
        console.warn(`[historical] Persistence failed: ${persisted.error.message}`);
        return;
      }

      const dashboardRunsDir = path.resolve(process.cwd(), 'reports', 'dashboard', 'runs');
      const merged = syncFromDashboardRuns(this.outputDir, dashboardRunsDir);

      const html = buildHistoricalHtml({
        runs: merged.runs,
        tests: merged.tests,
        metrics: merged.metrics,
      });

      ensureDir(this.outputDir);
      const htmlPath = path.join(this.outputDir, 'index.html');
      fs.writeFileSync(htmlPath, html, 'utf-8');

      console.log(`[historical] Written: ${htmlPath}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.warn(`[historical] Collector error (ignored): ${message}`);
    }
  }
}

export default HistoricalReporter;
