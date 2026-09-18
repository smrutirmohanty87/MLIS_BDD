import fs from 'fs';
import path from 'path';
import { buildMetrics } from './analytics';
import type { HistoricalMetrics, HistoricalRunInput, HistoricalRunSummary, HistoricalTestEntry } from './types';

type DashboardRunTestEntry = {
  file?: string;
  title?: string;
  fullTitle?: string;
  project?: string;
  status?: 'passed' | 'failed' | 'skipped' | 'timedOut' | 'interrupted';
  durationMs?: number;
};

type DashboardRunData = {
  runId?: string;
  createdAtIso?: string;
  environment?: string;
  status?: 'passed' | 'failed' | 'timedout' | 'interrupted';
  totalDurationMs?: number;
  projects?: string[];
  summary?: {
    total?: number;
    passed?: number;
    failed?: number;
    skipped?: number;
    timedOut?: number;
    interrupted?: number;
  };
  tests?: DashboardRunTestEntry[];
};

function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

function pad3(value: number): string {
  return String(value).padStart(3, '0');
}

export function ensureDir(dirPath: string): void {
  fs.mkdirSync(dirPath, { recursive: true });
}

function readJsonArray<T>(filePath: string): T[] {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, 'utf-8');
  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? (parsed as T[]) : [];
}

function safeJsonParse<T>(filePath: string): T | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function writeJsonFile(filePath: string, value: unknown): void {
  fs.writeFileSync(filePath, JSON.stringify(value, null, 2), 'utf-8');
}

export function createRunId(date: Date = new Date()): string {
  const yyyy = date.getFullYear();
  const mm = pad2(date.getMonth() + 1);
  const dd = pad2(date.getDate());
  const hh = pad2(date.getHours());
  const mi = pad2(date.getMinutes());
  const ss = pad2(date.getSeconds());
  const ms = pad3(date.getMilliseconds());
  return `${yyyy}${mm}${dd}_${hh}${mi}${ss}_${ms}`;
}

export function createUniqueRunId(existingRunIds: Set<string>, date: Date = new Date()): string {
  const base = createRunId(date);
  if (!existingRunIds.has(base)) return base;

  let suffix = 1;
  while (suffix < 1000) {
    const candidate = `${base}_${String(suffix).padStart(3, '0')}`;
    if (!existingRunIds.has(candidate)) return candidate;
    suffix += 1;
  }

  return `${base}_${Math.floor(Math.random() * 100000)}`;
}

export function extractSuite(file: string, fullTitle: string): string {
  const normalizedFile = file.replace(/\\/g, '/').toLowerCase();
  const title = fullTitle.toLowerCase();

  if (normalizedFile.includes('/sanity/') || title.includes('@sanity')) return 'Sanity';
  if (normalizedFile.includes('/regression/') || title.includes('@regression')) return 'Regression';
  if (normalizedFile.includes('/claims/') || title.includes('@claims')) return 'Claims';
  if (normalizedFile.includes('/bdx/') || title.includes('| bdx |')) return 'BDX';
  return 'Other';
}

export function extractTestId(file: string, testName: string, fullTitle: string): string {
  const combined = `${fullTitle} ${testName} ${path.basename(file)}`;
  const directMatch = combined.match(/(TC_[A-Z]+_[0-9]{3})/i);
  if (directMatch?.[1]) return directMatch[1].toUpperCase();

  const numMatch = combined.match(/\b([0-9]{2,3})\b/);
  if (numMatch?.[1]) return `TC_${numMatch[1]}`;

  return path.basename(file).replace(/\.spec\.ts$/i, '').slice(0, 80);
}

export function derivePrimarySuite(testEntries: HistoricalTestEntry[]): string {
  if (testEntries.length === 0) return 'Mixed';

  const counts = new Map<string, number>();
  for (const entry of testEntries) {
    counts.set(entry.suite, (counts.get(entry.suite) ?? 0) + 1);
  }

  if (counts.size === 1) {
    return testEntries[0].suite;
  }

  let winner = 'Mixed';
  let maxCount = 0;
  for (const [suite, count] of counts.entries()) {
    if (count > maxCount) {
      winner = suite;
      maxCount = count;
    }
  }

  return winner;
}

export function toHistoricalRecords(input: HistoricalRunInput): {
  run: HistoricalRunSummary;
  tests: HistoricalTestEntry[];
} {
  const tests: HistoricalTestEntry[] = input.tests.map((test) => {
    const suite = extractSuite(test.file, test.fullTitle);
    return {
      runId: input.runId,
      timestamp: input.timestamp,
      testId: extractTestId(test.file, test.testName, test.fullTitle),
      testName: test.testName,
      status: test.status,
      durationSeconds: Math.round(test.durationSeconds * 100) / 100,
      environment: input.environment,
      suite,
      project: test.project,
      file: test.file,
    };
  });

  const totalTests = tests.length;
  const passed = tests.filter((t) => t.status === 'passed').length;
  const failed = tests.filter((t) => t.status === 'failed').length;
  const skipped = tests.filter((t) => t.status === 'skipped').length;
  const timedOut = tests.filter((t) => t.status === 'timedOut').length;
  const interrupted = tests.filter((t) => t.status === 'interrupted').length;

  const passRate = totalTests > 0 ? Math.round((passed / totalTests) * 10000) / 100 : 0;
  const suite = derivePrimarySuite(tests);

  const uniqueProjects = new Set(tests.map((t) => t.project).filter(Boolean));
  const project = uniqueProjects.size === 1 ? Array.from(uniqueProjects)[0] : 'multiple';

  const run: HistoricalRunSummary = {
    runId: input.runId,
    timestamp: input.timestamp,
    environment: input.environment,
    project,
    suite,
    status: input.status,
    totalTests,
    passed,
    failed,
    skipped,
    timedOut,
    interrupted,
    passRate,
    durationSeconds: Math.round(input.durationSeconds * 100) / 100,
  };

  return { run, tests };
}

export type HistoricalStoreData = {
  runs: HistoricalRunSummary[];
  tests: HistoricalTestEntry[];
  metrics: HistoricalMetrics;
};

function normalizeRunStatus(value: string | undefined): 'passed' | 'failed' | 'timedout' | 'interrupted' {
  if (value === 'passed') return 'passed';
  if (value === 'failed') return 'failed';
  if (value === 'timedout') return 'timedout';
  return 'interrupted';
}

function toRunDateFolder(timestamp: string): string {
  const parsed = new Date(timestamp);
  if (Number.isNaN(parsed.getTime())) return 'unknown-date';
  return parsed.toISOString().slice(0, 10);
}

function runFingerprint(run: HistoricalRunSummary): string {
  return [
    run.timestamp,
    run.environment,
    run.status,
    String(run.totalTests),
    String(run.passed),
    String(run.failed),
  ].join('|');
}

function toHistoricalFromDashboard(source: DashboardRunData): { run: HistoricalRunSummary; tests: HistoricalTestEntry[] } | null {
  const runId = (source.runId ?? '').trim();
  const timestamp = (source.createdAtIso ?? '').trim();
  if (!runId || !timestamp) return null;

  const rawTests = Array.isArray(source.tests) ? source.tests : [];
  const tests: HistoricalTestEntry[] = rawTests.map((test) => {
    const file = String(test.file ?? '');
    const fullTitle = String(test.fullTitle ?? test.title ?? '');
    const testName = String(test.title ?? 'Unknown Test');
    const suite = extractSuite(file, fullTitle);
    const status = test.status ?? 'interrupted';

    return {
      runId,
      timestamp,
      testId: extractTestId(file, testName, fullTitle),
      testName,
      status,
      durationSeconds: Math.round(((test.durationMs ?? 0) / 1000) * 100) / 100,
      environment: String(source.environment ?? 'UNKNOWN').toUpperCase(),
      suite,
      project: String(test.project ?? 'unknown'),
      file,
    };
  });

  const totalTests = tests.length;
  const passed = tests.filter((t) => t.status === 'passed').length;
  const failed = tests.filter((t) => t.status === 'failed').length;
  const skipped = tests.filter((t) => t.status === 'skipped').length;
  const timedOut = tests.filter((t) => t.status === 'timedOut').length;
  const interrupted = tests.filter((t) => t.status === 'interrupted').length;

  const suite = derivePrimarySuite(tests);
  const projects = Array.isArray(source.projects) ? source.projects.filter(Boolean) : [];
  const project = projects.length === 1 ? projects[0] : projects.length > 1 ? 'multiple' : 'unknown';

  const run: HistoricalRunSummary = {
    runId,
    timestamp,
    environment: String(source.environment ?? 'UNKNOWN').toUpperCase(),
    project,
    suite,
    status: normalizeRunStatus(source.status),
    totalTests,
    passed,
    failed,
    skipped,
    timedOut,
    interrupted,
    passRate: totalTests > 0 ? Math.round((passed / totalTests) * 10000) / 100 : 0,
    durationSeconds: Math.round((((source.totalDurationMs ?? 0) / 1000) * 100)) / 100,
  };

  return { run, tests };
}

export function loadHistoricalData(baseDir: string): HistoricalStoreData {
  const runsPath = path.join(baseDir, 'runs.json');
  const testsPath = path.join(baseDir, 'test-history.json');

  const runs = readJsonArray<HistoricalRunSummary>(runsPath);
  const tests = readJsonArray<HistoricalTestEntry>(testsPath);
  const metrics = buildMetrics(runs);

  return { runs, tests, metrics };
}

export function syncFromDashboardRuns(baseDir: string, dashboardRunsDir: string): HistoricalStoreData {
  ensureDir(baseDir);

  const runsPath = path.join(baseDir, 'runs.json');
  const testsPath = path.join(baseDir, 'test-history.json');
  const metricsPath = path.join(baseDir, 'metrics.json');

  const existingRuns = readJsonArray<HistoricalRunSummary>(runsPath);
  const existingTests = readJsonArray<HistoricalTestEntry>(testsPath);
  const existingRunIds = new Set(existingRuns.map((run) => run.runId));
  const existingFingerprints = new Set(existingRuns.map((run) => runFingerprint(run)));

  const importedRuns: HistoricalRunSummary[] = [];
  const importedTests: HistoricalTestEntry[] = [];

  if (fs.existsSync(dashboardRunsDir)) {
    const files = fs
      .readdirSync(dashboardRunsDir)
      .filter((name) => name.endsWith('.json'))
      .sort();

    for (const fileName of files) {
      const filePath = path.join(dashboardRunsDir, fileName);
      const raw = safeJsonParse<DashboardRunData>(filePath);
      if (!raw) continue;

      const converted = toHistoricalFromDashboard(raw);
      if (!converted) continue;
      if (existingRunIds.has(converted.run.runId)) continue;
      if (existingFingerprints.has(runFingerprint(converted.run))) continue;

      existingRunIds.add(converted.run.runId);
      existingFingerprints.add(runFingerprint(converted.run));
      importedRuns.push(converted.run);
      importedTests.push(...converted.tests);

      const dayFolder = toRunDateFolder(converted.run.timestamp);
      const archiveDir = path.join(baseDir, 'archive', dayFolder);
      ensureDir(archiveDir);
      writeJsonFile(path.join(archiveDir, `${converted.run.runId}.json`), converted);
    }
  }

  const runs = importedRuns.length > 0 ? [...existingRuns, ...importedRuns] : existingRuns;
  const tests = importedTests.length > 0 ? [...existingTests, ...importedTests] : existingTests;
  const metrics = buildMetrics(runs);

  if (importedRuns.length > 0) {
    writeJsonFile(runsPath, runs);
    writeJsonFile(testsPath, tests);
    writeJsonFile(metricsPath, metrics);
  } else if (!fs.existsSync(metricsPath)) {
    writeJsonFile(metricsPath, metrics);
  }

  return { runs, tests, metrics };
}

export function persistHistoricalRun(baseDir: string, input: HistoricalRunInput): HistoricalStoreData {
  ensureDir(baseDir);

  const runsPath = path.join(baseDir, 'runs.json');
  const testsPath = path.join(baseDir, 'test-history.json');
  const metricsPath = path.join(baseDir, 'metrics.json');

  const existingRuns = readJsonArray<HistoricalRunSummary>(runsPath);
  const existingTests = readJsonArray<HistoricalTestEntry>(testsPath);

  const { run, tests } = toHistoricalRecords(input);

  const runs = [...existingRuns, run];
  const allTests = [...existingTests, ...tests];

  writeJsonFile(runsPath, runs);
  writeJsonFile(testsPath, allTests);

  const metrics = buildMetrics(runs);
  writeJsonFile(metricsPath, metrics);

  const dayFolder = input.timestamp.slice(0, 10);
  const archiveDir = path.join(baseDir, 'archive', dayFolder);
  ensureDir(archiveDir);
  writeJsonFile(path.join(archiveDir, `${run.runId}.json`), { run, tests });

  return { runs, tests: allTests, metrics };
}

export function tryPersistHistoricalRun(baseDir: string, input: HistoricalRunInput): { ok: true; data: HistoricalStoreData } | { ok: false; error: Error } {
  try {
    return { ok: true, data: persistHistoricalRun(baseDir, input) };
  } catch (error) {
    const normalized = error instanceof Error ? error : new Error(String(error));
    return { ok: false, error: normalized };
  }
}
