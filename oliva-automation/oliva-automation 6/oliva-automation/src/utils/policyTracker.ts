import { spawnSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

type TrackerArgs = {
  policyNumber: string;
  flowAction: string;
};

const WORKSPACE_ROOT = path.resolve(__dirname, '../../../../../');
const EXCEL_PATH = path.join(WORKSPACE_ROOT, 'reports', 'policy-tracker.xlsx');
const LIVE_UPDATER_SCRIPT_PATH = path.join(WORKSPACE_ROOT, 'scripts', 'update-policy-tracker-live.ps1');
const SHEET_NAME = 'Policy Numbers';
const loggedKeys = new Set<string>();

const HEADERS = [
  { header: 'Run #', key: 'run', width: 8 },
  { header: 'Policy Number', key: 'policyNumber', width: 26 },
  { header: 'Test Name', key: 'testName', width: 60 },
  { header: 'Portal Type', key: 'portalType', width: 28 },
  { header: 'Environment', key: 'environment', width: 14 },
  { header: 'Date / Time', key: 'dateTime', width: 22 },
];

function environmentName(): string {
  const env = (process.env.ENVIRONMENT || process.env.TEST_ENV || 'sit').trim();
  return env.toUpperCase();
}

function trackerTestName(flowAction: string): string {
  const base = process.env.PW_TEST_TITLE || process.env.npm_lifecycle_event || 'Oliva Playwright';
  return `${base} | ${flowAction}`;
}

function dateTimeString(): string {
  return new Date().toLocaleString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
}

function tryAppendToOpenWorkbookLive(args: {
  policyNumber: string;
  testName: string;
  portalType: string;
  environment: string;
  dateTime: string;
}): boolean {
  if (process.platform !== 'win32' || !fs.existsSync(LIVE_UPDATER_SCRIPT_PATH)) {
    return false;
  }

  const result = spawnSync(
    'powershell',
    [
      '-NoProfile',
      '-ExecutionPolicy',
      'Bypass',
      '-File',
      LIVE_UPDATER_SCRIPT_PATH,
      '-ExcelPath',
      EXCEL_PATH,
      '-SheetName',
      SHEET_NAME,
      '-PolicyNumber',
      args.policyNumber,
      '-TestName',
      args.testName,
      '-PortalType',
      args.portalType,
      '-Environment',
      args.environment,
      '-DateTime',
      args.dateTime,
    ],
    {
      encoding: 'utf8',
      timeout: 25000,
      windowsHide: true,
    }
  );

  return result.status === 0;
}

function styleHeaderRow(headerRow: any): void {
  headerRow.eachCell((cell: any) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1F3864' },
    };
    cell.alignment = { vertical: 'middle', horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' },
    };
  });
  headerRow.height = 22;
}

function styleDataRow(row: any, isEven: boolean): void {
  row.eachCell((cell: any) => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: isEven ? 'FFD9E1F2' : 'FFFFFFFF' },
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FFBFBFBF' } },
      left: { style: 'thin', color: { argb: 'FFBFBFBF' } },
      bottom: { style: 'thin', color: { argb: 'FFBFBFBF' } },
      right: { style: 'thin', color: { argb: 'FFBFBFBF' } },
    };
    cell.alignment = { vertical: 'middle' };
  });
  row.getCell('run').alignment = { vertical: 'middle', horizontal: 'center' };
}

export async function logOlivaPolicyNumber({ policyNumber, flowAction }: TrackerArgs): Promise<void> {
  const environment = environmentName();
  const testName = trackerTestName(flowAction);
  const portalType = 'Oliva Automation';
  const dateTime = dateTimeString();

  const dedupeKey = `${environment}|${testName}|${policyNumber}`;
  if (loggedKeys.has(dedupeKey)) {
    return;
  }

  try {
    const liveUpdated = tryAppendToOpenWorkbookLive({
      policyNumber,
      testName,
      portalType,
      environment,
      dateTime,
    });

    if (liveUpdated) {
      loggedKeys.add(dedupeKey);
      console.log(`[PolicyTracker][Oliva] Live update | ${policyNumber} | ${environment}`);
      return;
    }

    if (!fs.existsSync(path.dirname(EXCEL_PATH))) {
      fs.mkdirSync(path.dirname(EXCEL_PATH), { recursive: true });
    }

    // Lazy require to avoid hard failure when tracker dependency is unavailable.
    const ExcelJS = require('exceljs');
    const workbook = new ExcelJS.Workbook();

    if (fs.existsSync(EXCEL_PATH)) {
      await workbook.xlsx.readFile(EXCEL_PATH);
    }

    let sheet = workbook.getWorksheet(SHEET_NAME);
    if (!sheet) {
      sheet = workbook.addWorksheet(SHEET_NAME);
      sheet.columns = HEADERS;
      styleHeaderRow(sheet.getRow(1));
    }

    sheet.columns = HEADERS;

    const lastRow = sheet.lastRow;
    const prevRun = lastRow && lastRow.number > 1 ? Number(lastRow.getCell(1).value) || 0 : 0;
    const nextRun = prevRun + 1;

    const row = sheet.addRow({
      run: nextRun,
      policyNumber,
      testName,
      portalType,
      environment,
      dateTime,
    });

    styleDataRow(row, nextRun % 2 === 0);
    sheet.views = [{ state: 'frozen', ySplit: 1 }];

    await workbook.xlsx.writeFile(EXCEL_PATH);
    loggedKeys.add(dedupeKey);
    console.log(`[PolicyTracker][Oliva] Run #${nextRun} | ${policyNumber} | ${environment}`);
  } catch (error) {
    // Never fail a business flow due to tracker IO/write issues.
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`[PolicyTracker][Oliva] Skipped tracker update: ${message}`);
  }
}
