# SIT Environment Setup Checklist

## 1. Node.js & NPM Dependencies

### Required
- **Node.js** (v18+) — TypeScript compilation and test runner
- **npm** (v9+) — package manager

### NPM Packages (from package.json)
```
✓ @playwright/test ^1.49.0     — E2E test framework
✓ @types/node ^22.10.0         — TypeScript Node types
✓ dotenv ^16.4.5               — Environment variable loading
✓ typescript ^5.6.3             — TypeScript compiler
```

**Status:** Run `npm install` to verify all dependencies are installed

---

## 2. Environment Variables (.env file)

### Required for JWT Authentication (SIT Sandbox)
Create a `.env` file in the project root with these variables:

| Variable | Purpose | Required | Note |
|---|---|---|---|
| `SF_BASE_URL` | Sandbox URL (SIT my-domain) | ✓ | Default: `https://dualgroup--sitp.sandbox.my.salesforce.com` (SITP) |
| `SF_JWT_CLIENT_ID` | Connected App Consumer Key | ✓ | From Salesforce org (Connected Apps) |
| `SF_JWT_KEY_PATH` | Path to RSA private key (PEM) | ✓ | Must match the Connected App certificate |
| `SF_JWT_LOGIN_URL` | Token host | ✓ | For sandbox: `https://test.salesforce.com` |
| `SF_JWT_AUD` | JWT audience claim | Optional | Defaults to `SF_JWT_LOGIN_URL` |
| `SF_USERNAME` | UW3 user (primary flow user) | ✓ | User who runs the entire NB flow |
| `SF_UAL_APPROVER_USERNAME` | UW5 approver (for UAL branch only) | ✓ | User for underwriter authority limit approvals |

### Example .env for SIT
```
SF_BASE_URL=https://dualgroup--sit.sandbox.my.salesforce.com
SF_JWT_CLIENT_ID=<your-connected-app-consumer-key>
SF_JWT_KEY_PATH=./path/to/private-key.pem
SF_JWT_LOGIN_URL=https://test.salesforce.com
SF_USERNAME=uw3user@sit.example.com
SF_UAL_APPROVER_USERNAME=uw5approver@sit.example.com
```

---

## 3. Salesforce Org Configuration

### Connected App Setup (SIT Sandbox)
- **Name:** Oliva Playwright Automation
- **Consumer Key:** Generated (populate `SF_JWT_CLIENT_ID`)
- **Certificate:** RSA 256-bit (private key → `SF_JWT_KEY_PATH`)
- **OAuth Scopes:** 
  - `api` (Access and manage your data)
  - `web` (Allow access to your basic information)
  - `refresh_token` (offline access)
- **Authorized Users:** Must include the UW3 and UW5 users (pre-authorized)

### Pre-Required Data in SIT Sandbox
- ✓ **Intermediary Account:** "HOWDEN INSURANCE BROKERS LIMITED" or equivalent
- ✓ **Test Insured:** Client record matching the CARA/CONC/CARP/Reno data definitions
- ✓ **UW3 User:** Must exist with appropriate Oliva permissions
- ✓ **UW5 Approver User:** Must exist with UAL approval permissions
- ✓ **Products:** All test products must be configured:
  - Care Howden
  - Contractors All Risks - Annual (CARA)
  - CONC
  - CARP (Contractors All Risks Pro)
  - Renovation (Reno)
  - JCT
  - CC / CC2
- ✓ **Binders:** All product-specific binders pre-configured
- ✓ **RBS Approval Setup:** RBS records configured for each product

---

## 4. Playwright Configuration

### File: `playwright.config.ts`
Current configuration:
```typescript
baseURL: process.env.SF_BASE_URL ?? 'https://dualgroup--sitp.sandbox.my.salesforce.com'
timeout: 30 * 60 * 1000  // 30 minutes
workers: 1                // Single worker (no parallelism)
fullyParallel: false      // Sequential execution
```

### For SIT Adjustment
If using a different SIT environment URL, update the environment variable:
```bash
export SF_BASE_URL="https://dualgroup--sit.sandbox.my.salesforce.com"
```

---

## 5. TypeScript Configuration

### File: `tsconfig.json`
✓ Already configured with:
- Target: ES2022
- Module: CommonJS
- Strict mode: enabled
- Path resolution: node

**No changes needed** — configuration is ready for SIT

---

## 6. Test Data & Selectors

### Selector Map
- **File:** `docs/selector-map.md`
- **Status:** Last verified 03/07/2026 on SITP sandbox
- **Action Required for SIT:** 
  - If SIT has a different layout/org configuration, verify selectors against actual SIT environment
  - Selectors may drift if SIT has custom page layouts

### Test Data Files
All data constants are defined in `src/data/`:
- `caraData.ts` — Contractors All Risks data
- `carpData.ts` — CARP product data
- `cc2Data.ts` — CC2 product data
- `ccData.ts` — CC product data
- `jctData.ts` — JCT product data
- `renoData.ts` — Renovation product data
- `renoTypes.ts` — Shared types for Reno-derived flows
- `testdata.ts` — Global test constants (CNR, MTA, CANCELLATION, etc.)

**Action Required:** Verify test data accounts, clients, and product names match SIT org

---

## 7. Required Playwright Browsers

### Installation
Run after npm install:
```bash
npx playwright install chromium
```

The project is configured for **Chromium only** (see `playwright.config.ts`)

---

## 8. Authentication Flow (JWT Bearer)

### How It Works
1. Runtime loads `.env` variables
2. `src/auth/sfJwt.ts` mints a JWT token using `SF_JWT_CLIENT_ID` and `SF_JWT_KEY_PATH`
3. Token is exchanged for an access token via `SF_JWT_LOGIN_URL`
4. Playwright logs in via `frontdoor.jsp?sid=<access_token>` (no password/MFA)
5. Session is reused for the entire test

### Required for SIT
- RSA private key file must exist and be readable
- Connected App must be active and pre-authorized for both UW3 and UW5 users
- JWT expiry: 180 seconds per token (self-renewing)

---

## 9. Scripts & Commands

### Available npm Scripts
```bash
npm test              # Headless mode (no UI)
npm run test:headed   # Headed mode (visible browser)
npm run test:debug    # Debug mode (step through with inspector)
npm run report        # View HTML test report
npm run typecheck     # Type-check without running tests
```

### For SIT Testing
```bash
# Run specific test
npm test -- tests/oliva-cara-other-flow.spec.ts

# Run with specific environment
SF_BASE_URL=https://dualgroup--sit.sandbox.my.salesforce.com npm test

# Run single test (by name)
npm test -- --grep "create Contractors All Risks"
```

---

## 10. Dependency Summary Table

| Component | Type | Status | Notes |
|---|---|---|---|
| Node.js 18+ | Runtime | ✓ Must install | Required for npm & TypeScript |
| @playwright/test | Framework | ✓ npm install | Installed via package.json |
| chromium | Browser | ✓ npx playwright install | Installed separately |
| TypeScript | Transpiler | ✓ npm install | Installed via package.json |
| dotenv | Config | ✓ npm install | Loads .env variables |
| Connected App (SIT) | Salesforce | ⚠ Must configure | See section 3 |
| RSA Private Key | Auth | ⚠ Must provide | Matches Connected App cert |
| .env file | Config | ⚠ Must create | See section 2 |
| Test Data | Org Data | ⚠ Must verify | Accounts, clients, users in SIT |
| Selectors | Locators | ⚠ Verify for SIT | May need updates if layout differs |

---

## 11. Pre-Flight Checklist Before Running Tests

- [ ] Node.js v18+ installed: `node --version`
- [ ] npm v9+ installed: `npm --version`
- [ ] Dependencies installed: `npm install` (no errors)
- [ ] Chromium installed: `npx playwright install chromium`
- [ ] `.env` file created with all required variables
- [ ] `SF_JWT_KEY_PATH` file exists and is readable
- [ ] SIT Salesforce org has Connected App configured and active
- [ ] UW3 and UW5 users pre-authorized on Connected App
- [ ] Test data accounts/clients exist in SIT org
- [ ] All products configured in SIT org
- [ ] TypeScript compiles: `npm run typecheck` (no errors)
- [ ] Can generate JWT token: `node scripts/sf-jwt-login.js` (outputs JSON with access_token)

---

## 12. Troubleshooting

### Common Issues

| Issue | Solution |
|---|---|
| `SF_JWT_CLIENT_ID is not set` | Add `SF_JWT_CLIENT_ID` to `.env` |
| `ENOENT: no such file or directory, open './path/to/key.pem'` | Verify `SF_JWT_KEY_PATH` points to actual private key file |
| JWT auth fails with 400/401 | Check Connected App is active; verify client ID/key match |
| Playwright timeouts on SIT | SIT may be slower — currently set to 30 min. Increase if needed |
| Selectors not found | SIT layout may differ — update `docs/selector-map.md` and page object locators |
| UAL branch not triggering | Check UW5 approver user exists; may not trigger if within authority limits |

---

## Next Steps

1. Install Node.js (if not present)
2. Run `npm install` in project root
3. Run `npx playwright install chromium`
4. Create `.env` file with SIT-specific values
5. Configure Connected App in SIT org
6. Verify test data exists in SIT
7. Run `npm run typecheck` to verify TypeScript
8. Run `npm test -- tests/oliva-cara-other-flow.spec.ts` to execute a test
