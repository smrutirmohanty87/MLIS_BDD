import type { HistoricalMetrics, HistoricalRunSummary, HistoricalTestEntry } from './types';

type Payload = {
  runs: HistoricalRunSummary[];
  tests: HistoricalTestEntry[];
  metrics: HistoricalMetrics;
};

export function buildHistoricalHtml(payload: Payload): string {
  const embedded = JSON.stringify(payload);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Historical Analytics</title>
  <style>
    :root {
      --bg: #09111f;
      --panel: rgba(255, 255, 255, 0.06);
      --panel-2: rgba(255, 255, 255, 0.10);
      --border: rgba(255, 255, 255, 0.14);
      --text: rgba(255, 255, 255, 0.93);
      --muted: rgba(255, 255, 255, 0.68);
      --accent: #6ec1ff;
      --ok: #33d17a;
      --bad: #ff5a5f;
      --warn: #f6c177;
    }

    * { box-sizing: border-box; }

    body {
      margin: 0;
      font-family: "Segoe UI", Arial, sans-serif;
      color: var(--text);
      background:
        radial-gradient(1000px 500px at 10% -10%, rgba(110,193,255,0.20), transparent 60%),
        radial-gradient(1000px 500px at 90% 0%, rgba(51,209,122,0.18), transparent 60%),
        radial-gradient(1000px 500px at 50% 120%, rgba(246,193,119,0.16), transparent 60%),
        var(--bg);
    }

    .wrap {
      max-width: 1320px;
      margin: 0 auto;
      padding: 20px;
    }

    .topbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 10px;
      flex-wrap: wrap;
      margin-bottom: 14px;
    }

    .title h1 { margin: 0; font-size: 22px; }
    .title .sub { margin-top: 4px; color: var(--muted); font-size: 13px; }

    .nav {
      display: inline-flex;
      gap: 8px;
      align-items: center;
      border: 1px solid var(--border);
      border-radius: 12px;
      background: var(--panel);
      padding: 8px;
    }

    .btn {
      border: 1px solid var(--border);
      color: var(--text);
      background: var(--panel-2);
      border-radius: 10px;
      padding: 7px 11px;
      text-decoration: none;
      font-size: 13px;
      cursor: pointer;
    }

    .btn.active {
      border-color: rgba(110,193,255,0.55);
      background: rgba(110,193,255,0.22);
      color: white;
    }

    .panel {
      border: 1px solid var(--border);
      background: var(--panel);
      border-radius: 14px;
      padding: 14px;
      backdrop-filter: blur(8px);
      margin-bottom: 12px;
    }

    .filters {
      display: grid;
      grid-template-columns: repeat(7, minmax(130px, 1fr));
      gap: 10px;
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .field label { font-size: 12px; color: var(--muted); }

    input, select {
      background: var(--panel-2);
      border: 1px solid var(--border);
      color: var(--text);
      border-radius: 8px;
      padding: 8px;
      min-height: 34px;
      font-size: 12px;
    }

    select option {
      background: #101826;
      color: #ffffff;
    }

    .resetBtn {
      margin-top: 20px;
      min-height: 34px;
      border-radius: 8px;
      border: 1px solid var(--border);
      background: rgba(110, 193, 255, 0.18);
      color: var(--text);
      cursor: pointer;
      font-size: 12px;
      padding: 8px 12px;
    }

    .resetBtn:hover {
      background: rgba(110, 193, 255, 0.28);
    }

    select option:checked,
    select option:hover {
      background: rgba(110, 193, 255, 0.35);
      color: #ffffff;
    }

    .cards {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      gap: 10px;
    }

    .card {
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 10px;
      background: rgba(0, 0, 0, 0.22);
    }

    .card .k { font-size: 11px; color: var(--muted); }
    .card .v { margin-top: 6px; font-size: 18px; font-weight: 700; }

    .charts {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 10px;
    }

    .chartTitle { font-size: 13px; font-weight: 700; margin-bottom: 8px; }
    .chartMeta { color: var(--muted); font-size: 12px; margin-bottom: 8px; }

    canvas { width: 100%; height: 220px; }

    .tables {
      display: grid;
      grid-template-columns: 1.15fr 1fr;
      gap: 10px;
    }

    .tableWrap {
      max-height: 420px;
      overflow: auto;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }

    th, td {
      text-align: left;
      padding: 8px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      vertical-align: top;
    }

    th {
      position: sticky;
      top: 0;
      background: rgba(0, 0, 0, 0.38);
      color: var(--muted);
      font-weight: 600;
    }

    .pill {
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 2px 8px;
      display: inline-block;
      white-space: nowrap;
    }

    .pass { color: var(--ok); }
    .fail { color: var(--bad); }

    .empty {
      border: 1px dashed var(--border);
      border-radius: 12px;
      padding: 24px;
      color: var(--muted);
      text-align: center;
      font-size: 14px;
    }

    @media (max-width: 1100px) {
      .filters { grid-template-columns: repeat(2, minmax(130px, 1fr)); }
      .cards { grid-template-columns: repeat(2, minmax(100px, 1fr)); }
      .charts, .tables { grid-template-columns: 1fr; }
    }
  </style>
</head>
<body>
  <div class="wrap">
    <div class="topbar">
      <div class="title">
        <h1>Historical Analytics</h1>
        <div class="sub">Longitudinal trends across all completed runs</div>
      </div>
      <div class="nav">
        <a class="btn" href="../dashboard/index.html">Current Run Dashboard</a>
        <a class="btn active" href="index.html">Historical Analytics</a>
      </div>
    </div>

    <section class="panel">
      <div class="filters">
        <div class="field"><label>From Date</label><input type="date" id="fromDate" /></div>
        <div class="field"><label>To Date</label><input type="date" id="toDate" /></div>
        <div class="field"><label>Environment</label><select id="envFilter"></select></div>
        <div class="field"><label>Suite</label><select id="suiteFilter"></select></div>
        <div class="field"><label>Project</label><select id="projectFilter"></select></div>
        <div class="field"><label>Status</label><select id="statusFilter"></select></div>
        <div class="field"><label>&nbsp;</label><button id="resetFilters" class="resetBtn" type="button">Reset Filters</button></div>
      </div>
    </section>

    <section id="emptyState" class="empty" style="display:none;">No historical data available</section>

    <section id="contentArea" style="display:none;">
      <section class="panel cards">
        <div class="card"><div class="k">Total Runs</div><div class="v" id="mTotalRuns">0</div></div>
        <div class="card"><div class="k">Total Tests Executed</div><div class="v" id="mTotalTests">0</div></div>
        <div class="card"><div class="k">Total Passed</div><div class="v pass" id="mPassed">0</div></div>
        <div class="card"><div class="k">Total Failed</div><div class="v fail" id="mFailed">0</div></div>
        <div class="card"><div class="k">Average Pass Rate</div><div class="v" id="mAvgPassRate">0%</div></div>
        <div class="card"><div class="k">Avg Duration</div><div class="v" id="mAvgDuration">0s</div></div>
        <div class="card"><div class="k">Total Execution Time</div><div class="v" id="mTotalDuration">0s</div></div>
      </section>

      <section class="charts">
        <div class="panel">
          <div class="chartTitle">Pass Rate Trend</div>
          <div class="chartMeta" id="passRateMeta">-</div>
          <canvas id="passRateChart" height="220"></canvas>
        </div>
        <div class="panel">
          <div class="chartTitle">Execution Duration Trend</div>
          <div class="chartMeta" id="durationMeta">-</div>
          <canvas id="durationChart" height="220"></canvas>
        </div>
        <div class="panel">
          <div class="chartTitle">Pass/Fail Trend</div>
          <div class="chartMeta" id="passFailMeta">-</div>
          <canvas id="passFailChart" height="220"></canvas>
        </div>
      </section>

      <section class="tables">
        <div class="panel">
          <div class="chartTitle">Run History</div>
          <div class="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Run ID</th>
                  <th>Date</th>
                  <th>Env</th>
                  <th>Project</th>
                  <th>Suite</th>
                  <th>Total</th>
                  <th>Passed</th>
                  <th>Failed</th>
                  <th>Pass Rate</th>
                  <th>Duration</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody id="runRows"></tbody>
            </table>
          </div>
        </div>

        <div class="panel">
          <div class="chartTitle">Test Stability</div>
          <div class="tableWrap">
            <table>
              <thead>
                <tr>
                  <th>Test Case</th>
                  <th>Suite</th>
                  <th>Runs</th>
                  <th>Passed</th>
                  <th>Failed</th>
                  <th>Pass Rate</th>
                </tr>
              </thead>
              <tbody id="stabilityRows"></tbody>
            </table>
          </div>
        </div>
      </section>
    </section>
  </div>

  <script id="historical-data" type="application/json">${embedded}</script>
  <script>
    const payload = JSON.parse(document.getElementById('historical-data').textContent || '{"runs":[],"tests":[],"metrics":{}}');
    const runs = Array.isArray(payload.runs) ? payload.runs.slice() : [];
    const tests = Array.isArray(payload.tests) ? payload.tests.slice() : [];

    const $ = (id) => document.getElementById(id);

    function esc(text) {
      return String(text)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
    }

    function toDate(value) {
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? null : d;
    }

    function durationLabel(seconds) {
      const total = Math.max(0, Math.round(Number(seconds || 0)));
      const h = Math.floor(total / 3600);
      const m = Math.floor((total % 3600) / 60);
      const s = total % 60;
      if (h > 0) return h + 'h ' + String(m).padStart(2, '0') + 'm';
      if (m > 0) return m + 'm ' + String(s).padStart(2, '0') + 's';
      return s + 's';
    }

    function round2(value) {
      return Math.round(value * 100) / 100;
    }

    function applyFilters(items) {
      const from = $('fromDate').value;
      const to = $('toDate').value;
      const env = $('envFilter').value;
      const suite = $('suiteFilter').value;
      const project = $('projectFilter').value;

      return items.filter((run) => {
        if (env !== 'ALL' && run.environment !== env) return false;
        if (suite !== 'ALL' && run.suite !== suite) return false;
        if (project !== 'ALL' && run.project !== project) return false;

        const d = toDate(run.timestamp);
        if (!d) return false;

        if (from) {
          const fromDate = new Date(from + 'T00:00:00');
          if (d < fromDate) return false;
        }

        if (to) {
          const toDateLimit = new Date(to + 'T23:59:59');
          if (d > toDateLimit) return false;
        }

        return true;
      });
    }

    function optionsFor(values) {
      const uniq = Array.from(new Set(values.filter(Boolean))).sort();
      return ['ALL', ...uniq];
    }

    function renderSelect(id, values) {
      const el = $(id);
      const current = el.value || 'ALL';
      el.innerHTML = '';
      for (const v of values) {
        const opt = document.createElement('option');
        opt.value = v;
        opt.textContent = v;
        el.appendChild(opt);
      }
      el.value = values.includes(current) ? current : 'ALL';
    }

    function prepareCanvas(canvas) {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      const ctx = canvas.getContext('2d');
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);
      return { ctx, width, height };
    }

    function drawLineChart(canvas, points, color, minY, maxY) {
      const { ctx, width, height } = prepareCanvas(canvas);
      const left = 28;
      const right = 12;
      const top = 10;
      const bottom = 22;
      const chartW = width - left - right;
      const chartH = height - top - bottom;

      const safePoints = points.length > 0 ? points : [0];
      const yMin = minY;
      const yMax = maxY <= minY ? minY + 1 : maxY;

      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i += 1) {
        const y = top + (chartH * i) / 4;
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(left + chartW, y);
        ctx.stroke();
      }

      ctx.strokeStyle = color;
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < safePoints.length; i += 1) {
        const x = left + (safePoints.length === 1 ? chartW / 2 : (i / (safePoints.length - 1)) * chartW);
        const y = top + chartH - ((safePoints[i] - yMin) / (yMax - yMin)) * chartH;
        if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
      }
      ctx.stroke();

      ctx.fillStyle = color;
      for (let i = 0; i < safePoints.length; i += 1) {
        const x = left + (safePoints.length === 1 ? chartW / 2 : (i / (safePoints.length - 1)) * chartW);
        const y = top + chartH - ((safePoints[i] - yMin) / (yMax - yMin)) * chartH;
        ctx.beginPath();
        ctx.arc(x, y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    function drawPassFailChart(canvas, passValues, failValues) {
      const { ctx, width, height } = prepareCanvas(canvas);
      const left = 28;
      const right = 12;
      const top = 10;
      const bottom = 22;
      const chartW = width - left - right;
      const chartH = height - top - bottom;

      const count = Math.max(passValues.length, 1);
      const gap = 10;
      const groupW = chartW / count;
      const barW = Math.max(6, (groupW - gap) / 2);

      const maxY = Math.max(1, ...passValues, ...failValues);

      ctx.strokeStyle = 'rgba(255,255,255,0.12)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i += 1) {
        const y = top + (chartH * i) / 4;
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(left + chartW, y);
        ctx.stroke();
      }

      for (let i = 0; i < count; i += 1) {
        const baseX = left + i * groupW + gap / 2;
        const p = passValues[i] || 0;
        const f = failValues[i] || 0;
        const ph = (p / maxY) * chartH;
        const fh = (f / maxY) * chartH;

        ctx.fillStyle = 'rgba(51,209,122,0.75)';
        ctx.fillRect(baseX, top + chartH - ph, barW, ph);

        ctx.fillStyle = 'rgba(255,90,95,0.75)';
        ctx.fillRect(baseX + barW + 2, top + chartH - fh, barW, fh);
      }
    }

    function statusScopedCounts(run, selectedStatus) {
      if (selectedStatus === 'passed') {
        return {
          total: Number(run.passed || 0),
          passed: Number(run.passed || 0),
          failed: 0,
          passRate: Number(run.passed || 0) > 0 ? 100 : 0,
        };
      }

      if (selectedStatus === 'failed') {
        return {
          total: Number(run.failed || 0),
          passed: 0,
          failed: Number(run.failed || 0),
          passRate: 0,
        };
      }

      return {
        total: Number(run.totalTests || 0),
        passed: Number(run.passed || 0),
        failed: Number(run.failed || 0),
        passRate: Number(run.passRate || 0),
      };
    }

    function metricsFor(filteredRuns, selectedStatus) {
      const totalRuns = filteredRuns.length;
      const scoped = filteredRuns.map((run) => statusScopedCounts(run, selectedStatus));
      const totalTestsExecuted = scoped.reduce((sum, r) => sum + r.total, 0);
      const totalPassed = scoped.reduce((sum, r) => sum + r.passed, 0);
      const totalFailed = scoped.reduce((sum, r) => sum + r.failed, 0);
      const totalExecutionDurationSeconds = filteredRuns.reduce((sum, r) => sum + r.durationSeconds, 0);
      const averagePassRate = totalTestsExecuted > 0 ? round2((totalPassed / totalTestsExecuted) * 100) : 0;
      const averageExecutionDurationSeconds = totalRuns > 0 ? round2(totalExecutionDurationSeconds / totalRuns) : 0;
      return { totalRuns, totalTestsExecuted, totalPassed, totalFailed, totalExecutionDurationSeconds, averagePassRate, averageExecutionDurationSeconds };
    }

    function runIdsSet(filteredRuns) {
      return new Set(filteredRuns.map((r) => r.runId));
    }

    function stabilityRows(filteredRuns, selectedStatus) {
      const allowed = runIdsSet(filteredRuns);
      const map = new Map();

      for (const t of tests) {
        if (!allowed.has(t.runId)) continue;
        if (selectedStatus !== 'ALL' && t.status !== selectedStatus) continue;
        const key = t.testId + '::' + t.suite;
        const row = map.get(key) || { testId: t.testId, testName: t.testName, suite: t.suite, runs: 0, passed: 0, failed: 0 };
        row.runs += 1;
        if (t.status === 'passed') row.passed += 1;
        if (t.status === 'failed' || t.status === 'timedOut' || t.status === 'interrupted') row.failed += 1;
        map.set(key, row);
      }

      return Array.from(map.values())
        .map((row) => ({ ...row, passRate: row.runs > 0 ? round2((row.passed / row.runs) * 100) : 0 }))
        .sort((a, b) => {
          if (a.passRate !== b.passRate) return a.passRate - b.passRate;
          if (a.runs !== b.runs) return b.runs - a.runs;
          return a.testId.localeCompare(b.testId);
        });
    }

    function render(filteredRuns) {
      const selectedStatus = $('statusFilter').value;
      const sortedBase = filteredRuns.slice().sort((a, b) => (a.timestamp < b.timestamp ? -1 : 1));
      const sorted = selectedStatus === 'ALL'
        ? sortedBase
        : sortedBase.filter((run) => statusScopedCounts(run, selectedStatus).total > 0);

      const empty = sorted.length === 0;
      $('emptyState').style.display = empty ? '' : 'none';
      $('contentArea').style.display = empty ? 'none' : '';
      if (empty) return;

      const m = metricsFor(sorted, selectedStatus);

      $('mTotalRuns').textContent = String(m.totalRuns);
      $('mTotalTests').textContent = String(m.totalTestsExecuted);
      $('mPassed').textContent = String(m.totalPassed);
      $('mFailed').textContent = String(m.totalFailed);
      $('mAvgPassRate').textContent = m.averagePassRate + '%';
      $('mAvgDuration').textContent = durationLabel(m.averageExecutionDurationSeconds);
      $('mTotalDuration').textContent = durationLabel(m.totalExecutionDurationSeconds);

      const passRates = sorted.map((r) => Number(statusScopedCounts(r, selectedStatus).passRate || 0));
      const durations = sorted.map((r) => Number(r.durationSeconds || 0));
      const passedCounts = sorted.map((r) => Number(statusScopedCounts(r, selectedStatus).passed || 0));
      const failedCounts = sorted.map((r) => Number(statusScopedCounts(r, selectedStatus).failed || 0));

      $('passRateMeta').textContent = sorted.length + ' runs';
      $('durationMeta').textContent = sorted.length + ' runs';
      $('passFailMeta').textContent = sorted.length + ' runs';

      drawLineChart($('passRateChart'), passRates, 'rgba(110,193,255,0.95)', 0, 100);
      drawLineChart($('durationChart'), durations, 'rgba(246,193,119,0.95)', 0, Math.max(1, ...durations));
      drawPassFailChart($('passFailChart'), passedCounts, failedCounts);

      const runRows = $('runRows');
      runRows.innerHTML = '';
      const newestFirst = sorted.slice().reverse();
      for (const run of newestFirst) {
        const scoped = statusScopedCounts(run, selectedStatus);
        const row = document.createElement('tr');
        row.innerHTML =
          '<td><span class="pill">' + esc(run.runId) + '</span></td>' +
          '<td>' + esc(new Date(run.timestamp).toLocaleString()) + '</td>' +
          '<td>' + esc(run.environment) + '</td>' +
          '<td>' + esc(run.project) + '</td>' +
          '<td>' + esc(run.suite) + '</td>' +
          '<td>' + esc(scoped.total) + '</td>' +
          '<td class="pass">' + esc(scoped.passed) + '</td>' +
          '<td class="fail">' + esc(scoped.failed) + '</td>' +
          '<td>' + esc(scoped.passRate + '%') + '</td>' +
          '<td>' + esc(durationLabel(run.durationSeconds)) + '</td>' +
          '<td>' + esc(run.status) + '</td>';
        runRows.appendChild(row);
      }

      const stable = stabilityRows(sorted, selectedStatus);
      const stabilityEl = $('stabilityRows');
      stabilityEl.innerHTML = '';
      for (const s of stable) {
        const row = document.createElement('tr');
        row.innerHTML =
          '<td><div style="font-weight:700">' + esc(s.testId) + '</div><div style="color:rgba(255,255,255,0.65)">' + esc(s.testName) + '</div></td>' +
          '<td>' + esc(s.suite) + '</td>' +
          '<td>' + esc(s.runs) + '</td>' +
          '<td class="pass">' + esc(s.passed) + '</td>' +
          '<td class="fail">' + esc(s.failed) + '</td>' +
          '<td>' + esc(s.passRate + '%') + '</td>';
        stabilityEl.appendChild(row);
      }
    }

    function rerender() {
      render(applyFilters(runs));
    }

    function initFilters() {
      renderSelect('envFilter', optionsFor(runs.map((r) => r.environment)));
      renderSelect('suiteFilter', optionsFor(runs.map((r) => r.suite)));
      renderSelect('projectFilter', optionsFor(runs.map((r) => r.project)));
      renderSelect('statusFilter', optionsFor(runs.map((r) => r.status)));

      const controls = ['fromDate', 'toDate', 'envFilter', 'suiteFilter', 'projectFilter', 'statusFilter'];
      for (const id of controls) {
        $(id).addEventListener('change', rerender);
      }

      $('resetFilters').addEventListener('click', () => {
        $('fromDate').value = '';
        $('toDate').value = '';
        $('envFilter').value = 'ALL';
        $('suiteFilter').value = 'ALL';
        $('projectFilter').value = 'ALL';
        $('statusFilter').value = 'ALL';
        rerender();
      });
    }

    initFilters();
    rerender();
  </script>
</body>
</html>`;
}
