# Agentic AI MLIS Test Automation Framework

## Overview

Enterprise-grade Playwright + TypeScript test automation framework for end-to-end testing of the **MLIS (Multi-Line Insurance System)** platform. The framework covers policy creation, mid-term adjustments, cancellations, BDX reporting, and the Salesforce integration layer across **UAT2** and **SIT2** environments.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Installation](#installation)
3. [Environment Configuration](#environment-configuration)
4. [Project Structure](#project-structure)
5. [Page Object Models](#page-object-models)
6. [Test Suites](#test-suites)
7. [Running Tests Locally](#running-tests-locally)
8. [Multi-Environment Support](#multi-environment-support)
9. [Available NPM Scripts](#available-npm-scripts)
10. [Helper Scripts](#helper-scripts)
11. [CI/CD Pipelines](#cicd-pipelines)
12. [Viewing Reports](#viewing-reports)
13. [Troubleshooting](#troubleshooting)
14. [Contributing](#contributing)

---

## Prerequisites

Ensure the following are installed on your machine before setting up the framework.

| Tool | Minimum Version | Download |
|------|----------------|---------|
| **Node.js** | 18.x (LTS) or 24.x | [nodejs.org](https://nodejs.org) |
| **npm** | 9.x+ (bundled with Node) | — |
| **Git** | Any recent version | [git-scm.com](https://git-scm.com) |
| **Google Chrome** | Latest stable | [google.com/chrome](https://www.google.com/chrome) |
| **Microsoft Edge** | Latest stable (optional) | Pre-installed on Windows |

> **Note:** The framework is primarily validated on **Windows 10/11** with PowerShell 5.1+. It also runs on macOS and Linux via the Bash helper scripts.

---

## Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd Agentic-AI-MLIS-Framework
```

### 2. Install Node Dependencies

```bash
npm ci
```

> Use `npm ci` (not `npm install`) to ensure a reproducible install matching the exact locked versions in `package-lock.json`.

### 3. Install Playwright Browsers

```bash
npx playwright install --with-deps
```

This installs Chromium, Chrome, and Edge browser binaries along with all required OS-level dependencies.

### 4. Verify Installation

```bash
node --version        # Should be 18.x or 24.x
npx playwright --version
```

---

## Environment Configuration

The framework uses a `.env` file at the project root to store environment-specific credentials and URLs. This file is **not committed to source control** — you must create it manually.

### Step 1: Create the `.env` File

Create a file named `.env` in the project root with the following structure:

```dotenv
# ============================================================
# UAT1 Environment (UAT1_* prefixed keys)
# ============================================================
UAT1_MLIS_PORTAL_URL=https://dualgroup--uat1.sandbox.my.site.com/mlisportal/
UAT1_SALESFORCE_LIGHTNING_URL=https://dualgroup--uat1.sandbox.my.salesforce.com/
UAT1_BROKER_USERNAME=t-0111-mlis-uw-default-automated@mlis.uat1
UAT1_BROKER_PASSWORD=<set-in-local-.env-or-pipeline-secret>
UAT1_SALESFORCE_USERNAME=t-0116-mlis-uw-enhance-automated@mlis.uat1
UAT1_SALESFORCE_PASSWORD=<set-in-local-.env-or-pipeline-secret>
SALEFORCE_UAT1_NO_COMM_BROKERUSER=t-0111-mlis-uw-default-automated@mlis.uat1
SALEFORCE_UAT1_NO_COMM_BROKERPASSWORD=<set-in-local-.env-or-pipeline-secret>
SALEFORCE_UAT1_ENHANCEDUSER=t-0116-mlis-uw-enhance-automated@mlis.uat1
SALEFORCE_UAT1_ENHANCEDUSER_PASSWORD=<set-in-local-.env-or-pipeline-secret>

# ============================================================
# ACTIVE ENVIRONMENT: UAT2 (unprefixed keys)
# ============================================================
MLIS_PORTAL_URL=https://dualgroup--uat2.sandbox.my.site.com/mlisportal/
SALESFORCE_LIGHTNING_URL=https://dualgroup--uat2.sandbox.my.salesforce.com/
BROKER_USERNAME=your.broker.username@dualgroup.com
BROKER_PASSWORD=your-broker-password
SALESFORCE_USERNAME=your-sf-username@mlis.uat2
SALESFORCE_PASSWORD=your-sf-password

# ============================================================
# SIT2 Environment (SIT2_* prefixed keys)
# ============================================================
SIT2_MLIS_PORTAL_URL=https://dualgroup--sitp.sandbox.my.site.com/mlisportal/broker-zone
SIT2_SALESFORCE_LIGHTNING_URL=https://dualgroup--sitp.sandbox.lightning.force.com/
SIT2_BROKER_USERNAME=your.broker.username@dualgroup.com
SIT2_BROKER_PASSWORD=your-sit2-broker-password
SIT2_SALESFORCE_USERNAME=your-sf-username@mlis.sit2
SIT2_SALESFORCE_PASSWORD=your-sit2-sf-password
```

### Step 2: Understanding Environment Variable Naming

| Environment | Variable Prefix | Example |
|-------------|----------------|---------|
| UAT1 | `UAT1_` | `UAT1_MLIS_PORTAL_URL` |
| UAT2 (default) | *(none)* | `MLIS_PORTAL_URL` |
| SIT2 | `SIT2_` | `SIT2_MLIS_PORTAL_URL` |

The environment resolver in `src/config/envManager.ts` reads the `TEST_ENV` shell variable at runtime and picks the correct credential set automatically.

### Step 3: Selecting the Active Environment at Runtime

```powershell
# PowerShell (Windows) — run before any test command
$env:TEST_ENV = 'UAT1'   # uses UAT1_* prefixed keys
$env:TEST_ENV = 'UAT2'   # default; uses unprefixed .env keys
$env:TEST_ENV = 'SIT2'   # uses SIT2_* prefixed .env keys
```

```bash
# Bash (macOS / Linux)
export TEST_ENV=UAT1
export TEST_ENV=UAT2
export TEST_ENV=SIT2
```

When `TEST_ENV` is not set, the framework defaults to **UAT2**.

---

## Project Structure

```
Agentic-AI-MLIS-Framework/
├── src/
│   ├── config/
│   │   ├── env.ts                  # Public config exports (URLs, credentials)
│   │   └── envManager.ts           # Multi-environment resolver (UAT2 / SIT2)
│   ├── pages/                      # Page Object Models (POM)
│   │   ├── mlis-portal.ts          # MLIS portal — base / residential EW
│   │   ├── mlis-portal-commercial.ts      # Commercial EW flows
│   │   ├── mlis-portal-ni.ts              # Residential NI flows
│   │   ├── mlis-portal-ni-commercial.ts   # Commercial NI flows
│   │   ├── mlis-portal-scotland.ts        # Residential Scotland flows
│   │   ├── mlis-portal-scotland-commercial.ts  # Commercial Scotland flows
│   │   ├── broker-portal-policy.ts        # Broker portal interactions
│   │   ├── salesforce-cancellation.ts     # Salesforce MTA / cancellation flows
│   │   └── salesforce-notes-attachments-ew.ts  # Notes & attachments
│   └── reporters/
│       └── dashboard-reporter.ts   # Custom HTML dashboard reporter
├── tests/
│   ├── sanity/                     # 12 smoke/sanity test specs
│   ├── regression/                 # 19 regression test specs
│   ├── BDX/                        # 6 BDX bordereau test specs
│   └── test-data/                  # Shared test data files
├── scripts/
│   ├── run-sanity-tests.ps1        # PowerShell sanity runner
│   ├── run-sanity-tests.sh         # Bash sanity runner
│   ├── run-regression-tests.ps1    # PowerShell regression runner
│   ├── run-regression-tests.sh     # Bash regression runner
│   ├── run-bdx-tests.ps1           # PowerShell BDX runner
│   ├── run-bdx-tests.sh            # Bash BDX runner
│   ├── autonomous-run.js           # Autonomous orchestrator script
│   └── generate-test-doc.js        # Regenerates Test_Cases_Documentation.csv
├── performance/                    # Artillery load test configs
├── reports/
│   ├── dashboard/                  # Custom dashboard HTML output
│   └── bugs/                       # Auto-generated bug reports
├── playwright-report/              # Playwright HTML test report
├── test-results/                   # Raw test artefacts (screenshots, traces, videos)
├── playwright.config.ts            # Playwright configuration
├── package.json                    # Dependencies and NPM scripts
├── .env                            # Local secrets (NOT in source control)
├── pipelines/                      # CI/CD pipeline definitions (Azure DevOps, Jenkins, GitLab)
├── docs/                           # Framework documentation and test-plans
│   ├── guides/                     # User-facing documentation
│   └── test-plans/                 # Test case and plan documents
└── README.md                       # Main project overview
```

---

## Page Object Models

All UI interactions are encapsulated in the `src/pages/` layer. Tests import page objects directly — no raw `page.locator()` calls in spec files.

| File | Responsibility |
|------|---------------|
| `mlis-portal.ts` | Base MLIS portal actions; residential EW policy creation, quick quote |
| `mlis-portal-commercial.ts` | Commercial EW product selection and policy creation |
| `mlis-portal-ni.ts` | Residential NI (Northern Ireland) policy flows |
| `mlis-portal-ni-commercial.ts` | Commercial NI flows |
| `mlis-portal-scotland.ts` | Residential Scotland flows |
| `mlis-portal-scotland-commercial.ts` | Commercial Scotland flows |
| `broker-portal-policy.ts` | Broker portal — bind, refer, view policy |
| `salesforce-cancellation.ts` | Salesforce MTA (mid-term adjustment), Cancel & Reissue, cancellation, BDX view |
| `salesforce-notes-attachments-ew.ts` | Salesforce Notes & Attachments tab interactions |

---

## Test Suites

### Sanity Tests (12 tests) — `tests/sanity/`

Quick smoke tests for the most critical user journeys. Target runtime: **30–45 minutes**.

| ID | File | Description |
|----|------|-------------|
| TC_SAN_001 | `TC_SAN_001_create_commercial_ew_policy_multiple_products.spec.ts` | Create commercial EW policy with multiple products |
| TC_SAN_002 | `TC_SAN_002_create_commercial_ew_policy_multiple_products_via_referral.spec.ts` | Commercial EW policy via referral |
| TC_SAN_003 | `TC_SAN_003_create_commercial_ew_policy_single_product.spec.ts` | Create commercial EW single-product policy |
| TC_SAN_004 | `TC_SAN_004_create_commercial_ew_policy_single_product_via_referral.spec.ts` | Commercial EW single product via referral |
| TC_SAN_005 | `TC_SAN_005_complete_full_commercial_ew_quote_journey.spec.ts` | Full commercial EW quote-to-bind journey |
| TC_SAN_006 | `TC_SAN_006_complete_full_residential_ew_quote_journey.spec.ts` | Full residential EW quote-to-bind journey |
| TC_SAN_007 | `TC_SAN_007_complete_full_residential_ew_multiple_products_quote_journey.spec.ts` | Residential EW multiple products quote journey |
| TC_SAN_008 | `TC_SAN_008_cancel_from_inception_full_premium_return.spec.ts` | Cancel from inception with full premium return |
| TC_SAN_009 | `TC_SAN_009_residential_quick_quote_ew_single_product_email_quotes.spec.ts` | Residential quick quote — single product, email |
| TC_SAN_010 | `TC_SAN_010_residential_quick_quote_ew_multiple_products_email_quotes.spec.ts` | Residential quick quote — multiple products, email |
| TC_SAN_011 | `TC_SAN_011_residential_quick_quote_scotland_single_product_enter_manual_email_quotes.spec.ts` | Scotland residential quick quote — single product |
| TC_SAN_012 | `TC_SAN_012_residential_quick_quote_scotland_multiple_products_enter_manual_email_quotes_slow.spec.ts` | Scotland residential quick quote — multiple products |

### Regression Tests (19 tests) — `tests/regression/`

Full functional test coverage across all modules. Target runtime: **90–120 minutes**.

| ID | File | Description |
|----|------|-------------|
| TC_REG_001 | `TC_REG_001_create_commercial_ni_policy_multiple_products.spec.ts` | Commercial NI — multiple products |
| TC_REG_002 | `TC_REG_002_create_commercial_ni_policy_single_product.spec.ts` | Commercial NI — single product |
| TC_REG_003 | `TC_REG_003_create_commercial_scotland_policy_multiple_products.spec.ts` | Commercial Scotland — multiple products |
| TC_REG_004 | `TC_REG_004_create_commercial_scotland_policy_single_product.spec.ts` | Commercial Scotland — single product |
| TC_REG_005 | `TC_REG_005_create_residential_ew_policy_multiple_products.spec.ts` | Residential EW — multiple products |
| TC_REG_006 | `TC_REG_006_create_residential_ew_policy_single_product.spec.ts` | Residential EW — single product |
| TC_REG_007 | `TC_REG_007_create_residential_ni_policy_multiple_products.spec.ts` | Residential NI — multiple products |
| TC_REG_008 | `TC_REG_008_create_residential_ni_policy_single_product.spec.ts` | Residential NI — single product |
| TC_REG_009 | `TC_REG_009_create_residential_scotland_policy_multiple_products.spec.ts` | Residential Scotland — multiple products |
| TC_REG_010 | `TC_REG_010_create_residential_scotland_policy_single_product.spec.ts` | Residential Scotland — single product |
| TC_REG_011 | `TC_REG_011_open_notes_attachments_salesforce_ew_policy.spec.ts` | Notes & attachments — residential EW |
| TC_REG_012 | `TC_REG_012_open_notes_attachments_salesforce_commercial_ew_policy.spec.ts` | Notes & attachments — commercial EW |
| TC_REG_013 | `TC_REG_013_open_notes_attachments_salesforce_commercial_scotland_policy.spec.ts` | Notes & attachments — commercial Scotland |
| TC_REG_014 | `TC_REG_014_create_mta_mid_term_adjustment.spec.ts` | Mid-term adjustment (MTA) on live policy |
| TC_REG_015 | `TC_REG_015_cancel_and_reissue_live_policy.spec.ts` | Cancel & Reissue on a live policy |
| TC_REG_016 | `TC_REG_016_create_mta_then_cancel_policy.spec.ts` | MTA → Cancel |
| TC_REG_017 | `TC_REG_017_create_mta_then_cancel_and_reissue.spec.ts` | MTA → Cancel & Reissue |
| TC_REG_018 | `TC_REG_018_create_mta_then_cancel_and_reissue_then_cancel_policy.spec.ts` | MTA → Cancel & Reissue → Cancel |
| TC_REG_019 | `TC_REG_019_create_cancel_and_reissue_then_cancel_policy.spec.ts` | Cancel & Reissue → Cancel (no MTA) |

### BDX Tests (6 tests) — `tests/BDX/`

Bordereau-specific scenarios that validate Salesforce BDX line entries and reporting. Target runtime: **45–60 minutes**.

| ID | File | Description |
|----|------|-------------|
| TC_BDX_001 | `TC_BDX_001_INTRO_cancel_full_premium_return.spec.ts` | INTRO cancellation with full premium return; assert BDX lines |
| TC_BDX_002 | `TC_BDX_002_INTER_COMM_policy_bdx_lines.spec.ts` | INTER commercial policy BDX lines |
| TC_BDX_003 | `TC_BDX_003_BDE_COMM_policy_bdx_lines.spec.ts` | BDE commercial policy BDX lines |
| TC_BDX_004 | `TC_BDX_004_NO_COMM_policy_bdx_lines.spec.ts` | No-commission policy BDX lines |
| TC_BDX_005 | `TC_BDX_005_NB_MTA_Cancellation_mid_term_adjustment.spec.ts` | New policy → MTA (premium adjustment) → Cancel |
| TC_BDX_006 | `TC_BDX_006_BDE_new_cancel_and_reissue_then_cancel_policy.spec.ts` | New policy → Cancel & Reissue → Cancel; assert BDX lines + screenshot |

---

## Running Tests Locally

### Run a Single Test (Recommended for Debugging)

```powershell
# PowerShell — run one spec on Chrome, headed, single worker
npx playwright test "tests/sanity/TC_SAN_001_create_commercial_ew_policy_multiple_products.spec.ts" --headed --project=chrome --workers=1 --reporter=list
```

### Run an Entire Suite

```bash
# All sanity tests
npm run test:sanity:chrome

# All regression tests
npm run test:regression:chrome

# All BDX tests
npm run test:bdx:all:chrome
```

### Run with a Specific Environment

```powershell
# PowerShell
$env:TEST_ENV = 'SIT2'
npx playwright test "tests/BDX/TC_BDX_006_BDE_new_cancel_and_reissue_then_cancel_policy.spec.ts" --headed --project=chrome --workers=1

$env:TEST_ENV = 'UAT2'
npx playwright test "tests/regression/TC_REG_014_create_mta_mid_term_adjustment.spec.ts" --headed --project=chrome --workers=1
```

```bash
# Bash
TEST_ENV=SIT2 npx playwright test tests/BDX/TC_BDX_006_BDE_new_cancel_and_reissue_then_cancel_policy.spec.ts --headed --project=chrome --workers=1
```

### Useful CLI Flags

| Flag | Effect |
|------|--------|
| `--headed` | Run with browser UI visible (useful for debugging) |
| `--project=chrome` | Limit to Chrome only |
| `--project=chromium` | Limit to Chromium only |
| `--project="Microsoft Edge"` | Limit to Edge only |
| `--workers=1` | Disable parallelism (required for Salesforce tests) |
| `--reporter=list` | Print results line-by-line in terminal |
| `--debug` | Step through test with Playwright Inspector |
| `--retries=2` | Retry failing tests up to 2 times |

---

## Multi-Environment Support

The framework supports switching between **UAT1**, **UAT2**, and **SIT2** environments at runtime without modifying any code.

### How It Works

1. `src/config/envManager.ts` reads `process.env.TEST_ENV` at startup.
2. If `TEST_ENV=UAT1`, it reads **`UAT1_`-prefixed** `.env` keys (e.g., `UAT1_MLIS_PORTAL_URL`).
3. If `TEST_ENV=UAT2` (or unset in legacy setup), it reads **unprefixed** `.env` keys (e.g., `MLIS_PORTAL_URL`).
4. If `TEST_ENV=SIT2`, it reads **`SIT2_`-prefixed** `.env` keys (e.g., `SIT2_MLIS_PORTAL_URL`).
5. The resolved config is cached for the duration of the test run and logged as: `Running tests in <ENV> environment`.

### Adding a New Environment

To add a third environment (e.g., UAT3):

1. Add `UAT3_*` prefixed keys to `.env`:
   ```dotenv
   UAT3_MLIS_PORTAL_URL=https://...
   UAT3_SALESFORCE_LIGHTNING_URL=https://...
   UAT3_BROKER_USERNAME=...
   UAT3_BROKER_PASSWORD=...
   UAT3_SALESFORCE_USERNAME=...
   UAT3_SALESFORCE_PASSWORD=...
   ```
2. Set `$env:TEST_ENV = 'UAT3'` before running tests.

No code changes are needed — `envManager.ts` resolves any prefix automatically.

---

## Available NPM Scripts

```bash
npm test                          # Run all tests (all browsers, parallel)
npm run test:sanity               # Sanity suite — all browsers
npm run test:sanity:chrome        # Sanity suite — Chrome
npm run test:sanity:chromium      # Sanity suite — Chromium
npm run test:sanity:edge          # Sanity suite — Edge
npm run test:regression           # Regression suite — all browsers
npm run test:regression:chrome    # Regression suite — Chrome
npm run test:regression:chromium  # Regression suite — Chromium
npm run test:regression:edge      # Regression suite — Edge
npm run test:bdx:all              # All BDX tests — all browsers
npm run test:bdx:all:chrome       # All BDX tests — Chrome
npm run test:bdx:intro            # BDX INTRO scenario only
npm run test:bdx:intro:chrome     # BDX INTRO — Chrome
npm run test:bdx:rest             # BDX REST scenarios (002–004)
npm run test:bdx:rest:chrome      # BDX REST — Chrome
npm run autonomous:run            # Autonomous test orchestrator

# Oliva automation (isolated nested project)
npm run oliva:install             # Install nested Oliva dependencies
npm run oliva:test                # Run Oliva tests (headless)
npm run oliva:test:headed         # Run Oliva tests headed
npm run oliva:test:debug          # Run Oliva in Playwright debug mode
npm run oliva:report              # Open Oliva HTML report
npm run oliva:typecheck           # Type-check Oliva TypeScript
```

Oliva commands run only inside `oliva-automation/oliva-automation` and do not change MLIS test discovery/configuration.
See `docs/guides/OLIVA-AUTOMATION-INTEGRATION.md` for setup details.

---

## Helper Scripts

### PowerShell (Windows)

```powershell
.\scripts\run-sanity-tests.ps1 -Browser chrome
.\scripts\run-regression-tests.ps1 -Browser chrome
.\scripts\run-bdx-tests.ps1 -TestType all
```

### Bash (macOS / Linux)

```bash
./scripts/run-sanity-tests.sh chrome
./scripts/run-regression-tests.sh chrome
./scripts/run-bdx-tests.sh all
```

### Regenerate Test Case Documentation

```bash
node scripts/generate-test-doc.js
```

This regenerates `docs/test-plans/Test_Cases_Documentation.csv` from the source data in the script.

---

## CI/CD Pipelines

### Azure DevOps

Configuration: `pipelines/azure-pipelines.yml`

```yaml
trigger:
  - main

pool:
  vmImage: 'ubuntu-latest'

steps:
  - task: NodeTool@0
    inputs:
      versionSpec: '18.x'
  - script: npm ci
  - script: npx playwright install --with-deps
  - script: npm run test:sanity:chrome
    env:
      TEST_ENV: UAT2
      MLIS_PORTAL_URL: $(MLIS_PORTAL_URL)
      SALESFORCE_LIGHTNING_URL: $(SALESFORCE_LIGHTNING_URL)
      BROKER_USERNAME: $(BROKER_USERNAME)
      BROKER_PASSWORD: $(BROKER_PASSWORD)
      SALESFORCE_USERNAME: $(SALESFORCE_USERNAME)
      SALESFORCE_PASSWORD: $(SALESFORCE_PASSWORD)
```

Store all credentials as **pipeline secret variables** in Azure DevOps — never commit them to the YAML file.

### Jenkins

Configuration: `pipelines/Jenkinsfile`

See [PIPELINE.md](PIPELINE.md) for the full Jenkins setup.

### GitHub Actions

See [PIPELINE.md](PIPELINE.md) for workflow file examples.

> **Security note:** Always pass credentials as pipeline secret variables / environment secrets. The `.env` file is for local development only and must remain in `.gitignore`.

---

## Viewing Reports

### Playwright HTML Report (local)

After any test run, open the HTML report:

```powershell
# Windows
npx playwright show-report

# Or open directly
start playwright-report\index.html
```

```bash
# macOS / Linux
npx playwright show-report
# or
open playwright-report/index.html
```

### Custom Dashboard Report

The custom reporter writes to `reports/dashboard/index.html` and opens automatically after a local run. It tracks the last **40 test runs** with pass/fail trends.

### Trace Viewer (debugging failures)

When a test fails, a trace file is saved to `test-results/`. To inspect it:

```bash
npx playwright show-trace test-results/<test-folder>/trace.zip
```

The trace viewer shows a step-by-step timeline with DOM snapshots, network calls, and console logs.

### Artefacts on Failures

The framework automatically captures on test failure:
- **Screenshot** — saved to `test-results/<test>/attachments/`
- **Video** — saved alongside the screenshot
- **Trace file** — for deep step-level debugging

---

## Troubleshooting

### "Missing MLIS_PORTAL_URL" error

Your `.env` file is missing or the variable name doesn't match. Check:
- The file is named exactly `.env` (not `.env.txt`)
- Keys for the active environment are present (unprefixed for UAT2, `SIT2_*` for SIT2)
- No spaces around the `=` sign

### "Malformed value" on date fields

Salesforce `input[type=date]` fields require **ISO format** (`yyyy-MM-dd`). The framework handles this automatically in `bindMTA()` — if you see this error, ensure you are on the latest version of `salesforce-cancellation.ts`.

### Tests fail on CI but pass locally

1. Confirm all required environment variables are set as pipeline secrets.
2. Set `--workers=1` — Salesforce tests are not safe to run in parallel.
3. Remove `--headed` flag for CI runs (headless is the default).
4. Check that `npx playwright install --with-deps` was executed in the pipeline.

### "Browser not found" error

```bash
npx playwright install --with-deps
```

Run this again — browser binaries may not have been installed or may have been cleaned up.

### Slow or timing-out tests

- Use `--workers=1` to serialise execution and avoid race conditions.
- Check network connectivity to the target environment URL.
- Increase timeouts in `playwright.config.ts` if the application under test is genuinely slow.

### Port/proxy issues (corporate network)

If you are behind a corporate proxy, set the proxy in your shell before running tests:

```powershell
$env:HTTPS_PROXY = 'http://proxy.example.com:8080'
$env:NO_PROXY = 'localhost,127.0.0.1'
```

---

## Contributing

1. Create a feature branch from `main`.
2. Add or update specs in the appropriate suite folder (`sanity/`, `regression/`, or `BDX/`).
3. Follow the naming convention: `TC_<SUITE>_<NNN>_<description>.spec.ts`.
4. Add new page actions to the relevant file in `src/pages/` — never use raw locators in spec files.
5. Run the affected test suite locally against both UAT2 and SIT2 before opening a PR.
6. Update `Test_Cases_Documentation.csv` via `node scripts/generate-test-doc.js`.
7. Open a pull request with a clear description of the change.

---

## Additional Documentation

| Document | Purpose |
|----------|---------|
| [TEST-SUITES-GUIDE.md](docs/guides/TEST-SUITES-GUIDE.md) | Detailed per-test documentation and expected outcomes |
| [BDX-TESTS-GUIDE.md](docs/guides/BDX-TESTS-GUIDE.md) | BDX bordereau test deep-dive |
| [PIPELINE.md](docs/guides/PIPELINE.md) | Full CI/CD pipeline setup for Azure DevOps, Jenkins, GitHub Actions |
| [PIPELINE-SETUP-SUMMARY.md](docs/guides/PIPELINE-SETUP-SUMMARY.md) | Quick-reference pipeline summary |
5. Wait for CI/CD validation

## Support

- **Issues:** Create GitHub issue with test failure details
- **Reports:** Check `reports/bugs/` for known issues
- **Documentation:** See guides in root directory

## License

ISC

---

**Framework Version:** 1.0.0  
**Last Updated:** April 2026  
**Playwright Version:** 1.58.2
