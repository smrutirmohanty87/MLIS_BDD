# BDD Test Folder Structure

Use this structure under `tests/BDD` for all BDD conversions.

## Folder Layout

- `features/`
  - `sanity/` -> `.feature` files for sanity coverage
  - `regression/` -> `.feature` files for regression coverage
- `steps/`
  - `sanity/` -> step definition `.ts` files for sanity features
  - `regression/` -> step definition `.ts` files for regression features
- `.features-gen/` -> auto-generated Playwright specs from `bddgen`

## Naming Convention

- Feature file: `tc_<suite>_<id>_<short-description>.feature`
- Steps file: `tc_<suite>_<id>_<short-description>.steps.ts`

Keep each feature and its steps in the same suite branch (`sanity` or `regression`).
