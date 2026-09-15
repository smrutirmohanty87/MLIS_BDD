# BDX Tests - Quick Reference Guide

## Test Scenarios

### BDX Test Cases
1. **TC_BDX_001** - INTRO: Cancel with full premium return
2. **TC_BDX_002** - INTER COMM: Policy BDX lines
3. **TC_BDX_003** - BDE COMM: Policy BDX lines
4. **TC_BDX_004** - NO COMM: Policy BDX lines

## Running Tests Locally

### Individual Scenarios
```bash
# Run INTRO scenario only
npm run test:bdx:intro

# Run REST scenarios (002, 003, 004)
npm run test:bdx:rest

# Run all BDX tests
npm run test:bdx:all
```

### Browser-Specific
```bash
# Chrome only
npm run test:bdx:intro:chrome
npm run test:bdx:rest:chrome
npm run test:bdx:all:chrome
```

### Using Scripts

**PowerShell (Windows):**
```powershell
# Run specific test type
.\scripts\run-bdx-tests.ps1 -TestType intro
.\scripts\run-bdx-tests.ps1 -TestType rest
.\scripts\run-bdx-tests.ps1 -TestType all
```

**Bash (Linux/Mac):**
```bash
# Run specific test type
./scripts/run-bdx-tests.sh intro
./scripts/run-bdx-tests.sh rest
./scripts/run-bdx-tests.sh all
```

## CI/CD Execution

### GitHub Actions
**Automatic Triggers:**
- Push to main/master/develop
- Pull requests
- Changes to BDX tests or source code

**Manual Trigger:**
1. Go to: Actions → BDX Tests → Run workflow
2. Select test type: `intro`, `rest`, or `all`
3. Click "Run workflow"

### Azure DevOps
**Setup:**
1. Import `pipelines/azure-pipelines.yml`
2. Configure pipeline in Azure DevOps
3. Pipeline runs automatically on commits

### Jenkins
**Setup:**
1. Import `pipelines/Jenkinsfile`
2. Configure Jenkins job
3. Parameters available:
   - TEST_TYPE: intro, rest, all
   - BROWSER: chrome, chromium, msedge, all

### GitLab CI
**Setup:**
1. `pipelines/.gitlab-ci.yml` (point the GitLab CI/CD config path at this file)
2. Pipeline runs on push/MR
3. Manual pipeline trigger available in GitLab UI

## Test Reports

### Generated Artifacts
- **HTML Report**: `playwright-report/index.html`
- **Test Results**: `test-results/`
- **Dashboard**: `reports/dashboard/index.html`
- **JSON Reports**: `reports/playwright-results-*.json`

### Viewing Reports Locally
```bash
# Open HTML report (Windows)
start playwright-report/index.html

# Open HTML report (Mac)
open playwright-report/index.html

# Open HTML report (Linux)
xdg-open playwright-report/index.html
```

## Environment Variables

```bash
# CI mode (enables retries and specific settings)
CI=true

# Limit parallel workers
PLAYWRIGHT_WORKERS=1

# Set environment
NODE_ENV=production
```

## Debugging Failed Tests

### View Screenshots
```
test-results/[test-name]/attachments/screenshot-*.png
```

### View Videos
```
test-results/[test-name]/attachments/video-*.webm
```

### View Traces
```bash
npx playwright show-trace test-results/[test-name]/trace.zip
```

## Common Issues

### Tests Passing Locally but Failing in CI
1. Check CI environment variables
2. Verify browser installation
3. Review timeout settings
4. Check for timing-dependent assertions

### Slow Test Execution
1. Reduce parallel workers: `PLAYWRIGHT_WORKERS=1`
2. Split tests across multiple jobs
3. Use specific browser instead of all

### Artifact Upload Failures
1. Verify artifact paths exist
2. Check artifact size limits
3. Ensure proper permissions

## Best Practices

✅ **DO:**
- Run `test:bdx:intro` separately for INTRO scenario
- Use `test:bdx:rest` for other 3 scenarios together
- Check reports after each run
- Keep artifacts for failed tests

❌ **DON'T:**
- Modify test logic in pipeline scripts
- Run all tests in parallel in CI (use workers=1)
- Skip artifact collection
- Ignore timeout warnings

## Quick Commands Cheat Sheet

```bash
# Local development
npm run test:bdx:intro              # INTRO only
npm run test:bdx:rest               # Other 3 scenarios
npm run test:bdx:all                # All BDX tests

# Browser-specific
npm run test:bdx:intro:chrome       # INTRO on Chrome
npm run test:bdx:rest:chrome        # Others on Chrome
npm run test:bdx:all:chrome         # All on Chrome

# All test suites
npm run test:sanity                 # Sanity tests
npm run test:regression             # Regression tests
npm test                            # All tests

# PowerShell script
.\scripts\run-bdx-tests.ps1 -TestType all

# Bash script
./scripts/run-bdx-tests.sh all
```

## Support & Documentation

- Full documentation: [PIPELINE.md](PIPELINE.md)
- Test plans: `tests/*.plan.md`
- Bug reports: `reports/bugs/`
- Dashboard: `reports/dashboard/index.html`
