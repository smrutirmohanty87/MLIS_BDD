export type HistoricalStatus = 'passed' | 'failed' | 'skipped' | 'timedOut' | 'interrupted';

export type HistoricalRunSummary = {
  runId: string;
  timestamp: string;
  environment: string;
  project: string;
  suite: string;
  status: 'passed' | 'failed' | 'timedout' | 'interrupted';
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  timedOut: number;
  interrupted: number;
  passRate: number;
  durationSeconds: number;
};

export type HistoricalTestEntry = {
  runId: string;
  timestamp: string;
  testId: string;
  testName: string;
  status: HistoricalStatus;
  durationSeconds: number;
  environment: string;
  suite: string;
  project: string;
  file: string;
};

export type HistoricalMetrics = {
  generatedAt: string;
  totalRuns: number;
  totalTestsExecuted: number;
  totalPassed: number;
  totalFailed: number;
  averagePassRate: number;
  averageExecutionDurationSeconds: number;
  totalExecutionDurationSeconds: number;
};

export type HistoricalRunInput = {
  runId: string;
  timestamp: string;
  environment: string;
  status: 'passed' | 'failed' | 'timedout' | 'interrupted';
  durationSeconds: number;
  tests: Array<{
    testName: string;
    fullTitle: string;
    file: string;
    project: string;
    status: HistoricalStatus;
    durationSeconds: number;
  }>;
};

export type HistoricalFilter = {
  fromDate?: string;
  toDate?: string;
  environment?: string;
  suite?: string;
  project?: string;
  status?: string;
};
