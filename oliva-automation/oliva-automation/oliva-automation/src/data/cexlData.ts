/**
 * Test data for the Oliva Construction "Contractors Excess Layer" New Business E2E scenario.
 * Values transcribed EXACTLY from the "Contractors Excess Layer" coverage questionnaire
 * catalog (CEXL_coverage_catalog.md), which is the ground-truth extraction of
 * screenshots image3–image62 from the SIT sandbox walk-through.
 *
 * The product-level "Contractors Excess Layer" questionnaire (8 steps, Section A) and the 9
 * per-coverage "Coverage Questions" forms (Section B) are expressed as
 * `OmniForm` data and driven by the generic OmniScriptFormPage engine.
 *
 * Conventions (matching testdata.ts):
 *  - Readonly / display-only fields and the per-coverage "Remove Coverage" /
 *    "Remove Insurable" checkboxes are OMITTED (the engine skips them).
 *  - Currency values are stored as plain numbers WITHOUT thousands separators
 *    (e.g. '167985.66', not '167,985.66').
 *  - Dates are computed at runtime and therefore omitted here.
 */

import { OmniForm, RenoCoverage } from './renoTypes';

// ---------------------------------------------------------------------------
// Account / submission wizard
// ---------------------------------------------------------------------------

export const CEXL_ACCOUNT = {
  name: process.env.CEXL_ACCOUNT_NAME ?? 'HOWDEN INSURANCE BROKERS LIMITED',
  intermediaryContact: process.env.CEXL_INTERMEDIARY_CONTACT ?? 'James Chambers',
};

/** Submission wizard "Client Information" step (images 3–4). */
export const CEXL_CLIENT_INFO = {
  createNewClient: 'No' as const,
  insuredName: 'UK Test Insured',
  submissionThroughRegionalCommercial: 'No',
  underwritingDivision: 'Property',
  highLevelClassOfBusiness: 'Construction',
  industrySector: 'Construction',
  activityCode: 'Aerial & Satellite Erection',
  product: 'Contractors Excess Layer',
  businessDescription: 'Test Reference',
  yearBusinessEstablished: '2026',
  employeeSize: '90',
  clientTurnover: '9000000',
  clientClassificationType: 'Consumer',
};

/** Submission wizard "Risk Information" step. Dates computed at runtime. */
export const CEXL_RISK_INFO = {
  riskType: 'Insurance',
  subscription: 'No',
  newOrRenewal: 'New Business',
  inceptionTime: '00:00:00',
  expiryTime: '23:59:00',
  intermediaryReference: 'Test Reference',
  insurerQuotePolicyReference: 'Test Reference',
  submissionCurrency: 'GBP',
};

/** Insurable Detail (risk location) — image10. */
export const CEXL_INSURABLE = {
  insurableName: 'UK Test Insured',
  addressLine: 'Queen Margaret University, Queen Margaret University Drive',
  city: 'Musselburgh',
  countyState: '',
  postcode: 'EH21 6UU',
  country: 'United Kingdom',
};

// ---------------------------------------------------------------------------
// Section A — Product-level "Contractors Excess Layer" questionnaire (8 steps, A1–A8)
// Launched from Coverages tab › Product Questions "Contractors Excess Layer" › Edit.
// ---------------------------------------------------------------------------

export const CEXL_PRODUCT_FORM: OmniForm = {
  name: 'Contractors Excess Layer Questionnaire',
  steps: [
    // A1. Oliva Standard Questions (image12)
    {
      title: 'Oliva Standard Questions',
      fields: [
        { label: 'Contractors Company Website Checked?', kind: 'radio', value: 'Yes' },
        {
          label:
            'Insured ever declared bankrupt/gone into liquidation/administration?',
          kind: 'radio',
          value: 'No',
        },
        {
          label:
            'Has an Insurer ever declined to issue or renew a policy or imposed special Terms or conditions?',
          kind: 'radio',
          value: 'No',
        },
        {
          label:
            'Has an insured ever been convicted or charged with any criminal offence (other than a motoring offence)?',
          kind: 'radio',
          value: 'No',
        },
      ],
      action: 'Next',
    },
    // A2. Proposer Details (image13)
    {
      title: 'Proposer Details',
      fields: [
        { label: 'Is the proposer a business?', kind: 'picklist', value: 'Yes' },
        { label: 'Full Name', kind: 'text', value: 'Test Reference 123456789!' },
      ],
      action: 'Next',
    },
    // A3. Contractors Excess Layer Main (image14) — Contract Employer + Construction Site
    // Address are readonly and therefore omitted.
    {
      title: 'Contractors Excess Layer Main',
      fields: [
        {
          label: 'Full description of works to be undertaken',
          kind: 'textarea',
          value: 'Test Reference 123456789!',
        },
        {
          label: 'Contract Main Contractor(s)',
          kind: 'text',
          value: 'Test Reference 123456789!',
        },
        { label: 'Contract Period (Months)', kind: 'number', value: '365' },
        { label: 'Maintenance Period (Months)', kind: 'number', value: '365' },
        { label: 'Product Rating Type', kind: 'picklist', value: 'Contractors Excess Layer Package' },
        { label: 'Interested Parties', kind: 'text', value: 'Test Reference 123456789!' },
        {
          label: 'What type of building contract will be used?',
          kind: 'picklist',
          value: 'Building Contract of Other Written Form',
        },
        {
          label:
            'Does the contract require the insurance to be in joint names with contractor?',
          kind: 'radio',
          value: 'Yes',
        },
      ],
      action: 'Next',
    },
    // A4. Contractors Excess Layer Cont. (image15)
    {
      title: 'Contractors Excess Layer Cont.',
      fields: [
        {
          label:
            'Describe the location of the Contract Site (e.g. residential street)',
          kind: 'text',
          value: 'Test Reference 123456789!',
        },
        {
          label:
            'How often will the contract site be visited during the Construction Period?',
          kind: 'text',
          value: 'Test Reference 123456789!',
        },
        {
          label:
            'Detail the security in place at the Contract Site during the Construction Period',
          kind: 'text',
          value: 'Test Reference 123456789!',
        },
        { label: 'Property Type', kind: 'picklist', value: 'Office' },
        {
          label: 'What is the maximum height worked to (metres)?',
          kind: 'number',
          value: '2000',
        },
        {
          label: 'What is the maximum depth worked to (metres)?',
          kind: 'number',
          value: '2000',
        },
        {
          label: 'What % of the contract relates to the application of heat?',
          kind: 'number',
          value: '100',
        },
        {
          label:
            'What is the intention for the property upon completion of the works?',
          kind: 'picklist',
          value: 'Commercial Use',
        },
        {
          label: 'Will the property be occupied during the construction period?',
          kind: 'picklist',
          value: 'Yes - Living in the property',
        },
        { label: 'Flood checks returned as ok to quote?', kind: 'radio', value: 'Yes' },
      ],
      action: 'Next',
    },
    // A5. Basement Work (image16)
    {
      title: 'Basement Work',
      fields: [
        {
          label: 'Construction or alteration of any basements?',
          kind: 'radio',
          value: 'Yes',
        },
        {
          label: 'Please confirm name and company details',
          kind: 'text',
          value: 'Test Reference 123456789!',
        },
      ],
      action: 'Next',
    },
    // A6. Timber Work (image17)
    {
      title: 'Timber Work',
      fields: [
        {
          label:
            'Construction of timber framed buildings other than roof trusses?',
          kind: 'radio',
          value: 'Yes',
        },
        {
          label: 'If the answer is "Yes" please provide full details',
          kind: 'text',
          value: 'Test Reference 123456789!',
        },
        {
          label: 'What is the single fire area exposure?',
          kind: 'text',
          value: '12345.00',
        },
        {
          label: 'Type of timber',
          kind: 'picklist',
          value: 'Cross-laminated timber',
        },
      ],
      action: 'Next',
    },
    // A7. Types of Work (image18)
    {
      title: 'Types of Work',
      fields: [
        {
          label: 'Demolition of buildings or part of a building?',
          kind: 'radio',
          value: 'Yes',
        },
        {
          label:
            'Construction, alteration or repair of high risk contracts (e.g. bridges etc)?',
          kind: 'radio',
          value: 'Yes',
        },
        {
          label: 'Pile driving, quarrying or use of explosives?',
          kind: 'radio',
          value: 'Yes',
        },
        {
          label:
            'Handling, removal, storage/transportation of asbestos/silica?',
          kind: 'radio',
          value: 'Yes',
        },
        {
          label: 'If the answer is "Yes" to any of the above questions provide full details',
          kind: 'text',
          value: 'Test Reference 123456789!',
        },
      ],
      action: 'Next',
    },
    // A8. Additional Information (image19) — final step, Save.
    {
      title: 'Additional Information',
      fields: [
        {
          label: 'Is underpinning to be undertaken as part of this contract?',
          kind: 'radio',
          value: 'No',
        },
        { label: 'Have the contract works already begun?', kind: 'radio', value: 'No' },
        {
          label:
            'Details of any other facts that could be considered material to this proposal?',
          kind: 'radio',
          value: 'No',
        },
      ],
      action: 'Save',
    },
  ],
};

// Section B — Per-coverage "Coverage Questions" OmniScripts
// ---------------------------------------------------------------------------

const CEXL_COVERAGES_ALL: RenoCoverage[] = [
  // Coverage 1 — Excess Employers Liability
  {
    addRowName: 'Excess Employers Liability',
    form: {
      name: 'Excess Employers Liability',
      steps: [
        {
          title: 'Coverage Questions',
          fields: [
            { label: 'Territorial Limits', kind: 'picklist', value: 'Worldwide' },
            { label: 'Total wageroll (next 12 months)', kind: 'number', value: '100000' },
            { label: 'Total number of employees', kind: 'number', value: '500' },
            { label: 'Maximum number of employees at any one location', kind: 'number', value: '100' },
            { label: 'Primary Insurer', kind: 'picklist', value: 'Accelerant', nth: 0 },
            { label: 'Primary Insurer Premium', kind: 'number', value: '1000' },
            { label: 'Primary Premium Type', kind: 'picklist', value: 'Gross' },
            { label: 'Primary Limit Of Liability', kind: 'number', value: '1000000' },
            {
              label: 'Limit Type',
              kind: 'picklist',
              value: 'Any one occurrence',
            },
            { label: 'Excess limit required under this policy', kind: 'number', value: '1000' },
          ],
          action: 'Save',
        },
      ],
    },
  },
  // Coverage 2 — Excess Public & Products Liability
  {
    addRowName: 'Excess Public & Products Liability',
    form: {
      name: 'Public & Products Liability',
      steps: [
        {
          title: 'Coverage Questions',
          fields: [
            { label: 'Territorial Limits', kind: 'picklist', value: 'Worldwide' },
            { label: 'Total Turnover', kind: 'number', value: '100000' },
            {
              label: 'Is there any overseas turnover',
              kind: 'radio',
              value: 'Yes',
            },
            {
              label: 'Is the insured involved in heat work away from their own premises',
              kind: 'radio',
              value: 'Yes',
            },
            { label: 'Primary Insurer', kind: 'picklist', value: 'Accelerant', nth: 0 },
            { label: 'Underlying Policy Number', kind: 'number', value: '23234' },
            { label: 'Primary Insurer Premium', kind: 'number', value: '1000' },
            { label: 'Primary Premium Type', kind: 'picklist', value: 'Gross' },
            { label: 'Primary Limit Of Liability', kind: 'number', value: '1000000' },
            {
              label: 'Limit Type',
              kind: 'picklist',
              value: 'Any one occurrence',
            },
            { label: 'Excess limit required under this policy', kind: 'number', value: '1000' },
          ],
          action: 'Save',
        },
      ],
    },
  },
];

export const CEXL_COVERAGES: RenoCoverage[] = CEXL_COVERAGES_ALL;


// ---------------------------------------------------------------------------
// Enter Premiums (images 33–38)
// ---------------------------------------------------------------------------

export interface CEXLPremiumEntry {
  coverage: string;
  insurable: string;
  technical: string;
  grossWritten: string;
  annualized: string;
  commissionRate: string;
}

/** Top picklist "Is any part of policy Minimum & Deposit?" = No. */
export const CEXL_MINIMUM_DEPOSIT = 'Yes';

/**
 * One entry per coverage (2). technical = grossWritten = annualized = the
 * coverage's Gross Written premium. Commission rate = 5.
 */
const CEXL_PREMIUMS_ALL: CEXLPremiumEntry[] = [
  { coverage: 'Excess Employers Liability', insurable: '', technical: '200.00', grossWritten: '200.00', annualized: '', commissionRate: '5' },
  { coverage: 'Excess Public & Products Liability', insurable: '', technical: '150.00', grossWritten: '150.00', annualized: '', commissionRate: '5' },
];

export const CEXL_PREMIUMS: CEXLPremiumEntry[] = CEXL_PREMIUMS_ALL;


// ---------------------------------------------------------------------------
// Downstream workflow — Select Binders / Fee / UAL / users / expectations
// ---------------------------------------------------------------------------

/** Select Binders tab (images 39–40) — per-coverage binder selections. */
interface CEXLBinderChoice {
  coverage: string;
  name: string;
  section: string;
  nrToBinder: string;
}

export const CEXL_BINDERS_ALL: CEXLBinderChoice[] = [
  { coverage: 'Excess Employers Liability', name: 'AIG Excess TOBA', section: 'AIG Excess TOBA', nrToBinder: 'New Business' },
  { coverage: 'Excess Public & Products Liability', name: 'AIG Excess TOBA', section: 'AIG Excess TOBA', nrToBinder: 'New Business' },
];

export const CEXL_BINDERS: CEXLBinderChoice[] = CEXL_BINDERS_ALL;

/** Default CEXL binder for backward compat (used as fallback when specific coverage not found). */
export const CEXL_BINDER = CEXL_BINDERS[0];


/** Fee entry OmniScript (image50). */
export const CEXL_FEES = [
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

/**
 * UAL (Underwriting Authority Limit) conditional branch (image57).
 * Used ONLY when marking the quote stage fails with the error toast below.
 * Approver name varies by environment (read from env or use default).
 */
export const CEXL_UAL = {
  approverName: process.env.CEXL_APPROVER_NAME ?? 'T-0016-SIT2-SCC-CON-UW5 Auto-Provar',
  approverSearchTerms: process.env.CEXL_APPROVER_SEARCH_TERMS?.split(',') ?? ['t-0016', 'T-0016-SIT2-SCC-CON-UW5', 'T-0016'],
  errorToastText:
    'Status cannot be changed as there are outstanding UAL/Carrier Referrals',
};

/** Sandbox login users: UW3 does the build, UW5 approves the UAL referral.
 * Supports multi-environment via env vars: SF_USERNAME (UW3), SF_UAL_APPROVER_USERNAME (UW5)
 * Falls back to newprodqa2 defaults if not set.
 */
export const CEXL_USERS = {
  uw3: process.env.SF_USERNAME ?? 'oliva.cons.puw3@dualgroup.com.newprodqa2',
  uw5: process.env.SF_UAL_APPROVER_USERNAME ?? 'oliva.cons.puw5@dualgroup.com.newprodqa2',
};

export const CEXL_POLICY_EXPECTATIONS = {
  status: 'In Force',
  newMtaRenewal: 'New Business',
  product: 'Contractors Excess Layer',
};

/**
 * MTA (Mid-Term Adjustment) — applied to the NB policy created above.
 * Charge premium (10) is applied to every coverage's "100% MTA Charge Premium" field.
 * Effective date is 3 days from inception (policy inception = today).
 */
export const CEXL_MTA = {
  effectiveOffsetDays: 3,
  submissionOffsetDays: 0,
  submissionTime: '09:00:00',
  reason: 'Exposure/Limit Changes',
  description: 'Test MTA',
  policyNewMtaRenewal: 'MTA',
  policyStatus: 'In Force',
  chargePremiums: [
    { coverage: 'Excess Employers Liability', chargePremium: '10.00' },
    { coverage: 'Excess Public & Products Liability', chargePremium: '7.50' },
  ],
};

/**
 * CNR (Cancel & Re-issue) — applied to the MTA policy.
 * Note: When CNR is applied to an MTA policy, the New/MTA/Renewal field remains "MTA"
 * (not reset to "New Business" as in testdata.ts generic example).
 */
export const CEXL_CNR = {
  reasonForCandR: 'Other',
  description: 'Test CNR',
  policyNewMtaRenewal: 'MTA',
  policyStatus: 'In Force',
};

/** Employer Reference Number step. */
export const CEXL_ERN = {
  exempt: 'Yes',
  ern: 'NA',
};
