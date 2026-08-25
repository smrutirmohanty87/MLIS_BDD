import { OmniForm, RenoCoverage } from './renoTypes';
import { RenoPremiumEntry } from './renoData';

/**
 * Test data for the Oliva "Contractors Combined" (CONC) New Business flow on
 * the newprodqa2 sandbox — from `For creating policy for Contractors Combined
 * Product.docx` (40 screenshots catalogued in scratchpad cc_coverage_catalog.md;
 * images 2–22 + 40 are NATIVE newprodqa2 captures) + live org exploration.
 *
 * CONC deltas vs CARP: insured "UK Test Insured", Risk Type "Insurance (XoL)",
 * a 5-step Contractors Combined questionnaire, ONE coverage (Public & Products
 * Liability, 2-step form), FOUR available binders (must pick "Accelerant
 * Construction & Commercial 2026" by NAME), FULL per-RBS approval + the bulk
 * confirm button, and the same three fees.
 */

// ---------------------------------------------------------------------------
// Account / submission wizard
// ---------------------------------------------------------------------------

export const CC_ACCOUNT = {
  name: process.env.CC_ACCOUNT_NAME ?? 'HOWDEN INSURANCE BROKERS LIMITED',
  // For SIT: use CC_INTERMEDIARY_CONTACT env var to support environment-specific
  // intermediary contact (required when Intermediary and Introducer accounts share
  // the same name; browser UI will disambiguate via the contact name).
  intermediaryContact: process.env.CC_INTERMEDIARY_CONTACT ?? 'James Chambers',
};

export const CC_CLIENT_INFO = {
  // Doc's native screenshots show "UK Test Insured", but the live-verified
  // existing client offered by the typeahead on newprodqa2 is "PG Test
  // Insured" (confirmed during CONC exploration itself).
  insuredName: 'UK Test Insured',
  industrySector: 'Construction',
  activityCode: 'Aerial & Satellite Erection',
  product: 'Contractors Combined',
  businessDescription: 'Test Reference',
  yearBusinessEstablished: '2026',
  employeeSize: '90',
  clientTurnover: '900000',
  clientClassificationType: 'Consumer',
};

export const CC_RISK_INFO = {
  riskType: 'Insurance (XoL)',
  intermediaryReference: 'Test Reference',
  // Doc image 4 leaves this blank (and it is blank on the created policy,
  // image 40) — empty string makes the wizard skip the field.
  insurerQuotePolicyReference: '',
};

export const CC_INSURABLE = {
  // NOT the insured name: on Contractors Combined the 6 optional coverages
  // (EL, P&PL, CAR, PI, Terrorism, Legal Expenses) live under the
  // "Contractors Combined" PRODUCT card's Show Coverages — the risk-location
  // card ("PG Test Insured - United Kingdom") only offers Property Damage.
  // This value is the card text addRenoCoverage scopes to.
  insurableName: 'Contractors Combined',
};

// ---------------------------------------------------------------------------
// Product Questions — 5-step OmniScript (images 9–13)
// ---------------------------------------------------------------------------

export const CC_PRODUCT_FORM: OmniForm = {
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
        { label: 'coronavirus/communicable disease', kind: 'radio', value: 'Yes' },
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
// Coverage — SIX product coverages + Property Damage (risk-location card)
// ---------------------------------------------------------------------------

export const CC_COVERAGES: RenoCoverage[] = [
  // A) Employers Liability — Trade Details grid row is handled by fillElTradeRow()
  // helper (called in test before forms.fill) to work around the generic engine's
  // difficulty targeting the row's combobox. Trade fields marked readonly to skip
  // generic filling.
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
            // Trade Details grid row is handled by fillElTradeRow() helper
            { label: 'Trade Description', kind: 'readonly', value: 'Agricultural Contractors' },
            { label: '(Name of trade description) wageroll', kind: 'readonly', value: '600' },
            { label: '(Name of trade description) headcount', kind: 'readonly', value: '600' },
          ],
          action: 'Save',
        },
      ],
    },
  },
  // B) Public & Products Liability
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
  // C) Contractors All Risks
  {
    addRowName: 'Contractors All Risks',
    form: {
      name: 'Contractors All Risks',
      steps: [
        {
          title: 'Coverage Questions',
          fields: [
            { label: 'Is contract works cover required', kind: 'radio', value: 'Yes' },
            { label: 'Maximum Contract Value', kind: 'currency', value: '1000' },
            { label: 'Maximum contract period (months)', kind: 'text', value: '300' },
            { label: 'Is employees tools cover required', kind: 'radio', value: 'Yes' },
            { label: 'Total value of employees tools', kind: 'currency', value: '1000' },
            { label: 'Maximum sum insured employees tools per employee', kind: 'currency', value: '1000' },
            { label: 'Employees Tools Excess', kind: 'picklist', value: '1000' },
            { label: 'Is own plant cover required', kind: 'radio', value: 'Yes' },
            { label: 'Total value of own plant', kind: 'currency', value: '1000' },
            { label: 'Is DUAL DNA+ Required', kind: 'radio', value: 'Yes' },
            { label: 'Number of new DUAL DNA+ kits required', kind: 'picklist', value: '15' },
            { label: 'DNA+ Lifecycle', kind: 'picklist', value: '3' },
            { label: 'Is hired in plant cover required', kind: 'radio', value: 'Yes' },
            { label: 'Annual Hiring Fees', kind: 'currency', value: '1000' },
            { label: 'Hired in plant maximum accident value', kind: 'currency', value: '1000' },
            { label: 'Theft & malicious damage excess', kind: 'picklist', value: '1000' },
            { label: 'All other car claims excess', kind: 'picklist', value: '1000' },
          ],
          action: 'Save',
        },
      ],
    },
  },
  // D) Professional Indemnity
  {
    addRowName: 'Professional Indemnity',
    form: {
      name: 'Professional Indemnity',
      steps: [
        {
          title: 'Coverage Questions',
          fields: [
            { label: 'Does the business comply with GDPR regulations', kind: 'radio', value: 'Yes' },
            { label: 'Business have <10 properties/leases and all located within the UK and NI', kind: 'radio', value: 'Yes' },
            { label: 'The business is domiciled within the UK and NI', kind: 'radio', value: 'Yes' },
            { label: 'Is the insured a main contractor/property developer', kind: 'radio', value: 'Yes' },
          ],
          action: 'Save',
        },
      ],
    },
  },
  // E) Legal Expenses
  {
    addRowName: 'Legal Expenses',
    form: {
      name: 'Legal Expenses',
      steps: [
        {
          title: 'Coverage Questions',
          fields: [
            { label: 'Does the business comply with GDPR regulations', kind: 'radio', value: 'Yes' },
            { label: 'Business have <10 properties/leases and all located within the UK and NI', kind: 'radio', value: 'Yes' },
            { label: 'The business is domiciled within the UK and NI', kind: 'radio', value: 'Yes' },
            { label: 'Is contract & debt recovery cover required', kind: 'radio', value: 'Yes' },
            { label: 'Is the insured a main contractor/property developer', kind: 'radio', value: 'Yes' },
          ],
          action: 'Save',
        },
      ],
    },
  },
  // F) Terrorism
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

// Property Damage — on the "UK Test Insured - United Kingdom" risk-location card
export const CC_PD_COVERAGE: RenoCoverage = {
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

// ---------------------------------------------------------------------------
// Premiums — Minimum & Deposit = Yes; all coverages included
// ---------------------------------------------------------------------------

export const CC_PREMIUMS: RenoPremiumEntry[] = [
  { coverage: 'Employers Liability', insurable: '', technical: '457.22', grossWritten: '457.22', annualized: '', commissionRate: '5' },
  { coverage: 'Public & Products Liability', insurable: '', technical: '1247.44', grossWritten: '1247.44', annualized: '', commissionRate: '5' },
  { coverage: 'Contractors All Risks', insurable: '', technical: '467.77', grossWritten: '467.77', annualized: '', commissionRate: '5' },
  { coverage: 'Professional Indemnity', insurable: '', technical: '167.44', grossWritten: '167.44', annualized: '', commissionRate: '5' },
  { coverage: 'Legal Expenses', insurable: '', technical: '666.44', grossWritten: '666.44', annualized: '', commissionRate: '5' },
  { coverage: 'Terrorism', insurable: '', technical: '299.99', grossWritten: '299.99', annualized: '', commissionRate: '1' },
  { coverage: 'Property Damage', insurable: 'UK Test Insured', technical: '999.99', grossWritten: '999.99', annualized: '', commissionRate: '5' },
];

/** "Is any part of policy Minimum & Deposit?" — Yes (image18). */
export const CC_MINIMUM_DEPOSIT = 'Yes';

// ---------------------------------------------------------------------------
// Binders — per-coverage selection (BindersPage strict mode)
// ---------------------------------------------------------------------------

export const CC_BINDERS = [
  { coverage: 'Employers Liability', name: 'Accelerant Construction & Commercial 2026', section: 'Contractors Combined', nrToBinder: 'New Business' },
  { coverage: 'Public & Products Liability', name: 'Accelerant Construction & Commercial 2026', section: 'Contractors Combined', nrToBinder: 'New Business' },
  { coverage: 'Contractors All Risks', name: 'Accelerant Construction & Commercial 2026', section: 'Contractors Combined', nrToBinder: 'New Business' },
  { coverage: 'Professional Indemnity', name: 'HCC Contractors Combined 2023', section: 'Contractors Combined', nrToBinder: 'New Business' },
  { coverage: 'Legal Expenses', name: 'ARAG Legal Expenses 2023', section: 'Contractors Combined', nrToBinder: 'New Business' },
  { coverage: 'Terrorism', name: 'AXA XL Contractors 2026', section: 'Section C – Terrorism – CONC & CARA', nrToBinder: 'New Business' },
  { coverage: 'Property Damage', name: 'Allianz Contractors Combined 2023', section: 'Property Damage', nrToBinder: 'New Business' },
];

/** Default binder for BindersPage 2nd ctor arg (unused in strict mode but required) */
export const CC_BINDER_DEFAULT = CC_BINDERS[0];

// ---------------------------------------------------------------------------
// Fees — same three as CARP (doc text; no fee screenshots in this doc).
// ---------------------------------------------------------------------------

export const CC_FEES = [
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
// UAL / users / policy expectations — same Construction org setup.
// ---------------------------------------------------------------------------

export const CC_UAL = {
  approverName: 'T-0016-SIT2-SCC-CON-UW5 Auto-Provar',
  approverSearchTerms: ['t-0016', 'T-0016-SIT2-SCC-CON-UW5', 'T-0016'],
  errorToastText: 'Status cannot be changed as there are outstanding UAL/Carrier Referrals',
};

export const CC_USERS = {
  uw3: process.env.SF_CONS_UW3 ?? 't-0011-con-uw3-auto-provar@scc.sit',
  uw5: process.env.SF_CONS_UW5 ?? 't-0016-con-uw5-auto-provar@scc.sit',
};

/** EL Trade Details row (labels are live-verified literals). */
export const CC_EL_TRADE = {
  tradeDescription: 'Agricultural Contractors',
  wageroll: '600',
  headcount: '600',
};

export const CC_POLICY_EXPECTATIONS = {
  status: 'In Force',
  newMtaRenewal: 'New Business',
  // Doc image 40 also highlights the Risk ID and Product on the policy.
  product: 'Contractors Combined',
  riskIdPattern: /DOU\/\d+\/CONC\/\d+\/\d+/,
};

/**
 * MTA — Mid-term Adjustment on Contractors Combined policy.
 */
export const CC_MTA = {
  effectiveOffsetDays: 3,
  submissionOffsetDays: 0,
  submissionTime: '09:00:00',
  reason: 'Exposure/Limit Changes',
  description: 'Test MTA',
  policyNewMtaRenewal: 'MTA',
  policyStatus: 'In Force',
  chargePremiums: [
    { coverage: 'Employers Liability', chargePremium: '22.86' },
    { coverage: 'Public & Products Liability', chargePremium: '62.37' },
    { coverage: 'Contractors All Risks', chargePremium: '23.39' },
    { coverage: 'Professional Indemnity', chargePremium: '8.37' },
    { coverage: 'Legal Expenses', chargePremium: '33.32' },
    { coverage: 'Terrorism', chargePremium: '15.00' },
    { coverage: 'Property Damage', chargePremium: '50.00' },
  ],
};

/**
 * Cancellation — applied after MTA.
 * Cancels the policy from inception with full premium return.
 */
export const CC_CANCELLATION = {
  category: 'Cancel this MTA Only',
  instigatedBy: 'Customer',
  reason: 'Product Unsuited/Misunderstood',
  notes: 'Test Reference Cancellation',
  returnFullPremium: 'Yes',
  policyStatus: 'Cancelled',
};
