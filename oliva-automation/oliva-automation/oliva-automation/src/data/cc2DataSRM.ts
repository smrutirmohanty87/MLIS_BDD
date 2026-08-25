import { OmniForm, RenoCoverage } from './renoTypes';
import { RenoPremiumEntry } from './renoData';
import { BinderChoice } from '../pages/BindersPage';

/**
 * Test data for the EXPANDED Oliva "Contractors Combined" (CONC) New Business
 * scenario ("CC2") on the newprodqa2 sandbox — from the SIT-captured
 * requirements doc (scratchpad cc2_catalog.md, 45 screenshots) re-derived live
 * on newprodqa2 via tests/explore-cc2.spec.ts (UW5 oliva.cons.puw5).
 *
 * CC2 deltas vs the existing CONC suite (ccData.ts):
 *  - NEW insured "Mr Jones Testing" (does NOT exist on newprodqa2 — REST 0
 *    rows) created through the wizard's "Create New Client = Yes" branch;
 *  - FOUR coverages: EL + PPL + CAR under the PRODUCT card, Property Damage
 *    under the risk-location card; PI/Terrorism NOT added;
 *  - a SECOND coverage-less insurable "Test" (London);
 *  - per-coverage binders (Accelerant Oliva Construction 2024 ×3 + Allianz
 *    Contractors Combined 2026 for PD) via BindersPage strict mode;
 *  - ONE fee, ERN exempt, ends at "Quote Issued" (no bind, no policy).
 */

// ---------------------------------------------------------------------------
// Users / account / submission wizard
// ---------------------------------------------------------------------------

export const CC2_USERS = {
  uw3: process.env.SF_USERNAME ?? 't-0011-con-uw3-auto-provar@scc.sit',
  uw5: process.env.SF_UAL_APPROVER_USERNAME ?? 't-0016-con-uw5-auto-provar@scc.sit',
};

export const CC2_ACCOUNT = {
  name: process.env.CC2_ACCOUNT_NAME ?? 'HOWDEN INSURANCE BROKERS LIMITED',
  // For SIT: use CC2_INTERMEDIARY_CONTACT env var to support environment-specific
  // intermediary contact (required when Intermediary and Introducer accounts share
  // the same name; browser UI will disambiguate via the contact name).
  intermediaryContact: process.env.CC2_INTERMEDIARY_CONTACT ?? 'James Chambers',
};

/** Doc address for the new insured (7 Chelwood Close…). */
export const CC2_INSURED_ADDRESS = {
  search: '7 Chelwood Close, Coulsdon, Surrey, CR5 3EY, United Kingdom',
  addressLine: '7 Chelwood Close',
  city: 'Coulsdon',
  countyState: 'Surrey',
  postcode: 'CR5 3EY',
  country: 'United Kingdom',
};

export const CC2_CLIENT_INFO = {
  // NEW name typed into the wizard. REST-verified absent on newprodqa2, so the
  // run exercises the create-new-client path. LIVE FINDING (22/07/2026): the
  // wizard's "Create New Client" radio = Yes converts "Insured Name" into a
  // plain text input (no typeahead) and reveals NO other extra required
  // fields on the Client Information step — the doc's "No" + typing a fresh
  // name would stall (typeahead offers no option), so Yes is the working path.
  insuredName: 'UK Test Insured',
  createNewClient: true,
  // Proven CONC fallback insured if the create-new path is blocked
  // (CC2_CLIENT=existing).
  fallbackInsuredName: 'PG Test Insured',
  industrySector: 'Construction',
  activityCode: 'Aerial & Satellite Erection',
  product: 'Contractors Combined',
  businessDescription: 'Test Reference',
  yearBusinessEstablished: '2026',
  employeeSize: '90',
  clientTurnover: '900000',
  clientClassificationType: 'Consumer',
};

export const CC2_RISK_INFO = {
  // Doc image 6: plain "Insurance" (existing CONC suite used "Insurance
  // (XoL)"; both exist as options — CC2 is doc-exact).
  riskType: 'Insurance',
  intermediaryReference: 'Test Reference',
  insurerQuotePolicyReference: 'Test Reference', // doc leaves blank
};

/** Card-scoping text for addRenoCoverage — EL/PPL/CAR live under the
 *  "Contractors Combined" PRODUCT card (proven CONC lesson); PD lives under
 *  the "<insured> - United Kingdom" risk-location card. */
export const CC2_PRODUCT_CARD = 'Contractors Combined';

// ---------------------------------------------------------------------------
// Product Questions — the doc does NOT fill the questionnaire. LIVE FINDING
// (22/07/2026, verified end-to-end on quotes 0Q0Pu000006io0sKAA and
// 0Q0Pu000006iu33KAA): coverages CAN be added, premiums entered, binders
// selected, RBS approved, clauses/fee/ERN saved AND the quote reaches Status
// "Issued" WITHOUT ever opening the questionnaire — it is NOT enforced
// anywhere on this org. Kept here (CC2_FILL_FORM=1) for optional doc-plus
// coverage; values from the proven CONC suite.
// ---------------------------------------------------------------------------

export const CC2_PRODUCT_FORM: OmniForm = {
  name: 'Contractors Combined Product Questions',
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
      title: 'Contractors Combined',
      fields: [
        { label: 'Main trade description', kind: 'picklist', value: 'Other' },
        { label: 'Details of any trade memberships', kind: 'text', value: 'Test Reference 123' },
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
          label: 'If "No" please provide full details',
          kind: 'text',
          value: 'Test Reference 123456789!',
        },
      ],
      action: 'Next',
    },
    {
      title: 'Health & Safety Risk Management',
      fields: [
        { label: 'written and signed health & safety policy', kind: 'radio', value: 'Yes' },
        { label: 'external company to oversee the health', kind: 'radio', value: 'Yes' },
        { label: 'keep records of training provided', kind: 'radio', value: 'Yes' },
        { label: 'enforce the use of personal protective equipment', kind: 'radio', value: 'Yes' },
        { label: 'records of personal protective equipment supplied', kind: 'radio', value: 'Yes' },
        { label: 'risk assessments for each contract', kind: 'radio', value: 'Yes' },
        { label: 'written work method statements', kind: 'radio', value: 'Yes' },
        { label: 'facts that could be considered material', kind: 'radio', value: 'Yes' },
        { label: 'Additional Details (Material Facts)', kind: 'text', value: 'Test Reference 123456789!' },
      ],
      action: 'Save',
    },
  ],
};

// ---------------------------------------------------------------------------
// Coverages — SRM variant product-card set: EL, PPL, Terrorism.
// ---------------------------------------------------------------------------

export const CC2_COVERAGES: RenoCoverage[] = [
  // A) Employers Liability — single "Coverage Questions" step (LIVE-CAPTURED
  // 22/07/2026, run 8 screenshot): Territorial Limits RO "Worldwide"; the 4
  // wagerolls; Limit RO 10,000,000.00 / Limit Type RO "Any one occurrence";
  // then a "Trade Details" section (an "Add" link adds more rows) whose row
  // fields are LITERALLY labelled "*Trade Description", "*(Name of trade
  // description) wageroll" and "(Name of trade description) headcount".
  // The trade row needs bespoke handling (the generic engine mis-targets the
  // row's dropdown) — see CC2_EL_TRADE + the explore spec's fillElTradeRow.
  {
    addRowName: 'Employers Liability',
    form: {
      name: 'Employers Liability',
      steps: [
        {
          title: 'Coverage Questions',
          fields: [
            { label: 'Drivers Supervisory Wageroll', kind: 'currency', value: '600' },
            { label: 'Drivers Supervisory Headcount', kind: 'number', value: '600' },
            { label: 'Heat Wageroll', kind: 'currency', value: '600' },
            { label: 'Woodworking/ Metalworking Wageroll', kind: 'currency', value: '600' },
            // Trade Details grid row is handled by fillElTradeRow() helper (called in test before forms.fill)
            { label: 'Trade Description', kind: 'readonly', value: 'Agricultural Contractors' },
            { label: '(Name of trade description) wageroll', kind: 'readonly', value: '600' },
            { label: '(Name of trade description) headcount', kind: 'readonly', value: '600' },
          ],
          action: 'Save',
        },
      ],
    },
  },
  // B) Public & Products Liability — 2 steps; cover required = "Public
  // Liability" (doc; CONC suite used "Public & Products Liability").
  {
    addRowName: 'Public & Products Liability',
    form: {
      name: 'Public & Products Liability',
      steps: [
        {
          title: 'Public & Products Liability',
          fields: [
            { label: 'Is public & products liability cover required', kind: 'picklist', value: 'Public & Products Liability' },
            { label: 'Trade 1 Turnover', kind: 'currency', value: '1600' },
            { label: 'Turnover derived from heat work', kind: 'currency', value: '1600' },
            { label: 'Annual payments to bona fide sub contractors', kind: 'currency', value: '1600' },
            { label: 'Annual cost of materials', kind: 'currency', value: '1600' },
          ],
          action: 'Next',
        },
        {
          title: 'Covers & Excess',
          fields: [
            { label: 'design turnover exceed 10%', kind: 'radio', value: 'No' },
            { label: 'turnover solely from fees only', kind: 'radio', value: 'No' },
            { label: 'financial loss extension', kind: 'radio', value: 'No' },
            { label: 'defective workmanship extension', kind: 'radio', value: 'No' },
            { label: 'professional indemnity extension', kind: 'radio', value: 'No' },
            { label: 'Heat Excess', kind: 'picklist', value: '1,000' },
            { label: 'Water Damage Excess', kind: 'picklist', value: '1,000' },
            { label: 'Underground Services Excess', kind: 'picklist', value: '1,000' },
            { label: 'All other third party property damage claims excess', kind: 'picklist', value: '1,000' },
            { label: 'Limit of liability required', kind: 'picklist', value: '2,000,000' },
          ],
          action: 'Save',
        },
      ],
    },
  },
  // C) Terrorism — terrorism cover with contract value and zone selection.
  {
    addRowName: 'Terrorism',
    form: {
      name: 'Terrorism',
      steps: [
        {
          title: 'Coverage Questions',
          fields: [
            { label: '*Cover Type', kind: 'picklist', value: 'Terrorism' },
            { label: 'Law and Jurisdiction', kind: 'readonly', value: '' },
            { label: 'Contract Value', kind: 'text', value: '1000000' },
            { label: '*Zone', kind: 'picklist', value: 'A' },
            { label: '*Floating or Specific Contract', kind: 'radio', value: 'Floating' },
            { label: '*If Sum Insured or First Loss Limit', kind: 'picklist', value: 'Sum Insured' },
          ],
          action: 'Save',
        },
      ],
    },
  },
];

/** EL Trade Details row (labels are live-verified literals). */
export const CC2_EL_TRADE = {
  tradeDescription: 'Aerial & Satellite Erection',
  wageroll: '123.00',
  headcount: '14.00',
};

// D) Property Damage — on the "<insured> - United Kingdom" risk-location card.
export const CC2_PD_COVERAGE: RenoCoverage = {
  addRowName: 'Property Damage',
  form: {
    name: 'Property Damage',
    steps: [
      {
        title: 'Coverage Questions',
        fields: [
          { label: 'What level of property cover is required', kind: 'picklist', value: 'Option 2' },
          { label: 'NACOSS approved alarm system', kind: 'radio', value: 'Yes' },
          { label: 'Property Excess', kind: 'picklist', value: '350' },
        ],
        action: 'Save',
      },
    ],
  },
};

// E) Professional Indemnity (Optional) — optional coverage with compliance questions.

/** Second, coverage-less insurable (doc §2.4) — its modal is single-step
 *  (Save; no "Care Specific Questions" step like the Care org). */
export const CC2_SECOND_LOCATION = {
  insurableName: 'Test',
  addressSearch: 'London, UK',
  addressLine: 'London',
  city: 'London',
  countyState: 'Greater London',
  postcode: 'ec3a2bj', // doc types it lowercase
  country: 'United Kingdom',
  latitude: '51.5072178',
  longitude: '-0.1275862',
};

// ---------------------------------------------------------------------------
// Premiums — configured per SRM variant requirements.
// ---------------------------------------------------------------------------

export const CC2_MINIMUM_DEPOSIT = 'Yes';

export const CC2_PREMIUMS: RenoPremiumEntry[] = [
  { coverage: 'Employers Liability', insurable: '', technical: '1500.24', grossWritten: '56.31', annualized: '10012.32', commissionRate: '1.26457687' },
  { coverage: 'Public & Products Liability', insurable: '', technical: '1300.61', grossWritten: '17.27', annualized: '1245.21', commissionRate: '12.67127689' },
  { coverage: 'Terrorism', insurable: '', technical: '1007.66', grossWritten: '541.12', annualized: '713.54', commissionRate: '4.5' },
  { coverage: 'Property Damage', insurable: 'UK Test Insured', technical: '3127.67', grossWritten: '1431.87', annualized: '1234.54', commissionRate: '3.1' },
];

// ---------------------------------------------------------------------------
// Binders — strict per-coverage mode (BindersPage 3rd ctor arg). REST-verified
// live sections on newprodqa2: EL/PPL/CAR map via BOTH Accelerant Oliva
// Construction 2024 AND Accelerant C&C 2026 (sect Contractors Combined);
// Property Damage maps ONLY via Allianz Contractors Combined 2026 (sect
// Property Damage). Doc's 2023 binders don't exist here → 2024/2026 analogs.
// ---------------------------------------------------------------------------

export const CC2_BINDERS: BinderChoice[] = [
  { coverage: 'Employers Liability', name: 'Accelerant', section: 'Contractors Combined', nrToBinder: 'New Business' },
  { coverage: 'Public & Products Liability', name: 'Accelerant', section: 'Contractors Combined', nrToBinder: 'New Business' },
  //{ coverage: 'Contractors All Risks', name: 'Accelerant', section: 'Contractors Combined', nrToBinder: 'New Business' },
  { coverage: 'Terrorism', name: 'AXA XL Contractors', section: 'Section C - Terrorism - CONC & CARA', nrToBinder: 'New Business' },
  { coverage: 'Property Damage', name: 'Allianz Contractors Combined 2023', section: 'Property Damage', nrToBinder: 'New Business' },
];

/** Default binder for BindersPage's 2nd ctor arg (unused in strict mode but
 *  required by the signature). */
export const CC2_BINDER_DEFAULT = CC2_BINDERS[0];

// ---------------------------------------------------------------------------
// Fees — THREE fees: Survey + DNA+ (required due to CAR) + Admin (standard).
// Org picklists (REST describe 22/07/2026): Type = DUAL Fee | Carrier Fee |
// Third Party Fee; Sub Type = DUAL DNA+ Fee | Lead Survey Engineering Fee(s) |
// Legal Fee | Sanctiekosten | Survey Fee | Other Fee | DUAL Policy/Admin Fee.
// Valid payable/administered combos: Insured/DUAL, DUAL/DUAL,
// DUAL/Intermediary (doc-captured validation).
// ---------------------------------------------------------------------------

export const CC2_FEES = [
  {
    type: 'Third Party Fee',
    subType: 'Survey Fee',
    payableBy: 'Insured',
    administeredBy: 'DUAL',
    includedInGwp: 'No',
    charged: '155',
    description: 'Testing Fees',
  },
  {
    type: 'Third Party Fee',
    subType: 'DUAL DNA+ Fee',
    // Conditional OmniScript field for the DNA+ sub-type; org records show 50
    // (live-diagnosed 22/07/2026 — save silently fails without it).
    // CAR coverage sets "Is DUAL DNA+ Required = Yes" → DNA+ fee is mandatory.
    dnaPaymentAmount: '50',
    payableBy: 'Insured',
    administeredBy: 'DUAL',
    includedInGwp: 'No',
    charged: '190',
    description: 'Testing Fees',
  },
  {
    type: 'DUAL Fee',
    subType: 'DUAL Policy/Admin Fee',
    payableBy: 'Insured',
    administeredBy: 'DUAL',
    includedInGwp: 'Yes',
    charged: '100',
    description: 'Testing Fees',
  },
];

// ---------------------------------------------------------------------------
// UAL config for QuoteStatusPage (UW5 login should self-clear UAL).
// ---------------------------------------------------------------------------

export const CC2_UAL = {
  approverName: 'T-0016-UAT2-SCC-CON-UW5 Auto-Provar',
  approverSearchTerms: ['T-0016-UAT2', 'CON-UW5', 'T-0016', 'Auto-Provar', 'Provar'],
  errorToastText: 'Status cannot be changed as there are outstanding UAL/Carrier Referrals',
};

/** Assertion anchors. */
export const CC2_EXPECTATIONS = {
  submissionRiskIdPattern: /DOU\/\d+\/CONC\/\d+/,
  quoteRiskIdPattern: /DOU\/\d+\/CONC\/\d+\/\d+/,
  dualShareGwp: 'GBP', // Updated GWP expectation with 6 coverages + 3 fees
  status: 'In Force',
};

/** MTA — Mid-term Adjustment lifecycle configuration. */
export const CC2_MTA = {
  effectiveOffsetDays: 3,
  submissionOffsetDays: 0,
  submissionTime: '09:00:00',
  reason: 'Exposure/Limit Changes',
  description: 'Test MTA',
  chargePremium: '10',
  policyNewMtaRenewal: 'MTA',
  policyStatus: 'In Force',
};

/** Cancellation — applied to the policy. */
export const CC2_CANCELLATION = {
  category: 'Cancel the Policy from Inception',
  instigatedBy: 'Customer',
  reason: 'Product Too Expensive',
  notes: 'Test Cancellation',
  returnFullPremium: 'Yes',
  returnFees: 'Yes',
  policyStatus: 'Cancelled',
};

// SRM lifecycle facade so VariantSRM tests can import from cc2DataSRM directly.
export { CNR, RENEWAL, CANCELLATION } from './testdata';
