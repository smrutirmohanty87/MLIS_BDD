import type {
  FullConfig,
  FullResult,
  Reporter,
  Suite,
  TestCase,
  TestResult,
} from '@playwright/test/reporter';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';
import { pathToFileURL } from 'url';

type DashboardReporterOptions = {
  outputDir?: string;
  open?: boolean;
  maxRuns?: number;
};

type TestEntry = {
  id: string;
  project: string;
  file: string;
  title: string;
  fullTitle: string;
  status: 'passed' | 'failed' | 'skipped' | 'timedOut' | 'interrupted';
  durationMs: number;
};

type RunData = {
  runId: string;
  createdAtIso: string;
  createdAtLabel: string;
  environment: string;
  status: FullResult['status'];
  totalDurationMs: number;
  projects: string[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    timedOut: number;
    interrupted: number;
  };
  tests: TestEntry[];
};

function pad2(value: number) {
  return String(value).padStart(2, '0');
}

function toRunId(date: Date) {
  const yyyy = date.getFullYear();
  const mm = pad2(date.getMonth() + 1);
  const dd = pad2(date.getDate());
  const hh = pad2(date.getHours());
  const mi = pad2(date.getMinutes());
  const ss = pad2(date.getSeconds());
  const ms = String(date.getMilliseconds()).padStart(3, '0');
  return `${yyyy}-${mm}-${dd}T${hh}-${mi}-${ss}-${ms}`;
}

function formatLocalLabel(date: Date) {
  return date.toLocaleString(undefined, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function formatDuration(ms: number) {
  const totalSeconds = Math.round(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  if (minutes <= 0) return `${seconds}s`;
  return `${minutes}m ${pad2(seconds)}s`;
}

function ensureDir(dirPath: string) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function safeJsonParse<T>(filePath: string): T | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function buildHtml(runs: RunData[]) {
  const embedded = JSON.stringify(runs);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Playwright Test Dashboard</title>
  <link rel="preconnect" href="https://cdn.jsdelivr.net" />
  <style>
    :root {
      --bg: #0b1020;
      --panel: rgba(255, 255, 255, 0.06);
      --panel-2: rgba(255, 255, 255, 0.08);
      --border: rgba(255, 255, 255, 0.10);
      --text: rgba(255, 255, 255, 0.92);
      --muted: rgba(255, 255, 255, 0.65);
      --good: #33d17a;
      --bad: #ff5a5f;
      --warn: #f6c177;
      --info: #8aadf4;
      --skip: #c7c7c7;
    }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial, "Apple Color Emoji", "Segoe UI Emoji";
      background: radial-gradient(1200px 600px at 20% 0%, rgba(138, 173, 244, 0.20), transparent 60%),
                  radial-gradient(900px 500px at 80% 20%, rgba(51, 209, 122, 0.16), transparent 60%),
                  radial-gradient(900px 500px at 40% 100%, rgba(255, 90, 95, 0.14), transparent 60%),
                  var(--bg);
      color: var(--text);
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
    }

    header {
      display: flex;
      gap: 16px;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 18px;
    }

    .title {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }

    .title h1 {
      margin: 0;
      font-size: 20px;
      letter-spacing: 0.2px;
    }

    .title .sub {
      color: var(--muted);
      font-size: 13px;
    }

    .controls {
      display: flex;
      gap: 10px;
      align-items: center;
      padding: 10px 12px;
      border: 1px solid var(--border);
      background: var(--panel);
      border-radius: 12px;
      backdrop-filter: blur(10px);
    }

    .viewNav {
      display: inline-flex;
      gap: 8px;
      align-items: center;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 4px;
      background: rgba(0, 0, 0, 0.18);
    }

    .viewNav a {
      text-decoration: none;
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 6px 10px;
      font-size: 12px;
      background: var(--panel-2);
    }

    .viewNav a.active {
      border-color: rgba(138, 173, 244, 0.6);
      background: rgba(138, 173, 244, 0.24);
    }

    select {
      appearance: none;
      background: var(--panel-2);
      color: var(--text);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 9px 10px;
      min-width: 360px;
      outline: none;
      font-size: 13px;
    }

    /*
      Windows/Chromium often renders the dropdown list using <option> styling.
      Without this, the system may show a light background with our light text,
      making items look "invisible" until hover.
    */
    select option {
      background: var(--bg);
      color: var(--text);
    }

    select option:checked,
    select option:hover {
      background: rgba(138, 173, 244, 0.25);
      color: var(--text);
    }

    .grid {
      display: grid;
      grid-template-columns: 1fr;
      gap: 14px;
    }

    .cards {
      display: grid;
      grid-template-columns: repeat(4, 1fr);
      gap: 12px;
    }

    .card {
      border: 1px solid var(--border);
      background: var(--panel);
      border-radius: 14px;
      padding: 14px;
      backdrop-filter: blur(10px);
    }

    .card .label { color: var(--muted); font-size: 12px; margin-bottom: 8px; }
    .card .value { font-size: 18px; font-weight: 700; letter-spacing: 0.2px; }
    .card .metaLine { color: var(--muted); font-size: 12px; margin-top: 6px; }

    .card.good .value { color: var(--good); }
    .card.bad .value { color: var(--bad); }
    .card.warn .value { color: var(--warn); }
    .card.info .value { color: var(--info); }

    .charts {
      display: grid;
      grid-template-columns: 1fr 1fr 1.2fr;
      gap: 12px;
    }

    .panelTitle {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 10px;
    }

    .panelTitle h2 {
      margin: 0;
      font-size: 14px;
      font-weight: 700;
    }

    .panelTitle .meta {
      color: var(--muted);
      font-size: 12px;
    }

    .tableWrap {
      overflow: hidden;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12.5px;
    }

    thead th {
      text-align: left;
      font-size: 12px;
      color: var(--muted);
      padding: 10px 10px;
      border-bottom: 1px solid var(--border);
      background: rgba(0, 0, 0, 0.20);
      position: sticky;
      top: 0;
      z-index: 1;
    }

    tbody td {
      padding: 10px 10px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.06);
      vertical-align: top;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 3px 8px;
      border-radius: 999px;
      border: 1px solid var(--border);
      background: rgba(0, 0, 0, 0.18);
      font-size: 12px;
      white-space: nowrap;
    }

    .dot { width: 8px; height: 8px; border-radius: 99px; display: inline-block; }
    .dot.passed { background: var(--good); }
    .dot.failed { background: var(--bad); }
    .dot.skipped { background: var(--skip); }
    .dot.timedOut { background: var(--warn); }
    .dot.interrupted { background: var(--info); }

    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
    .muted { color: var(--muted); }

    @media (max-width: 980px) {
      .cards { grid-template-columns: repeat(2, 1fr); }
      .charts { grid-template-columns: 1fr; }
      select { min-width: 220px; }
    }
  </style>
</head>
<body>
  <div class="container">
    <header>
      <div class="title">
        <h1>Test Dashboard</h1>
        <div class="sub">Interactive report across historical runs (status, duration, charts).</div>
      </div>
      <div class="controls">
        <div class="viewNav" aria-label="Dashboard views">
          <a class="active" href="index.html">Current Run Dashboard</a>
          <a href="../historical/index.html">Historical Analytics</a>
        </div>
        <span class="muted" style="font-size:12px;">Run</span>
        <select id="runSelect" aria-label="Select a test run"></select>
        <span class="pill" id="envPill"><span class="dot interrupted"></span><span id="envLabel">Env: -</span></span>
      </div>
    </header>

    <div class="grid">
      <section class="cards">
        <div class="card info">
          <div class="label">Total Tests</div>
          <div class="value" id="totalTests">-</div>
        </div>
        <div class="card good">
          <div class="label">Passed</div>
          <div class="value" id="passedTests">-</div>
        </div>
        <div class="card bad">
          <div class="label">Failed</div>
          <div class="value" id="failedTests">-</div>
        </div>
        <div class="card warn">
          <div class="label">Total Duration</div>
          <div class="value" id="totalDuration">-</div>
        </div>

        <div class="card info" id="sanityCard">
          <div class="label">Sanity</div>
          <div class="value" id="sanityStatus">-</div>
          <div class="metaLine" id="sanityMeta">-</div>
        </div>

        <div class="card info" id="regressionCard">
          <div class="label">Regression</div>
          <div class="value" id="regressionStatus">-</div>
          <div class="metaLine" id="regressionMeta">-</div>
        </div>
      </section>

      <section class="charts">
        <div class="card" id="sanityPieCard">
          <div class="panelTitle">
            <h2>Sanity</h2>
            <div class="meta" id="sanityPieMeta">-</div>
          </div>
          <canvas id="pie" height="220"></canvas>
        </div>
        <div class="card" id="regressionPieCard">
          <div class="panelTitle">
            <h2>Regression</h2>
            <div class="meta" id="regressionPieMeta">-</div>
          </div>
          <canvas id="pieRegression" height="220"></canvas>
        </div>
        <div class="card">
          <div class="panelTitle">
            <h2>Slowest Tests</h2>
            <div class="meta">Top 10 by duration</div>
          </div>
          <canvas id="bar" height="160"></canvas>
        </div>
      </section>

      <section class="card tableWrap">
        <div class="panelTitle">
          <h2>Test Cases</h2>
          <div class="meta" id="projectsMeta">-</div>
        </div>
        <div style="max-height: 520px; overflow:auto; border-radius: 12px; border: 1px solid rgba(255,255,255,0.06);">
          <table>
            <thead>
              <tr>
                <th style="width: 130px;">Status</th>
                <th>Test</th>
                <th style="width: 110px;">Duration</th>
                <th style="width: 120px;">Project</th>
                <th style="width: 220px;">File</th>
              </tr>
            </thead>
            <tbody id="tbody"></tbody>
          </table>
        </div>
      </section>
    </div>
  </div>

  <script id="runs-data" type="application/json">${embedded}</script>
  <script>
    const runs = JSON.parse(document.getElementById('runs-data').textContent);

    const $ = (id) => document.getElementById(id);
    const runSelect = $('runSelect');

    function setVisible(id, visible) {
      const el = $(id);
      if (!el) return;
      el.style.display = visible ? '' : 'none';
    }

    function dotClass(status) {
      if (status === 'passed') return 'passed';
      if (status === 'failed') return 'failed';
      if (status === 'skipped') return 'skipped';
      if (status === 'timedOut') return 'timedOut';
      return 'interrupted';
    }

    function isFailingStatus(status) {
      return status === 'failed' || status === 'timedOut' || status === 'interrupted';
    }

    function groupOf(testEntry) {
      const file = String(testEntry.file || '').toLowerCase();
      const fullTitle = String(testEntry.fullTitle || '').toLowerCase();
      if (file.includes('/sanity/') || fullTitle.includes('@sanity')) return 'sanity';
      if (file.includes('/regression/') || fullTitle.includes('@regression')) return 'regression';
      return 'other';
    }

    function calcGroupSummary(run, group) {
      let total = 0;
      let passed = 0;
      let failing = 0;
      let durationMs = 0;

      for (const t of run.tests) {
        if (groupOf(t) !== group) continue;
        total += 1;
        durationMs += (t.durationMs || 0);
        if (t.status === 'passed') passed += 1;
        if (isFailingStatus(t.status)) failing += 1;
      }

      return { total, passed, failing, durationMs };
    }

    function calcGroupStatusCounts(run, group) {
      const counts = { total: 0, passed: 0, failed: 0, skipped: 0, timedOut: 0, interrupted: 0 };

      for (const t of run.tests) {
        if (groupOf(t) !== group) continue;
        counts.total += 1;
        if (t.status === 'passed') counts.passed += 1;
        else if (t.status === 'failed') counts.failed += 1;
        else if (t.status === 'skipped') counts.skipped += 1;
        else if (t.status === 'timedOut') counts.timedOut += 1;
        else counts.interrupted += 1;
      }

      return counts;
    }

    function setGroupCard(groupName, cardId, statusId, metaId, summary) {
      const card = $(cardId);
      const statusEl = $(statusId);
      const metaEl = $(metaId);

      if (!card || !statusEl || !metaEl) return;

      if (summary.total === 0) {
        card.className = 'card info';
        statusEl.textContent = '-';
        metaEl.textContent = '0 tests';
        return;
      }

      const ok = summary.failing === 0;
      card.className = ok ? 'card good' : 'card bad';
      statusEl.textContent = ok ? 'PASSED' : 'FAILED';
      metaEl.textContent = summary.passed + '/' + summary.total + ' passed • ' + humanDuration(summary.durationMs);
    }

    function humanDuration(ms) {
      const totalSeconds = Math.round(ms / 1000);
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      if (minutes <= 0) return seconds + 's';
      return minutes + 'm ' + String(seconds).padStart(2,'0') + 's';
    }

    function esc(value) {
      return String(value)
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;');
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

    function drawDoughnut(canvas, values, colors) {
      const { ctx, width, height } = prepareCanvas(canvas);
      const total = values.reduce((a, b) => a + b, 0) || 1;

      const cx = width / 2;
      const cy = height / 2;
      const radius = Math.min(width, height) * 0.40;
      const innerRadius = radius * 0.65;

      let start = -Math.PI / 2;
      for (let i = 0; i < values.length; i += 1) {
        const angle = (values[i] / total) * Math.PI * 2;
        const end = start + angle;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, radius, start, end);
        ctx.closePath();
        ctx.fillStyle = colors[i];
        ctx.fill();
        start = end;
      }

      // Cutout
      ctx.globalCompositeOperation = 'destination-out';
      ctx.beginPath();
      ctx.arc(cx, cy, innerRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';

      // Center label: pass rate
      const passed = values[0] || 0;
      const pct = Math.round((passed / total) * 100);
      ctx.fillStyle = 'rgba(255,255,255,0.90)';
      ctx.font = '700 18px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(pct + '%', cx, cy - 6);
      ctx.fillStyle = 'rgba(255,255,255,0.60)';
      ctx.font = '12px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial';
      ctx.fillText('pass rate', cx, cy + 14);
    }

    function drawBar(canvas, labels, values) {
      const { ctx, width, height } = prepareCanvas(canvas);
      const padding = 24;
      const left = 10;
      const right = 10;
      const top = 8;
      const bottom = 18;

      const chartW = width - left - right;
      const chartH = height - top - bottom;

      const max = Math.max(...values, 1);
      const barCount = Math.max(1, values.length);
      const gap = 8;
      const barW = Math.max(8, Math.floor((chartW - gap * (barCount - 1)) / barCount));

      // Grid
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.lineWidth = 1;
      for (let i = 0; i <= 4; i += 1) {
        const y = top + (chartH * i) / 4;
        ctx.beginPath();
        ctx.moveTo(left, y);
        ctx.lineTo(width - right, y);
        ctx.stroke();
      }

      // Bars
      for (let i = 0; i < barCount; i += 1) {
        const x = left + i * (barW + gap);
        const v = values[i] || 0;
        const h = Math.max(2, (v / max) * chartH);
        const y = top + chartH - h;

        ctx.fillStyle = 'rgba(138, 173, 244, 0.55)';
        ctx.strokeStyle = 'rgba(138, 173, 244, 0.95)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(x, y, barW, h, 6);
        ctx.fill();
        ctx.stroke();
      }

      // Labels (first few)
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.font = '10px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Arial';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      const shown = Math.min(3, labels.length);
      for (let i = 0; i < shown; i += 1) {
        const text = labels[i] || '';
        const short = text.length > 26 ? text.slice(0, 26) + '…' : text;
        ctx.fillText(short, left + i * (barW + gap), height - 2);
      }
    }

    function render(run) {
      const environment = String(run.environment || 'UNKNOWN').toUpperCase();

      $('totalTests').textContent = run.summary.total;
      $('passedTests').textContent = run.summary.passed;
      $('failedTests').textContent = run.summary.failed;
      $('totalDuration').textContent = humanDuration(run.totalDurationMs);
      $('envLabel').textContent = 'Env: ' + environment;
      $('projectsMeta').textContent = 'Environment: ' + environment + ' • Projects: ' + run.projects.join(', ');

      const sanity = calcGroupSummary(run, 'sanity');
      const regression = calcGroupSummary(run, 'regression');

      const sanityCounts = calcGroupStatusCounts(run, 'sanity');
      const regressionCounts = calcGroupStatusCounts(run, 'regression');

      const hasSanity = sanityCounts.total > 0;
      const hasRegression = regressionCounts.total > 0;

      // Show only sections that are present in this run.
      setVisible('sanityCard', hasSanity);
      setVisible('sanityPieCard', hasSanity);
      setVisible('regressionCard', hasRegression);
      setVisible('regressionPieCard', hasRegression);

      // Adjust chart layout based on what is visible.
      const charts = document.querySelector('section.charts');
      if (charts) {
        charts.style.gridTemplateColumns = hasSanity && hasRegression ? '1fr 1fr 1.2fr' : '1fr 1.2fr';
      }

      // Cards
      setGroupCard('sanity', 'sanityCard', 'sanityStatus', 'sanityMeta', sanity);
      setGroupCard('regression', 'regressionCard', 'regressionStatus', 'regressionMeta', regression);

      // Pie meta
      if (hasSanity) $('sanityPieMeta').textContent = run.createdAtLabel + ' • ' + environment + ' • ' + sanityCounts.total + ' tests • Status: ' + run.status;
      if (hasRegression) $('regressionPieMeta').textContent = run.createdAtLabel + ' • ' + environment + ' • ' + regressionCounts.total + ' tests • Status: ' + run.status;

      if (hasSanity) {
        drawDoughnut(
          $('pie'),
          [sanityCounts.passed, sanityCounts.failed, sanityCounts.skipped, sanityCounts.timedOut, sanityCounts.interrupted],
          ['#33d17a', '#ff5a5f', '#c7c7c7', '#f6c177', '#8aadf4'],
        );
      }

      if (hasRegression) {
        drawDoughnut(
          $('pieRegression'),
          [regressionCounts.passed, regressionCounts.failed, regressionCounts.skipped, regressionCounts.timedOut, regressionCounts.interrupted],
          ['#33d17a', '#ff5a5f', '#c7c7c7', '#f6c177', '#8aadf4'],
        );
      }

      const slowest = [...run.tests]
        .filter(t => t.status !== 'skipped')
        .sort((a,b) => b.durationMs - a.durationMs)
        .slice(0, 10);

      drawBar(
        $('bar'),
        slowest.map(t => t.title),
        slowest.map(t => Math.max(0.01, t.durationMs / 1000)),
      );

      const tbody = $('tbody');
      tbody.innerHTML = '';

      for (const t of run.tests) {
        const tr = document.createElement('tr');
        const statusTd = document.createElement('td');
        statusTd.innerHTML = '<span class="pill"><span class="dot ' + dotClass(t.status) + '"></span>' + esc(t.status) + '</span>';

        const titleTd = document.createElement('td');
        titleTd.innerHTML = '<div style="font-weight:700;">' + esc(t.title) + '</div>' +
          '<div class="muted mono" style="margin-top:2px;">' + esc(t.fullTitle) + '</div>';

        const durTd = document.createElement('td');
        durTd.textContent = humanDuration(t.durationMs);

        const projTd = document.createElement('td');
        projTd.textContent = 'MLIS';

        const fileTd = document.createElement('td');
        fileTd.innerHTML = '<span class="mono">' + esc(t.file) + '</span>';

        tr.appendChild(statusTd);
        tr.appendChild(titleTd);
        tr.appendChild(durTd);
        tr.appendChild(projTd);
        tr.appendChild(fileTd);
        tbody.appendChild(tr);
      }
    }

    // Build dropdown (newest first)
    runs.sort((a,b) => (a.createdAtIso < b.createdAtIso ? 1 : -1));
    for (const run of runs) {
      const opt = document.createElement('option');
      opt.value = run.runId;
      opt.textContent = run.createdAtLabel + '  •  ' + (run.summary.failed ? 'FAILED' : 'PASSED') +
        '  •  ' + String(run.environment || 'UNKNOWN').toUpperCase() +
        '  •  ' + run.summary.total + ' tests  •  ' + humanDuration(run.totalDurationMs);
      runSelect.appendChild(opt);
    }

    const first = runs[0];
    if (first) {
      runSelect.value = first.runId;
      render(first);
    }

    runSelect.addEventListener('change', () => {
      const run = runs.find(r => r.runId === runSelect.value);
      if (run) render(run);
    });
  </script>
</body>
</html>`;
}

class DashboardReporter implements Reporter {
  private readonly outputDir: string;
  private readonly openAfterRun: boolean;
  private readonly maxRuns: number;

  private runStartedAt = new Date();
  private runId = toRunId(this.runStartedAt);
  private runLabel = formatLocalLabel(this.runStartedAt);
  private runEnvironment = 'SIT2';
  private testEntries: TestEntry[] = [];
  private projectsUsed = new Set<string>();

  constructor(options: DashboardReporterOptions = {}) {
    this.outputDir = options.outputDir ?? path.resolve(process.cwd(), 'reports', 'dashboard');
    const openDefault = !process.env.CI;
    this.openAfterRun = options.open ?? openDefault;
    this.maxRuns = Math.max(1, options.maxRuns ?? 40);
  }

  onBegin(config: FullConfig, suite: Suite) {
    this.runStartedAt = new Date();
    this.runId = toRunId(this.runStartedAt);
    this.runLabel = formatLocalLabel(this.runStartedAt);
    const envValue = (process.env.TEST_ENV ?? '').trim();
    this.runEnvironment = envValue ? envValue.toUpperCase() : 'SIT2';
    this.testEntries = [];
    this.projectsUsed = new Set<string>();
  }

  onTestEnd(test: TestCase, result: TestResult) {
    const titleParts = test.titlePath().filter(Boolean);
    const browserProject = (titleParts[0] as string | undefined) ?? 'unknown';
    this.projectsUsed.add(browserProject);
    const file = path.relative(process.cwd(), test.location.file).replace(/\\/g, '/');
    const fullTitle = test.titlePath().join(' › ');

    this.testEntries.push({
      id: `${browserProject}:${file}:${test.title}`, // stable-ish
      project: 'MLIS',
      file,
      title: test.title,
      fullTitle,
      status: result.status,
      durationMs: result.duration,
    });
  }

  async onEnd(result: FullResult) {
    // Always generate dashboard artifacts so every execution produces a run entry,
    // even when startup/config errors prevent tests from starting.

    const runEndedAt = new Date();
    const durationMs = runEndedAt.getTime() - this.runStartedAt.getTime();

    const summary = {
      total: this.testEntries.length,
      passed: this.testEntries.filter(t => t.status === 'passed').length,
      failed: this.testEntries.filter(t => t.status === 'failed').length,
      skipped: this.testEntries.filter(t => t.status === 'skipped').length,
      timedOut: this.testEntries.filter(t => t.status === 'timedOut').length,
      interrupted: this.testEntries.filter(t => t.status === 'interrupted').length,
    };

    const runData: RunData = {
      runId: this.runId,
      createdAtIso: this.runStartedAt.toISOString(),
      createdAtLabel: this.runLabel,
      environment: this.runEnvironment,
      status: result.status,
      totalDurationMs: durationMs,
      projects: Array.from(this.projectsUsed).sort(),
      summary,
      tests: this.testEntries,
    };

    const runsDir = path.join(this.outputDir, 'runs');
    ensureDir(runsDir);

    const runFile = path.join(runsDir, `run-${this.runId}.json`);
    fs.writeFileSync(runFile, JSON.stringify(runData, null, 2), 'utf-8');

    // Load existing runs (for dropdown)
    const runFiles = fs
      .readdirSync(runsDir)
      .filter(f => f.endsWith('.json'))
      .sort()
      .slice(-this.maxRuns)
      .map(f => path.join(runsDir, f));

    const runs: RunData[] = [];
    for (const filePath of runFiles) {
      const parsed = safeJsonParse<RunData>(filePath);
      if (parsed) runs.push(parsed);
    }

    // Ensure newest last-written run is included
    if (!runs.some(r => r.runId === runData.runId)) runs.push(runData);

    const html = buildHtml(runs);
    ensureDir(this.outputDir);

    const indexPath = path.join(this.outputDir, 'index.html');
    fs.writeFileSync(indexPath, html, 'utf-8');

    // Always print where the dashboard was written.
    // This is useful when OS policies block auto-opening.
    // (The dashboard is still generated regardless.)
    console.log(`[dashboard] Written: ${indexPath}`);

    if (this.openAfterRun) {
      const platform = process.platform;
      const url = pathToFileURL(indexPath).toString();

      console.log(`[dashboard] Opening: ${url}`);

      // Open in default browser, detached so Playwright process can exit cleanly.
      // Windows: cmd /c start "" "file:///..."
      // macOS: open "file:///..."
      // Linux: xdg-open "file:///..."

      const runAndCheckExit = async (command: string, args: string[], options: Parameters<typeof spawn>[2]) => {
        return await new Promise<{ started: boolean; exitCode: number | null }>((resolve) => {
          const child = spawn(command, args, options);
          let started = false;
          child.once('error', () => resolve({ started: false, exitCode: null }));
          child.once('spawn', () => {
            started = true;
          });
          child.once('exit', (code) => resolve({ started, exitCode: code }));
        });
      };

      const spawnDetached = (command: string, args: string[], options: Parameters<typeof spawn>[2]) => {
        const child = spawn(command, args, options);
        child.unref();
      };

      try {
        if (platform === 'win32') {
          // Some environments block cmd-start; Start-Process is usually allowed.
          // Use single-quoted URL to avoid escaping issues.
          const psUrl = url.replaceAll("'", "''");

          // Make PowerShell return an explicit exit code so we can detect policy/association issues.
          const ps = await runAndCheckExit(
            'powershell',
            [
              '-NoProfile',
              '-ExecutionPolicy',
              'Bypass',
              '-Command',
              `try { Start-Process '${psUrl}' -ErrorAction Stop | Out-Null; exit 0 } catch { exit 1 }`,
            ],
            { stdio: 'ignore', windowsHide: true },
          );

          if (ps.started && ps.exitCode === 0) {
            console.log('[dashboard] Opened via PowerShell Start-Process');
            return;
          }

          const explorer = await runAndCheckExit(
            'explorer.exe',
            [indexPath],
            { stdio: 'ignore', windowsHide: true },
          );

          if (explorer.started && (explorer.exitCode === 0 || explorer.exitCode === null)) {
            console.log('[dashboard] Opened via explorer.exe');
            return;
          }

          console.log('[dashboard] WARNING: Auto-open failed (blocked by OS policy?). Open reports/dashboard/index.html manually.');
        } else if (platform === 'darwin') {
          spawnDetached('open', [url], { detached: true, stdio: 'ignore' });
        } else {
          spawnDetached('xdg-open', [url], { detached: true, stdio: 'ignore' });
        }
      } catch {
        console.log('[dashboard] WARNING: Auto-open failed. Open reports/dashboard/index.html manually.');
      }
    }
  }
}

export default DashboardReporter;
