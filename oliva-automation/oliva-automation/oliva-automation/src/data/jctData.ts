import { OmniForm, RenoCoverage } from './renoTypes';
import { RenoPremiumEntry } from './renoData';

/**
 * Test data for the Oliva "JCT 6.5.1 Non Negligent Liability" (JCTL) New
 * Business flow on the newprodqa2 sandbox — from the JCT requirements doc
 * (30 screenshots catalogued in scratchpad jct_catalog.md; the native JCT run
 * was SIT/SITP-captured, so every org-dependent value below was re-verified
 * LIVE on newprodqa2 during exploration).
 *
 * JCT deltas vs siblings: insured is the doc-exact "Moorgarth Retail Limited…"
 * client (EXISTS on newprodqa2, 001Pu00000r7Fn3IAE — not "PG Test Insured"),
 * Risk Type "Insurance" (not XoL), a ONE-step product questionnaire ("Oliva
 * Standard Questions" only), ONE coverage under the RISK-LOCATION card
 * (2-page form), Insurable Name RENDERS on the premium grid (unlike CONC),
 * and several binders offered — must add "Accelerant Oliva Construction 2024"
 * BY NAME.
 */

// ---------------------------------------------------------------------------
// Account / submission wizard
// ---------------------------------------------------------------------------

export const JCT_ACCOUNT = {
  name: process.env.JCT_ACCOUNT_NAME ?? 'HOWDEN INSURANCE BROKERS LIMITED',
  // For SIT: use JCT_INTERMEDIARY_CONTACT env var to support environment-specific
  // intermediary contact (required when Intermediary and Introducer accounts share
  // the same name; browser UI will disambiguate via the contact name).
  intermediaryContact: process.env.JCT_INTERMEDIARY_CONTACT ?? 'James Chambers',
};

export const JCT_CLIENT_INFO = {
  // Doc-exact insured — verified via REST to exist on newprodqa2
  // (Account 001Pu00000r7Fn3IAE), so Create New Client stays "No" and the
  // typeahead offers it.
  insuredName:
    'UK Test Insured',
  industrySector: 'Construction',
  activityCode: 'Aerial & Satellite Erection',
  product: 'JCT 6.5.1 Non Negligent Liability',
  businessDescription: 'Test Reference',
  yearBusinessEstablished: '2026',
  employeeSize: '90',
  clientTurnover: '900000',
  clientClassificationType: 'Consumer',
};

export const JCT_RISK_INFO = {
  // Doc image 4: plain "Insurance" (NOT "Insurance (XoL)" as on CONC).
  riskType: 'Insurance',
  intermediaryReference: 'Test Reference',
  // Doc image 4 leaves this blank — empty string makes the wizard skip it.
  insurerQuotePolicyReference: 'Test Reference',
};

export const JCT_INSURABLE = {
  // The ONE JCT coverage lives under the RISK-LOCATION card
  // "<insured> - United Kingdom" (doc image 10 — NOT under the Product
  // Questions card as on Contractors Combined). This value is the card text
  // addRenoCoverage scopes to.
  insurableName:
    'UK Test Insured',
};

// ---------------------------------------------------------------------------
// Product Questions — ONE-step OmniScript "Oliva Standard Questions" (image 9)
// ---------------------------------------------------------------------------

export const JCT_PRODUCT_FORM: OmniForm = {
  name: 'JCT 6.5.1 Non Negligent Liability Product Questions',
  steps: [
    {
      title: 'Oliva Standard Questions',
      fields: [
        { label: 'Contractors Company Website Checked', kind: 'radio', value: 'No' },
        { label: 'Current Insurer/MGA', kind: 'picklist', value: 'Other' },
        { label: 'Has an Insurer ever declined to issue or renew', kind: 'radio', value: 'Yes' },
        { label: 'prosecuted for Health & Safety', kind: 'radio', value: 'Yes' },
        { label: 'declared bankrupt', kind: 'radio', value: 'Yes' },
        { label: 'convicted or charged with any criminal offence', kind: 'radio', value: 'Yes' },
        // Conditional — appears once any of the 4 questions above is Yes.
        { label: 'please provide details', kind: 'text', value: 'Test Reference 123' },
        { label: 'facts that could be considered material', kind: 'radio', value: 'Yes' },
        // Conditional — appears when the material-facts radio is Yes.
        { label: 'Additional Details (Material Facts)', kind: 'text', value: 'Test Reference 123' },
      ],
      action: 'Save',
    },
  ],
};

// ---------------------------------------------------------------------------
// Coverage — ONE: JCT 6.5.1 Non Negligent Liability (2 pages, images 11–12)
// ---------------------------------------------------------------------------

export const JCT_COVERAGES: RenoCoverage[] = [
  {
    // MUST include "(Optional)": the coverage row text equals the PRODUCT
    // name here, and QuotePage.addRenoCoverage's fallback path matches row
    // text page-wide — without the suffix it matches the (always-visible)
    // Product Questions card text, never expands the risk-location card and
    // times out on a row with no Add button (live-diagnosed, newprodqa2 run 1).
    addRowName: 'JCT 6.5.1 Non Negligent Liability (Optional)',
    form: {
      name: 'JCT 6.5.1 Non Negligent Liability',
      steps: [
        {
          title: 'Page 1',
          fields: [
            // Territorial Limits read-only: "GB, Northern Ireland, Channel
            // Islands, Isle of Man" (assert-only, skipped by engine).
            {
              label: 'Type of contract',
              kind: 'picklist',
              value: 'Extensions to Existing Buildings - other Buildings',
            },
            { label: 'Contract Address', kind: 'text', value: 'Test Reference 123456789!' },
            { label: 'Contract Value', kind: 'currency', value: '1600' },
            { label: 'Contract Duration', kind: 'number', value: '1600' },
            { label: 'Maintenance Period', kind: 'number', value: '1600' },
          ],
          action: 'Next',
        },
        {
          title: 'Page 2',
          fields: [
            { label: 'complete or partial demolition of any structures', kind: 'radio', value: 'No' },
            { label: 'pile driving or piling works', kind: 'radio', value: 'No' },
            { label: 'removal of support', kind: 'radio', value: 'No' },
            { label: 'underpinning works', kind: 'radio', value: 'No' },
            { label: 'excavations below the foundation', kind: 'radio', value: 'No' },
            { label: 'ground stabilisation work', kind: 'radio', value: 'No' },
            { label: 'dewatering works', kind: 'radio', value: 'No' },
            { label: 'schedules of condition', kind: 'radio', value: 'No' },
            { label: 'JCT 6.5.1. Non negligent liability excess', kind: 'picklist', value: '1,000' },
            { label: 'Limit of liability required', kind: 'picklist', value: '10,000,000' },
          ],
          action: 'Save',
        },
      ],
    },
  },
];

// ---------------------------------------------------------------------------
// Premiums (image 14) — Insurable Name RENDERS the insured string on JCT
// (unlike CONC where it is empty); matched by prefix.
// ---------------------------------------------------------------------------

export const JCT_PREMIUMS: RenoPremiumEntry[] = [
  {
    coverage: 'JCT 6.5.1 Non Negligent Liability',
    insurable: 'UK Test Insured',
    technical: '456.77',
    grossWritten: '456.77',
    annualized: '',
    commissionRate: '5',
  },
];

/** "Is any part of policy Minimum & Deposit?" — Yes (image 14). */
export const JCT_MINIMUM_DEPOSIT = 'Yes';

// ---------------------------------------------------------------------------
// Binder — THREE rows offered live on newprodqa2 (22/07/2026 run; the doc/SIT
// "Accelerant Oliva Construction 2023" does NOT appear):
//   1. Accelerant Oliva Construction 2024      | JCT 6.5.1      | GBP 498,235.99 | Qualified Yes
//   2. Accelerant Construction & Commercial 2026 | JCT 6.5.1    | GBP 497,779.22 | Qualified Yes
//   3. HCC JCT 6.5.1 TOBA 2026                 | JCT 6.5.1 TOBA | GBP 1,000,000.00 | Qualified Yes
// BindersPage must click the Add button in the 2024 binder's row BY NAME —
// a first-Add fallback would still hit the right one only by table order.
// Selected row verified live: allocation 100.00000000, N/R = New Business.
// ---------------------------------------------------------------------------

export const JCT_BINDER = {
  name: 'Accelerant Construction & Commercial 2026',
  section: 'JCT 6.5.1',
  nrToBinder: 'New Business',
};

// ---------------------------------------------------------------------------
// Fees — same three as CARP/CONC (doc text §2.8; no fee screenshots).
// ---------------------------------------------------------------------------

export const JCT_FEES = [
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

// Copied from CC_UAL (same Construction org). Live note (22/07/2026, UW3 run):
// at quote stage UAL_Approval_Status__c = "Approval Not Required" and
// Number of Outstanding UAL Breaches = 0 — the UAL branch stays conditional,
// exactly like the sibling flows.
export const JCT_UAL = {
  approverName: 'T-0016-SIT2-SCC-CON-UW5 Auto-Provar',
  approverSearchTerms: ['t-0016', 'T-0016-SIT2-SCC-CON-UW5', 'T-0016'],
  errorToastText: 'Status cannot be changed as there are outstanding UAL/Carrier Referrals',
};

export const JCT_USERS = {
  uw3: process.env.SF_USERNAME ?? 'oliva.cons.puw3@dualgroup.com.newprodqa2',
  uw5: process.env.SF_UAL_APPROVER_USERNAME ?? 'oliva.cons.puw5@dualgroup.com.newprodqa2',
};

export const JCT_POLICY_EXPECTATIONS = {
  status: 'In Force',
  newMtaRenewal: 'New Business',
  product: 'JCT 6.5.1 Non Negligent Liability',
  // Product abbreviation JCTL — live-verified on newprodqa2: submission
  // DOU/00238392/JCTL/00, quote Risk_ID__c "DOU/00238392/JCTL/00/01",
  // Product_Code__c "Oliva-JCTNNL". (Doc/SIT policy suffix was /00/26.)
  riskIdPattern: /DOU\/\d+\/JCTL\/\d+\/\d+/,
};

// ---------------------------------------------------------------------------
// MTA / CNR / Cancellation lifecycle data
// ---------------------------------------------------------------------------

export const JCT_MTA = {
  effectiveOffsetDays: 3,
  chargePremiums: [
    { coverage: 'JCT 6.5.1 Non Negligent Liability', chargePremium: '22.84' },
  ],
};

export const JCT_CANCELLATION = {
  category: 'Cancel the Policy Midterm',
  instigatedBy: 'Customer',
  reason: 'Product Unsuited/Misunderstood',
  notes: 'Test Cancellation',
  returnFullPremium: 'Yes',
  returnFees: 'Yes',
  policyStatus: 'Cancelled',
};
