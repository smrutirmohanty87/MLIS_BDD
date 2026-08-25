# Oliva NB Care Howden — VERIFIED selector map (live-explored 03/07/2026, SITP sandbox)

Every fact below was verified by driving the real app. Trust this over guesses.

## Architecture facts (critical)

- **No iframes anywhere.** All Oliva wizards are Vlocity OmniScript **LWC (open shadow DOM)**
  hosted at `/lightning/cmp/vlocity_ins__vlocityLWCOmniWrapper?c__target=c:<name>`.
  Playwright selectors pierce open shadow DOM natively — use `getByLabel`, `getByRole`, `getByText`.
- OmniScript targets seen: `dualNewSubmissionForOlivaEnglish` (submission wizard),
  `dualQuoteGenerationInsuredCoverages_Oliva_v2English` (quote wizard),
  `dualCreateUpdateQuotePremiumsNewEnglish` (Edit Premiums), `duAddFeeEnglish` (fee),
  `dualQuoteToPolicyNewEnglish` (create policy).
- Field label associations are proper `<label for>` → `page.getByLabel('Intermediary Contact')` works.
- OmniScript control taxonomy (host element → interaction):
  - `c-typeahead` → `input[role=combobox]`: click, `fill(text)`, wait, click option by text in dropdown.
  - `vlocity_ins-omniscript-lookup` → input: click opens options list (may NOT filter on typing);
    click option by exact text (e.g. "Care Home", "Care Howden", "Small", "Insurance").
  - `c-combobox` (picklist) → click opens list; typing filters; options incl. `-- Clear --`.
  - `c-radio-group` → radio inputs labelled `Yes`/`No`. Scope by question text container, then
    `getByRole('radio', {name:'Yes'})` / click label.
  - Date inputs: `fill('dd/mm/yyyy')` works but opens a **calendar overlay that blocks the right
    column** — press `Escape` and/or click a left-column field after typing. Verify value after.
  - Numeric fields auto-format on blur (`11000` → `11,000.00`); Sum Insured columns are readOnly
    auto-calculated (declared × 1.15).
- **Accordion section headers toggle on click** (e.g. "Risk Details") — never click section titles.
- Step navigation: plain buttons `Next` / `Previous` / `Submit` / `Save` / `Save and Exit`.
- Record pages are standard Lightning: tabs via `getByRole('tab')`, path chevrons
  `.slds-path__item`, inline edit via pencil `button[title^="Edit"]`, footer `Save`/`Cancel`.
- Console app = "Insurance Agent Console" (workspace tabs). After OmniScript submits, expect
  either a subtab close, a workspace navigate, or a **full page reload** (premiums submit does
  a full reload w/ Salesforce splash).

## Flow with verified behaviors

1. **Login** `POST /` standard SF login (`#username`, `#password`, `#Login` / button
   "Log In to Sandbox"). App may deep-link to last page — always navigate explicitly.
2. **Account → submission wizard**: Accounts tab → list view "All Intermediary Accounts" →
   search/open account → button **"New Oliva Submission"** (opens wizard subtab).
3. **Submission Source**: `getByLabel('Intermediary Contact')` typeahead → "Amy Thorpe" → Next.
4. **Client Information**: Create New Client radio (No default). Insured Name typeahead —
   **existing client option appears, click it**. Industry Sector lookup → option "Care Home".
   Activity Code combobox → "Childrens Care Home". Product lookup → "Care Howden".
   Business Description textarea. Year Business Established combobox (pick current year).
   Employee Size, Client Turnover text. Client Classification Type lookup → "Small"
   (options: --, Consumer, Micro, Small, Commercial, Reinsurance). → Next.
5. **Submission Risk Information**: prefilled Underwriter/dates/New Business/GBP.
   Risk Type lookup → "Insurance" (options: --, Insurance, Insurance (XoL)).
   Quote Required by Date + Risk Inception Date: type dd/mm/yyyy then Escape (calendar!).
   Risk Expiry auto-computes (inception + 1yr − 1day). Intermediary Reference, Insurer
   Quote/Policy Reference text. → Next.
6. **Previous Claims History**: combobox already "No" → **Submit** → ~20–30s → lands on
   Submission record (`/lightning/r/Opportunity/<id>/view`), stage "Underwriting Review",
   header buttons: Edit Submission / **Create New Quote** / Sanction Check.
7. **Quote wizard** (3 steps): Select Product (prefilled "Care Howden") → Next →
   Quote Overview (name prefilled, Full Quote, In Progress) → Next →
   Insurable Detail (prefilled UK address from client) → **Submit** → ~20–30s →
   Quote record `/lightning/r/Quote/<id>/view`.
8. **Quote record page**. Tabs: Coverages | Details | Related | Notes | Select Binders |
   Selected Binders | SFiles | Clauses | More. Header buttons: Create Quote Version | Add Fee |
   Enter Premiums | ▾(Generate Document, **Submit UAL Approval**, New Task, **Sanction Check**,
   Rating Extract Oliva). Actions panel: Quote Summary | **Create Policy**.
9. **Insurable coverages** (Coverages tab → Risk Locations): per insurable card click
   "Show Coverages" (link toggles), then per coverage row click **Add** (green +) —
   row located by text "Asset Protection - Property Damage (Optional)" etc.
   Coverage rows list order is NOT stable — always locate insurable card by name text.
   - **Asset Protection modal** (4 steps in Steps sidebar): step1 radios Yes reveal value rows
     (fill Declared Value + uplift columns; Sum Insured readonly). "Buildings cover or tenants
     improvement" combobox → "Buildings Cover". Step2 "Questions Cont.": radios have DEFAULTS
     preselected; year/roof% text fields; flipping a radio reveals `If "Yes/No", please provide
     full details` text input to its right; "listed building" Yes needs Grade combobox
     (Grade 1/Grade 2). Step3 "Questions Cont.": 3 questions, defaults valid → Next.
     Step4 Covers & Excesses: all covers default Yes with excesses (override Theft Excess);
     "Risk Location - Property Type" combobox defaults "Residential Care Home" → type
     "Bungalow" to filter → select. → **Save** (modal closes, ~10s).
   - **Revenue Protection modal** (1 step): Limit Type combobox → "Gross Revenue" reveals
     "What is the annual fee income"; Indemnity Period Months → "12 months"; Loss Of
     Registration Sum Insured (default 150,000 → override). → Save.
10. **Add Risk Locations** (link in Risk Locations header): modal step1 Insurable Name text;
    "Risk Address Search" is **Google Places autocomplete** (type partial address, click
    suggestion; Address Line/City/Postcode/Country/lat/long auto-fill); override City +
    County/State. → Next → step2 "Care Specific Questions" (ALL optional) → **Save**.
11. **Product-level GPA**: Product Questions card → Show Coverages → rows: Asset Protection -
    Fidelity Guarantee / Computer (Aviva Only) / Engineering / **Group Personal Accident** →
    Add → modal defaults valid (Worldwide/Standard/Yes/Yes/10,000) → Save.
12. **Enter Premiums** (header button → subtab): sections titled "Coverage", "Coverage 2", …
    each with readonly `Coverage` + `Insurable Name` inputs and editable **Technical Premium,
    Gross Written Premium, 100% Annualized Gross Premium, Agreed Intermediary Commission Rate**
    (defaults "0"). Read the readonly pair per section, look up values from the premium map,
    fill. → **Submit** → **FULL PAGE RELOAD** back to quote (wait for load state + header).
    Assert header "DUAL Share GWP" equals Σ GWP.
13. **Select Binders tab**: grid rows `RBC-xxxxxxx` (one per coverage×insurable) each with
    "Select Binders" button + red flag. Per row: click Select Binders → "Available Binders"
    row (Aviva Care 2023 / Aviva Care - Section 1) click **Add** → row appears under
    "Selected Binders" → click pencil on "N/R to Bi…" cell (rightmost) → click cell again →
    dropdown "Select N/R" → **New Business** → **Save** (Cancel/Save under table) →
    toast **"Selected Binders saved successfully"** → **Back**. Repeat for every row.
    Then `page.reload()` → flags turn green.
14. **RBS approval** (Selected Binders tab): Risk Binder Sections list (RBS-xxxxxx per
    coverage). Open ONE RBS (click name link → subtab, object `Risk_Binder_Section__c`).
    - "Confirm No Manual Reasons" checkbox on Referral Reasons tab (was already ticked;
      tick if not).
    - **Carrier tick — use the related-record modal, NOT the inline grid** (inline grid save
      is flaky/silently fails): right panel "Carrier Selection Details" → record CB-xxxx
      dropdown ▾ → **Edit** → modal "Edit CB-xxxx" → checkbox **Carrier Selected** → Save →
      toast `Carrier Selection Detail "CB-xxxx" was saved.`
    - Details tab → pencil next to **Approval Status** → picklist (--None--/Approved/
      Rejected/Waiting for Approval) → **Approved** → footer **Save**. Risk Approval Date
      auto-fills. Close subtab.
15. **Clauses tab**: rows with checkbox + clause name; tick checkbox(es) → button
    **"Save Predefined Binder Clauses"**. NOTE: multiple clauses can be pending (saved ones
    disappear from list; Quote Endorsement Clauses panel count increments). Loop: while a
    checkbox row exists → tick all visible → save.
16. **Add Fee** (header button → subtab `Du/AddFee`): Type combobox → "DUAL Fee" (Sub Type
    auto "DUAL Policy/Admin Fee", readonly); Fee Payable by → "Insured"; Fee Administered
    by → "DUAL"; Fee Charged Included in Gross Written Premium? → "Yes"; Fee Charged → 100
    (field position shifts after the Yes selection — locate by label fresh); Fee Description →
    "Test" → **Save and Exit**.
17. **ERN**: Details tab → ERN Details section → pencil **ERN Exempt** → "Yes" → footer Save.
    (ERN auto-sets "NA".)
18. **Status transitions & the UAL GATE (conditional branch — VERY IMPORTANT)**:
    - Advance: click path chevron "Quote Issued" → button becomes **"Mark as Current Status"**
      → click → toast "Success — Record updated".
    - **If toast is "Error Updating record — Status cannot be changed as there are outstanding
      UAL/Carrier Referrals"** → UAL branch (ONLY then; otherwise stay on UW3 for everything):
      a. Details tab → UAL Details → pencil **UAL Approver** → lookup restricted to "Quote UAL
         Approvers" (search "Provar" → options `T-0006-SIT2-SCC-CAR-UW5 Auto-Provar` and
         `…-Bdx`) → select **T-0006-SIT2-SCC-CAR-UW5 Auto-Provar** → Save.
      b. Header ▾ → **Submit UAL Approval** → modal w/ prefilled comment → **Save**.
         (If modal says "check…UAL Approver is populated" → approver was missing.)
         Approval History panel gains: step "UAL Approver", Status Pending,
         Assigned To = the UW5 user.
      c. **Second browser context** logged in as UW5 (`SF_UAL_APPROVER_USERNAME`) →
         `/lightning/r/Quote/<id>/related/ProcessSteps/view` → top-right buttons
         **Approve | Reject | Reassign** (only visible to assignee) → Approve → comments modal
         → **Approve**. Step becomes Approved. Close context.
      d. Back as UW3: `page.reload()` — the approval **auto-advances the quote to "Ready"**.
         Then Quote Issued → Mark as Current Status (now succeeds).
19. **Sanction Check**: header ▾ → Sanction Check → modal "A Sanction Check is in progress,
    please wait for that to finish" (auto-dismisses). Result is ASYNC: reload page, Details →
    Sanctions Check Information → **Sanction Check Status (Insured) = "Pass"** (+ Date Time).
    Poll reload up to ~60s. (Doc fallback: if not Pass, set it via inline edit.)
20. **Bound**: path "Bound" → Mark as Current Status → coverages turn read-only ("View").
21. **Create Policy** (Actions panel): form subtab `dualQuoteToPolicyNewEnglish` — Effective/
    Expiry dates + Settlement Currency GBP + Settlement Type "Broker Settled" prefilled →
    **Submit** → MAY show non-fatal red error block (e.g. `DRPInstalmentSettlementDueDate —
    insufficient access rights`) with **Go Back | Continue** → click **Continue** →
    ~20–30s → **"Policy Success"** + Policy Number (readonly input) → **Go To Policy** →
    `/lightning/r/InsurancePolicy/<id>/view`.
22. **Policy assertions** (InsurancePolicy record): header name = quote name; Risk ID gets a
    NEW suffix (e.g. `DOU/00124099/CAHO/00/26`); Effective Date = inception; New/MTA/Renewal
    = "New Business"; Product = Care Howden; DUAL Share GWP matches; path current = **In Force**.

## Users / credentials model (env)

- `SF_USERNAME`/`SF_PASSWORD` — UW3 `t-0001-car-uw3-auto-provar@scc.sit2`. **Runs the ENTIRE
  flow** (non-negotiable requirement).
- `SF_UAL_APPROVER_USERNAME`/`SF_UAL_APPROVER_PASSWORD` — UW5
  `t-0006-car-uw5-auto-provar@scc.sit2`. Used ONLY inside the conditional UAL branch, in a
  separate browser context, only when the UAL error toast appears.

## Timing profile (from live run)

- OmniScript submit (submission/quote/policy create): 15–40s → generous waits + wait for
  landmark ("Create New Quote" button / quote tabs / "Policy Success").
- Premium submit: full page reload.
- Sanction check: async, requires reload-polling.
- Coverage modal save: 5–10s.
- Everything else: normal Lightning spinner waits.
