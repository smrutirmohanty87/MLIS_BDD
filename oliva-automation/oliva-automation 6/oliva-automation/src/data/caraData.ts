import { OmniForm, RenoCoverage } from './renoTypes';
import { RenoPremiumEntry } from './renoData';

/**
 * Test data for the Oliva "Contractors All Risks - Annual" (CARA) New Business
 * flow on the newprodqa2 sandbox — from the CARA requirements doc (44
 * screenshots catalogued in scratchpad cara_catalog.md) + live org exploration
 * (tests/explore-cara.spec.ts, run as UW5 oliva.cons.puw5).
 *
 * CARA deltas vs siblings:
 *  - insured is the DOC-EXACT client "Moorgarth Retail Limited as employer and
 *    Allclear Demolition Ltd as contractors" (exists on newprodqa2,
 *    001Pu00000r7Fn3IAE — verified via REST);
 *  - Client Classification Type = "Retail" (CONC/CARP use "Consumer");
 *  - 4-step product questionnaire; SIX product-level coverages (no
 *    insurable-level rows at all);
 *  - THREE DIFFERENT binders across the six coverage rows (Accelerant
 *    Construction & Commercial 2026 ×4, AXA XL Contractors 2026 for Terrorism,
 *    ARAG Legal Expenses Construction 2025 for Legal Expenses) — the shared
 *    BindersPage only supports ONE binder name, see CARA_BINDERS note;
 *  - Insurer Quote/Policy Reference left EMPTY in the submission wizard.
 */

// ---------------------------------------------------------------------------
// Account / submission wizard
// ---------------------------------------------------------------------------

export const CARA_ACCOUNT = {
  name: process.env.CARA_ACCOUNT_NAME ?? 'HOWDEN INSURANCE BROKERS LIMITED',
  intermediaryContact: process.env.CARA_INTERMEDIARY_CONTACT ?? 'James Chambers',
};

export const CARA_CLIENT_INFO = {
  // Doc-exact insured; EXISTS on newprodqa2 (Account 001Pu00000r7Fn3IAE) and
  // the typeahead offers exactly one option with this exact text (live 22/07).
  insuredName:
    'UK Test Insured',
  industrySector: 'Construction',
  activityCode: 'Aerial & Satellite Erection',
  product: 'Contractors All Risks - Annual',
  businessDescription: 'Test Reference',
  yearBusinessEstablished: '2026',
  employeeSize: '90',
  clientTurnover: '900000',
  // LIVE FINDING (22/07/2026, runs 2 + 8): the doc's "Retail" is NOT a
  // selectable option — the wizard lookup renders EMPTY and offers only
  // [--, Consumer, Micro, Small, Commercial, Reinsurance] (typing "Retail"
  // filters to the same list). Picking "Consumer" here is UI-only: the saved
  // Opportunity field Client_Classification_Type__c comes from the existing
  // Moorgarth ACCOUNT and equals "Retail" (doc-exact) regardless of what the
  // wizard picks — verified via REST on submissions 006Pu00000YZglaIAD and
  // 006Pu00000YZkSeIAL. So the shared SubmissionWizardPage works unchanged
  // with this value; assert the stored value via
  // CARA_SUBMISSION_EXPECTATIONS.clientClassificationStored.
  clientClassificationType: 'Consumer',
};

/** REST-verified outcomes of the submission wizard (see comments above). */
export const CARA_SUBMISSION_EXPECTATIONS = {
  // e.g. DOU/00238396/CARA/00. WARNING: SubmissionPage.riskId() (first
  // DOU/... text on the page) is UNSAFE for the Moorgarth insured — its
  // Potential Matches rail holds Risk IDs of OTHER products (a RENO one
  // matched first, live). Read Opportunity.RiskId__c via REST instead.
  riskIdPattern: /DOU\/\d+\/CARA\/\d+/,
  clientClassificationStored: 'Retail',
};

export const CARA_RISK_INFO = {
  riskType: 'Insurance',
  intermediaryReference: 'Test Reference',
  // Doc image 4: left EMPTY (empty string makes the wizard skip the field).
  insurerQuotePolicyReference: 'Test Reference',
};

export const CARA_INSURABLE = {
  // CARA has NO insurable-level coverages: all six optional coverages live
  // under the "Contractors All Risks - Annual" PRODUCT card's Show Coverages
  // (same CONC lesson — the risk-location card has no coverage rows). This is
  // the card-scoping string addRenoCoverage needs.
  insurableName: 'Contractors All Risks - Annual',
};

// ---------------------------------------------------------------------------
// Product Questions — 4-step OmniScript (doc images 9–12)
// ---------------------------------------------------------------------------

export const CARA_PRODUCT_FORM: OmniForm = {
  name: 'Contractors All Risks Annual Product Questions',
  steps: [
    {
      title: 'Oliva Standard Questions',
      fields: [
        { label: 'Contractors Company Website Checked', kind: 'radio', value: 'Yes' },
        { label: 'Current Insurer/MGA', kind: 'picklist', value: 'Other' },
        { label: 'Has an Insurer ever declined to issue or renew', kind: 'radio', value: 'No' },
        { label: 'prosecuted for Health & Safety', kind: 'radio', value: 'No' },
        { label: 'declared bankrupt', kind: 'radio', value: 'No' },
        { label: 'convicted or charged with any criminal offence', kind: 'radio', value: 'No' },
      ],
      action: 'Next',
    },
    {
      title: 'Contractors All Risks Annual',
      fields: [
        { label: 'Main trade description', kind: 'picklist', value: 'Other' },
        { label: 'Details of any trade memberships', kind: 'text', value: 'Test Reference 123' },
        { label: 'Total Turnover', kind: 'text', value: '160000' },
        { label: 'maximum height worked to', kind: 'text', value: '2000' },
        { label: 'maximum depth worked to', kind: 'text', value: '2000' },
        { label: 'application of heat away from your own premises', kind: 'text', value: '100' },
      ],
      action: 'Next',
    },
    {
      title: 'Types of Work',
      fields: [
        { label: 'Demolition in isolation of buildings', kind: 'radio', value: 'No' },
        { label: 'high risk contracts', kind: 'radio', value: 'No' },
        { label: 'Pile driving, quarrying or use of explosives', kind: 'radio', value: 'No' },
        { label: 'asbestos/silica', kind: 'radio', value: 'No' },
        { label: 'laying of main sewers', kind: 'radio', value: 'No' },
      ],
      action: 'Next',
    },
    {
      title: 'Work Locations',
      fields: [
        { label: 'Airside or at airports', kind: 'radio', value: 'No' },
        { label: 'ship, vessel, water craft', kind: 'radio', value: 'No' },
        { label: 'railways or railside', kind: 'radio', value: 'No' },
        { label: 'petrochemical works', kind: 'radio', value: 'No' },
        { label: 'Overseas, outside of the UK or offshore', kind: 'radio', value: 'No' },
        { label: 'coronavirus/communicable disease', kind: 'radio', value: 'No' },
        {
          label: 'If the answer is "No" to any of the above questions, please provide full details',
          kind: 'text',
          value: 'Test Reference 123456789!',
        },
        { label: 'external company to oversee the health', kind: 'radio', value: 'No' },
        { label: 'facts that could be considered material', kind: 'radio', value: 'Yes' },
        // Conditional — appears only when the material-facts radio = Yes.
        { label: 'Additional Details (Material Facts)', kind: 'text', value: 'Test Reference 123' },
      ],
      action: 'Save',
    },
  ],
};

// ---------------------------------------------------------------------------
// Coverages — SIX product-level rows, doc order (images 13–19). Every form is
// a single "Coverage Questions" step ending in Save. All six were added live
// on quote 0Q0Pu000006iadyKAA (22/07/2026) with exactly these values.
// ---------------------------------------------------------------------------

// ORG DEFECT (LIVE-CONFIRMED 22/07/2026, quotes 0Q0Pu000006iadyKAA and
// 0Q0Pu000006ih2bKAA): the CARA Terrorism coverage IS offered a binder in the
// UI ("AXA XL Contractors 2026" / section "Section C – Terrorism – CONC &
// CARA" — Binder_Section_Coverage__c mapping exists), and the Add renders a
// selected row with the N/R editor, BUT the selection NEVER PERSISTS: no
// success toast, and NO Risk_Binder_Section__c record is created (REST-checked
// after FOUR separate add+save attempts across both quotes; the other five
// coverages create their RBS at Add time). Run 8 caught the server-side cause
// as a sticky error toast surfacing right after the Terrorism save:
//   "Dual MGA Commission should be greater than Intermediary and Introducer
//    Commission"
// i.e. the AXA XL Section C binder's DUAL MGA commission is configured below
// the intermediary(17.5)+introducer(0) commission, so the RBS insert fails
// validation. The Terrorism row therefore keeps its red flag and the quote
// cannot pass the binder gate — same practical outcome as the Reno/CARP
// Terrorism defect, different failure point (there: no binder offered; here:
// offered but the RBS insert fails). Included by default;
// set CARA_INCLUDE_TERRORISM=0 to exclude once needed.
const INCLUDE_TERRORISM = process.env.CARA_INCLUDE_TERRORISM !== '0';

const CARA_COVERAGES_ALL: RenoCoverage[] = [
  // 1 — Contract Works (image14). CARA adds "Maximum contract period (months)"
  // vs Renovation; excess picklists 750/750; Limit mirrors Max Contract Value.
  {
    addRowName: 'Contract Works',
    form: {
      name: 'Contract Works',
      steps: [
        {
          title: 'Coverage Questions',
          fields: [
            { label: 'Maximum Contract Value', kind: 'text', value: '1000' },
            { label: 'Maximum contract period', kind: 'text', value: '1000' },
            { label: 'Excess for theft &/or malicious damage', kind: 'picklist', value: '750' },
            { label: 'Excess - all other damage or losses', kind: 'picklist', value: '750' },
          ],
          action: 'Save',
        },
      ],
    },
  },
  // 2 — Employees Tools & Personal Effects (image15) — no Renovation sibling.
  {
    addRowName: 'Employees Tools & Personal Effects',
    form: {
      name: 'Employees Tools & Personal Effects',
      steps: [
        {
          title: 'Coverage Questions',
          fields: [
            { label: 'Total value of employees tools', kind: 'text', value: '100000' },
            { label: 'Maximum sum insured employees tools per employee', kind: 'text', value: '100000' },
            { label: 'Employees Tools Excess', kind: 'picklist', value: '100' },
          ],
          action: 'Save',
        },
      ],
    },
  },
  // 3 — Own Plant (image16) with the DUAL DNA+ conditional trio (Yes → kits
  // picklist "15" → lifecycle year picklist "3").
  {
    addRowName: 'Own Plant',
    form: {
      name: 'Own Plant',
      steps: [
        {
          title: 'Coverage Questions',
          fields: [
            { label: 'Total value of own plant to be insured', kind: 'text', value: '160000' },
            { label: 'Excess for theft &/or malicious damage', kind: 'picklist', value: '1,000' },
            { label: 'Excess - all other damage or losses', kind: 'picklist', value: '1,000' },
            { label: 'Is DUAL DNA+ Required', kind: 'radio', value: 'Yes' },
            { label: 'Number of new DUAL DNA+ kits required', kind: 'picklist', value: '15' },
            { label: 'What year is the risk in the 3 year DNA+ Lifecycle', kind: 'picklist', value: '3' },
          ],
          action: 'Save',
        },
      ],
    },
  },
  // 4 — Hired in Plant (image17; modal header "Hired In Plant").
  {
    addRowName: 'Hired in Plant',
    form: {
      name: 'Hired in Plant',
      steps: [
        {
          title: 'Coverage Questions',
          fields: [
            { label: 'Maximum Accident Value', kind: 'text', value: '160000' },
            { label: 'Annual Hiring Fees', kind: 'text', value: '160000' },
            { label: 'Excess for theft &/or malicious damage', kind: 'picklist', value: '1,000' },
            { label: 'Excess - all other damage or losses', kind: 'picklist', value: '1,000' },
          ],
          action: 'Save',
        },
      ],
    },
  },
  // 5 — Terrorism (image18). Org-side the AXA XL Contractors 2026 section
  // "Section C – Terrorism – CONC & CARA" maps this coverage (REST-verified),
  // so Terrorism IS bindable on CARA (unlike the Reno/CARP defect).
  // Floating contract → Contract Value greyed; address = Howden's registered
  // address per the doc.
  {
    addRowName: 'Terrorism',
    form: {
      name: 'Terrorism',
      steps: [
        {
          title: 'Coverage Questions',
          fields: [
            { label: 'Cover Type', kind: 'picklist', value: 'Terrorism' },
            // LIVE-VERIFIED (run 3 ARIA snapshot): the doc's "*Sum Insured =
            // 160,000" renders as a VALUE-BOX table — a read-only category box
            // whose input VALUE is "Contract Value" with the editable amount
            // beside it (validation name "Contract Value Sum Insured"), plus a
            // read-only "Total" row. The engine fills it via
            // fillValueBoxSibling keyed on "Contract Value" (CARP mechanism).
            // A label "Sum Insured" is NOT fillable on this form.
            { label: 'Contract Value', kind: 'text', value: '160000' },
            { label: 'Zone', kind: 'picklist', value: 'B' },
            { label: 'Floating or Specific Contract', kind: 'radio', value: 'Floating' },
            { label: 'Address Line', kind: 'text', value: 'One Creechurch Place,' },
            { label: 'City', kind: 'text', value: 'LONDON' },
            { label: 'Postcode', kind: 'text', value: 'EC3A 5AF' },
            { label: 'Country', kind: 'text', value: 'United Kingdom' },
            { label: 'If Sum Insured or First Loss Limit', kind: 'picklist', value: 'Sum Insured' },
          ],
          action: 'Save',
        },
      ],
    },
  },
  // 6 — Legal Expenses (image19) — radios only; limits read-only.
  {
    addRowName: 'Legal Expenses',
    form: {
      name: 'Legal Expenses',
      steps: [
        {
          title: 'Coverage Questions',
          fields: [
            { label: 'comply with GDPR regulations', kind: 'radio', value: 'Yes' },
            { label: 'located within the UK and NI', kind: 'radio', value: 'Yes' },
            { label: 'domiciled within the UK and NI', kind: 'radio', value: 'Yes' },
            { label: 'contract & debt recovery cover required', kind: 'radio', value: 'No' },
            { label: 'main contractor/property developer', kind: 'radio', value: 'No' },
          ],
          action: 'Save',
        },
      ],
    },
  },
];

export const CARA_COVERAGES: RenoCoverage[] = CARA_COVERAGES_ALL.filter(
  (c) => INCLUDE_TERRORISM || c.addRowName !== 'Terrorism'
); // Includes Terrorism by default (6 coverages); set CARA_INCLUDE_TERRORISM=0 to exclude

// ---------------------------------------------------------------------------
// Premiums (images 21–23) — product-level, so Insurable Name renders EMPTY in
// every "Coverage N" section (live-verified); technical = gross; commission 5
// everywhere. Live grid totals matched: DUAL Share GWP = GBP 2,488.18 (Σ of
// the six GWPs) after submit.
// ---------------------------------------------------------------------------

const CARA_PREMIUMS_ALL: RenoPremiumEntry[] = [
  { coverage: 'Contract Works', insurable: '', technical: '375.66', grossWritten: '375.66', annualized: '', commissionRate: '5' },
  { coverage: 'Employees Tools & Personal Effects', insurable: '', technical: '669.44', grossWritten: '669.44', annualized: '', commissionRate: '5' },
  { coverage: 'Own Plant', insurable: '', technical: '237.74', grossWritten: '237.74', annualized: '', commissionRate: '5' },
  { coverage: 'Hired in Plant', insurable: '', technical: '556.66', grossWritten: '556.66', annualized: '', commissionRate: '5' },
  { coverage: 'Terrorism', insurable: '', technical: '788.66', grossWritten: '788.66', annualized: '', commissionRate: '1' },
  { coverage: 'Legal Expenses', insurable: '', technical: '999.77', grossWritten: '999.77', annualized: '', commissionRate: '5' },
];

export const CARA_PREMIUMS: RenoPremiumEntry[] = CARA_PREMIUMS_ALL.filter(
  (p) => INCLUDE_TERRORISM || p.coverage !== 'Terrorism'
); // Includes Terrorism by default (6 premiums); set CARA_INCLUDE_TERRORISM=0 to exclude

/** "Is any part of policy Minimum & Deposit?" — Yes (image21). */
export const CARA_MINIMUM_DEPOSIT = 'Yes';

// ---------------------------------------------------------------------------
// Binders — CARA needs a DIFFERENT binder per coverage row (LIVE-VERIFIED
// 22/07/2026 on quote 0Q0Pu000006iadyKAA). Exact offerings per row:
//
//   Contract Works / Employees Tools & Personal Effects / Own Plant /
//   Hired in Plant — THREE binders offered each:
//     • Accelerant Oliva Construction 2024      | Contractors All Risks - Annual | GBP 850,000.00 cap
//     • Accelerant Construction & Commercial 2026 | Contractors All Risks - Annual | GBP 843,970.86 cap  ← doc target
//     • AXA XL Contractors 2026                 | Section B1 – Annual – CARA     | GBP 5,500,000.00 cap
  //   Terrorism — ONE binder offered (INCLUDED BY DEFAULT):
  //     • AXA XL Contractors 2026 | Section C – Terrorism – CONC & CARA | GBP 2,748,440.46 cap
  //       (set CARA_INCLUDE_TERRORISM=0 to exclude if needed)
//   Legal Expenses — ONE binder offered:
//     • ARAG Legal Expenses Construction 2025 | 25 ARAG Construction Legal Expenses | GBP 593,338.93 cap
//
// Carriers behind them (Carrier_Selection_Detail__c, created with each RBS):
//   Accelerant C&C 2026    → CB-0821 ACCELERANT INSURANCE UK LIMITED
//   Accelerant Oliva 2024  → CB-0500 ACCELERANT INSURANCE UK LIMITED
//   ARAG LE Construction   → CB-0751 ARAG Legal Expenses Insurance Company Limited
//
// ENGINE GAP: the shared BindersPage takes ONE binder {name, section} for ALL
// rows and, when the named row is missing, falls back to clicking the FIRST
// Add — on CARA's 3-binder rows that adds the WRONG binder, and on a resumed
// quote it DOUBLE-ADDS (live-observed: a second binder splits the RBS into
// 50/50 allocations). A CARA-capable binder page must (a) pick the binder by
// row-specific NAME from this array, (b) skip the Add when the intended
// binder is already under Selected Binders, and (c) never blind-click the
// first Add. See tests/explore-cara.spec.ts step 7 for a working reconciler.
//
// N.B. the section dashes are EN-DASHES (–) as rendered in the UI; REST
// returns the ARAG section with a double space ("25 ARAG  Construction Legal
// Expenses") — match sections whitespace-insensitively.
// ---------------------------------------------------------------------------

export interface CaraBinderChoice {
  /** Coverage text on the Select Binders risk grid row (prefix-safe — the grid
   *  truncates e.g. "Employees Tools & Perso…"). */
  coverage: string;
  /** Binder name to Add on the row's Available Binders table. */
  name: string;
  /** Expected section name in that binder row. */
  section: string;
  nrToBinder: string;
}

/** All six rows incl. Terrorism by default. Terrorism can be excluded by
 *  setting CARA_INCLUDE_TERRORISM=0 if needed. Production flows use CARA_BINDERS. */
export const CARA_BINDERS_ALL: CaraBinderChoice[] = [
  { coverage: 'Contract Works', name: 'Accelerant Construction & Commercial 2026', section: 'Contractors All Risks - Annual', nrToBinder: 'New Business' },
  { coverage: 'Employees Tools', name: 'Accelerant Construction & Commercial 2026', section: 'Contractors All Risks - Annual', nrToBinder: 'New Business' },
  { coverage: 'Own Plant', name: 'Accelerant Construction & Commercial 2026', section: 'Contractors All Risks - Annual', nrToBinder: 'New Business' },
  { coverage: 'Hired in Plant', name: 'Accelerant Construction & Commercial 2026', section: 'Contractors All Risks - Annual', nrToBinder: 'New Business' },
  { coverage: 'Terrorism', name: 'AXA XL Contractors 2026', section: 'Section C – Terrorism – CONC & CARA', nrToBinder: 'New Business' },
  { coverage: 'Legal Expenses', name: 'ARAG Legal Expenses 2023', section: '23 ARAG Legal Expenses', nrToBinder: 'New Business' },
];

export const CARA_BINDERS: CaraBinderChoice[] = CARA_BINDERS_ALL.filter(
  (b) => INCLUDE_TERRORISM || b.coverage !== 'Terrorism'
); // Includes Terrorism by default (6 binders); set CARA_INCLUDE_TERRORISM=0 to exclude

// ---------------------------------------------------------------------------
// Fees — same three as CARP/CONC (catalog §2.8, doc text).
// ---------------------------------------------------------------------------

export const CARA_FEES = [
  {
    type: 'Third Party Fee',
    subType: 'Survey Fee',
    payableBy: 'Insured',
    administeredBy: 'DUAL',
    includedInGwp: 'Yes',
    charged: '150',
    description: 'TESTING FEES',
  },
  {
    type: 'Third Party Fee',
    subType: 'DUAL DNA+ Fee',
    // Conditional OmniScript field for the DNA+ sub-type; org records show 50
    // (live-diagnosed 22/07/2026 — save silently fails without it).
    dnaPaymentAmount: '50',
    payableBy: 'Insured',
    administeredBy: 'DUAL',
    includedInGwp: 'Yes',
    charged: '150',
    description: 'TESTING FEES',
  },
  {
    type: 'DUAL Fee',
    subType: 'DUAL Policy/Admin Fee',
    payableBy: 'Insured',
    administeredBy: 'DUAL',
    includedInGwp: 'Yes',
    charged: '150',
    description: 'TESTING FEES',
  },
];

// ---------------------------------------------------------------------------
// UAL / users / policy expectations — same Construction org setup as CONC.
// ---------------------------------------------------------------------------

export const CARA_UAL = {
  approverName: 'T-0016-SIT-SCC-CON-UW5 Auto-Provar',
  approverSearchTerms: ['t-0016', 'T-0016-SIT-SCC-CON-UW5', 'T-0016'],
  errorToastText: 'Status cannot be changed as there are outstanding UAL/Carrier Referrals',
};

export const CARA_USERS = {
  uw3: process.env.SF_USERNAME ?? 'oliva.cons.puw3@dualgroup.com.newprodqa2',
  uw5: process.env.SF_UAL_APPROVER_USERNAME ?? 'oliva.cons.puw5@dualgroup.com.newprodqa2',
};

export const CARA_POLICY_EXPECTATIONS = {
  status: 'In Force',
  newMtaRenewal: 'New Business',
  product: 'Contractors All Risks - Annual',
  riskIdPattern: /DOU\/\d+\/CARA\/\d+\/\d+/,
};

/**
 * MTA (Mid-Term Adjustment) — applied to the NB policy created above.
 * Charge premium (10) is applied to every coverage's "100% MTA Charge Premium" field.
 * Effective date is 3 days from inception (policy inception = today).
 */
export const CARA_MTA = {
  effectiveOffsetDays: 3,
  submissionOffsetDays: 0,
  submissionTime: '09:00:00',
  reason: 'Coverage Changes',
  description: 'Test Reference MTA',
  policyNewMtaRenewal: 'MTA',
  policyStatus: 'In Force',
  chargePremiums: [
    { coverage: 'Contract Works', chargePremium: '347.88' },
    { coverage: 'Employees Tools & Personal Effects', chargePremium: '559.77' },
    { coverage: 'Own Plant', chargePremium: '327.44' },
    { coverage: 'Hired in Plant', chargePremium: '261.88' },
    { coverage: 'Terrorism', chargePremium: '371.55' },
    { coverage: 'Legal Expenses', chargePremium: '123.77' },
  ],
};

/**
 * Second MTA (Mid-Term Adjustment) — applied after the first MTA.
 * Different charge premiums for each coverage.
 */
export const CARA_MTA_2 = {
  effectiveOffsetDays: 5,
  submissionOffsetDays: 0,
  submissionTime: '10:00:00',
  reason: 'Coverage Changes',
  description: 'Test Reference MTA',
  policyNewMtaRenewal: 'MTA',
  policyStatus: 'In Force',
  chargePremiums: [
    { coverage: 'Contract Works', chargePremium: '-170.4' },
    { coverage: 'Employees Tools & Personal Effects', chargePremium: '-299.99' },
    { coverage: 'Own Plant', chargePremium: '-124.77' },
    { coverage: 'Hired in Plant', chargePremium: '-157.22' },
    { coverage: 'Terrorism', chargePremium: '-232.77' },
    { coverage: 'Legal Expenses', chargePremium: '-111.88' },
  ],
};

/**
 * Cancellation — applied after second MTA.
 * Cancels the policy from inception with full premium return.
 */
export const CARA_CANCELLATION = {
  category: 'Cancel this MTA Only',
  instigatedBy: 'Customer',
  reason: 'Product Unsuited/Misunderstood',
  notes: 'Test Reference Cancellation',
  returnFullPremium: 'Yes',
  policyStatus: 'Cancelled',
};
