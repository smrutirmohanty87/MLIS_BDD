# Historical Test Analytics

## Purpose

This feature adds an additive, independent historical analytics capability on top of the existing dashboard and reports.

- Existing dashboard remains available at `reports/dashboard/index.html`.
- Historical analytics is available at `reports/historical/index.html`.
- Existing reporter, Playwright HTML report, screenshots, traces, and test execution behavior are preserved.

## Data Location

Historical data is written under:

- `reports/historical/runs.json`
- `reports/historical/test-history.json`
- `reports/historical/metrics.json`
- `reports/historical/archive/YYYY-MM-DD/<runId>.json`

## Data Schema

### Run summary (`runs.json`)

Each element contains:

- `runId`
- `timestamp`
- `environment`
- `project`
- `suite`
- `status`
- `totalTests`
- `passed`
- `failed`
- `skipped`
- `timedOut`
- `interrupted`
- `passRate`
- `durationSeconds`

### Test history (`test-history.json`)

Each element contains:

- `runId`
- `timestamp`
- `testId`
- `testName`
- `status`
- `durationSeconds`
- `environment`
- `suite`
- `project`
- `file`

## Persistence Flow

1. Playwright run completes.
2. Existing dashboard reporter writes current dashboard output as before.
3. New historical reporter appends run/test records.
4. Metrics are recalculated.
5. Historical analytics page is regenerated.

If historical persistence fails, the failure is logged and ignored so test execution/reporting still completes.

## Historical Dashboard

Open:

- `reports/historical/index.html`

Features:

- Historical summary cards
- Pass rate trend
- Execution duration trend
- Pass/fail trend
- Environment, suite, project, status, and date filters
- Run history table
- Test stability table

When no data exists, UI shows: `No historical data available`.

## Extending Metrics

To add metrics:

1. Update type definitions in `src/reporters/historical/types.ts`.
2. Add calculations in `src/reporters/historical/analytics.ts`.
3. If needed, surface in `src/reporters/historical/html.ts`.

## Troubleshooting

- If historical files are missing, check test logs for `[historical]` messages.
- If dashboard navigation link appears but historical page is empty, verify a run completed and wrote files under `reports/historical/`.
- If environment/suite values look unexpected, verify path/tag patterns used in `extractSuite` inside `src/reporters/historical/store.ts`.
