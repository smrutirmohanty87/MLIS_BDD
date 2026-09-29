import { defineConfig, devices } from '@playwright/test';
import { defineBddConfig } from 'playwright-bdd';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const testDir = defineBddConfig({
  features: 'tests/BDD/features/**/*.feature',
  steps: 'tests/BDD/steps/**/*.ts',
  outputDir: 'tests/BDD/.features-gen',
});

const isCI = Boolean((globalThis as { process?: { env?: { CI?: string } } }).process?.env?.CI);

export default defineConfig({
  testDir,
  timeout: 900000,
  fullyParallel: false,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: 1,
  reporter: [
    ['line'],
    ['html', { open: 'never' }],
    ['allure-playwright', { outputFolder: 'allure-results', detail: true, suiteTitle: false }],
    ['./src/reporters/dashboard-reporter.ts', { outputDir: 'reports/dashboard', open: true, maxRuns: 40 }],
    ['./src/reporters/historical-reporter.ts', { outputDir: 'reports/historical' }],
  ],
  use: {
    headless: true,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'chrome',
      use: {
        ...devices['Desktop Chrome'],
        channel: 'chrome',
      },
    },
    {
      name: 'edge',
      use: {
        ...devices['Desktop Edge'],
        channel: 'msedge',
      },
    },
  ],
});
