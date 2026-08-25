# Oliva NB Care Howden — Playwright E2E Automation

Automates the full **New Business policy creation** flow for the Care Howden product in the
DUAL Oliva platform (Salesforce SITP sandbox), end to end:

login → intermediary account → Oliva submission wizard → quote → coverages (insurable ×3 +
product level) → risk locations → premiums → binder selection → RBS approval → clauses →
fee → ERN → **conditional UAL approval** → quote issued → sanction check → bound →
policy creation → policy assertions.

Every selector was captured from a **live guided exploration** of the sandbox (see
`docs/selector-map.md`) — not guessed from screenshots.

## Setup

```bash
npm install
npx playwright install chromium
cp .env.example .env   # then fill in credentials from your secure store
```

`.env` values:

| Variable | Purpose |
|---|---|
| `SF_BASE_URL` | Sandbox my-domain URL |
| `SF_USERNAME` / `SF_PASSWORD` | **UW3 user — runs the ENTIRE flow** |
| `SF_UAL_APPROVER_USERNAME` / `SF_UAL_APPROVER_PASSWORD` | UW5 approver — used **only** in the conditional UAL branch |

## Run

```bash
npm test                 # headless
npm run test:headed      # watch it drive
npm run report           # open HTML report
```

The journey is one long test (`tests/sanity/oliva-nb-care-howden.spec.ts`) with `test.step` blocks
per phase; timeout 30 min (Salesforce OmniScript submits take 20–40s each).

## The UAL branch (important business rule)

Marking the quote *Quote Issued*/*Bound* fails with
`Status cannot be changed as there are outstanding UAL/Carrier Referrals` when the quote
breaches the underwriter's authority limit. **Only in that case** the suite:

1. sets *UAL Approver* = `T-0006-SIT2-SCC-CAR-UW5 Auto-Provar` on the quote (as UW3),
2. submits *Submit UAL Approval* (as UW3),
3. opens a **second browser context**, logs in as the UW5 approver, approves the pending
   request from the quote's Approval History, closes the context,
4. reloads as UW3 (approval auto-advances the quote to *Ready*) and retries the stage change.

If the stage change succeeds directly, the approver credentials are never used.

## Design notes

- All Oliva wizards are Vlocity OmniScript **LWC (open shadow DOM, no iframes)** — Playwright
  locators (`getByLabel`, `getByRole`) pierce them natively.
- Premium entry matches coverage panels **by (coverage, insurable) value**, not by index —
  panel order is not deterministic.
- Insurable/coverage cards are located **by name text**, never by position.
- The carrier tick on the RBS record uses the related-record **Edit modal** (the inline grid
  save is unreliable — verified during exploration).
- Sanction check is asynchronous: the suite polls with page reloads until status = `Pass`.
- Policy creation may show a non-fatal `insufficient access rights` error block
  (`DRPInstalmentSettlementDueDate`) — the suite clicks **Continue**, which proceeds to
  `Policy Success` (verified live).
- Dates are computed at runtime (`ukDate(offset)`), never hard-coded.

## Caveats

- The suite creates real records in the SITP sandbox on every run (submission, quote, policy).
- The sandbox occasionally reassigns layouts; if a selector drifts, fix it in the page object
  and cross-check `docs/selector-map.md`.
- `Theft Excess = 111` (from the source walkthrough) is below the UW3 authority minimum, so
  the UAL branch is expected to trigger on standard data. That is intended — it exercises the
  approval path. Use `250` to stay inside authority if you want the short path.
