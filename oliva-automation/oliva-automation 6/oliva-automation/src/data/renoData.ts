/**
 * Test data for the Oliva Construction "Renovation" New Business E2E scenario.
 * Values transcribed EXACTLY from the "Renovation" coverage questionnaire
 * catalog (reno_coverage_catalog.md), which is the ground-truth extraction of
 * screenshots image3–image62 from the SIT sandbox walk-through.
 *
 * The product-level "Renovation" questionnaire (8 steps, Section A) and the 9
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

export const RENO_ACCOUNT = {
  name: process.env.RENO_ACCOUNT_NAME ?? 'HOWDEN INSURANCE BROKERS LIMITED',
  intermediaryContact: process.env.RENO_INTERMEDIARY_CONTACT ?? 'James Chambers',
};

/** Submission wizard "Client Information" step (images 3–4). */
export const RENO_CLIENT_INFO = {
  createNewClient: 'No' as const,
  insuredName: 'UK Test Insured',
  submissionThroughRegionalCommercial: 'No',
  underwritingDivision: 'Property',
  highLevelClassOfBusiness: 'Construction',
  industrySector: 'Construction',
  activityCode: 'Aerial & Satellite Erection',
  product: 'Renovation',
  businessDescription: 'Test Reference',
  yearBusinessEstablished: '2026',
  employeeSize: '90',
  clientTurnover: '9000000',
  clientClassificationType: 'Consumer',
};

/** Submission wizard "Risk Information" step. Dates computed at runtime. */
export const RENO_RISK_INFO = {
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
export const RENO_INSURABLE = {
  insurableName: 'UK Test Insured',
  addressLine: 'Queen Margaret University, Queen Margaret University Drive',
  city: 'Musselburgh',
  countyState: '',
  postcode: 'EH21 6UU',
  country: 'United Kingdom',
};

// ---------------------------------------------------------------------------
// Section A — Product-level "Renovation" questionnaire (8 steps, A1–A8)
// Launched from Coverages tab › Product Questions "Renovation" › Edit.
// ---------------------------------------------------------------------------

export const RENO_PRODUCT_FORM: OmniForm = {
  name: 'Renovation Questionnaire',
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
    // A3. Renovation Main (image14) — Contract Employer + Construction Site
    // Address are readonly and therefore omitted.
    {
      title: 'Renovation Main',
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
        { label: 'Product Rating Type', kind: 'picklist', value: 'Renovation Package' },
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
    // A4. Renovation Cont. (image15)
    {
      title: 'Renovation Cont.',
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

// ---------------------------------------------------------------------------
// Section B — Per-coverage "Coverage Questions" OmniScripts (coverages 1–9)
// ---------------------------------------------------------------------------

// ORG DEFECT (newprodqa2, verified 15/07/2026 via REST): the Terrorism product
// (Oliva-ConstructionTerrorism, 01tPu00000FtbhRIAR) has NO Binder_Section_
// Coverage__c mapping to ANY Renovation binder section, so a quote containing
// Terrorism can never pass Ready → Quote Issued ("Binders must be selected for
// all applicable coverages"). Included by default; set RENO_INCLUDE_TERRORISM=0
// to exclude if needed.
const INCLUDE_TERRORISM = process.env.RENO_INCLUDE_TERRORISM !== '0';

const RENO_COVERAGES_ALL: RenoCoverage[] = [
  // Coverage 1 — Contract Works (image20)
  {
    addRowName: 'Contract Works',
    form: {
      name: 'Contract Works',
      steps: [
        {
          title: 'Coverage Questions',
          fields: [
            { label: 'Sum Insured', kind: 'currency', value: '167985.66' },
            { label: 'Excess - fire', kind: 'picklist', value: '1,000' },
            { label: 'Excess - flood', kind: 'picklist', value: '1,000' },
            { label: 'Excess - water damage', kind: 'picklist', value: '1,000' },
            {
              label: 'Excess - all other damage or losses',
              kind: 'picklist',
              value: '1,000',
            },
            { label: 'Escalation Cost Limit %', kind: 'number', value: '100' },
          ],
          action: 'Save',
        },
      ],
    },
  },
  // Coverage 2 — Existing Structures (images 21–23), 3 steps
  {
    addRowName: 'Existing Structures',
    form: {
      name: 'Existing Structures',
      steps: [
        // B2.1 Existing Structures (image21)
        {
          title: 'Existing Structures',
          fields: [
            {
              label: 'Existing Structures Sum Insured',
              kind: 'currency',
              value: '167985.66',
            },
            { label: 'Is the building listed', kind: 'radio', value: 'No' },
            {
              label: 'Existing Structures Basis of Cover',
              kind: 'picklist',
              value: 'Full perils',
            },
            { label: 'Which Grade?', kind: 'picklist', value: 'Grade 1' },
            {
              label:
                "Select 'Type of Property' if 'Other' please provide details below",
              kind: 'picklist',
              value: 'Barn',
            },
            { label: 'Wall Construction', kind: 'text', value: '1300' },
            { label: 'Roof Construction', kind: 'text', value: '1300' },
            { label: 'Year of Build', kind: 'number', value: '2026' },
          ],
          action: 'Next',
        },
        // B2.2 Questions (image22)
        {
          title: 'Questions',
          fields: [
            {
              label:
                'Is the existing structure in a good state of repair and regularly maintained?',
              kind: 'radio',
              value: 'Yes',
            },
            {
              label:
                'Has the property ever suffered from subsidence, heave or landslip?',
              kind: 'radio',
              value: 'No',
            },
            {
              label:
                'Has the property or surrounding area ever suffered from flooding?',
              kind: 'radio',
              value: 'No',
            },
            {
              label:
                'Is the property showing any signs of structural movement or cracking?',
              kind: 'radio',
              value: 'No',
            },
            {
              label:
                'Is the property within 250 metres of any river, stream or tidal waters?',
              kind: 'radio',
              value: 'Yes',
            },
            {
              label:
                'Is the existing structure used for any business purpose which involves visitors attending the premises?',
              kind: 'radio',
              value: 'No',
            },
            {
              label: 'If "Yes" please provide full details',
              kind: 'text',
              value: 'Details for Automation',
            },
            {
              label:
                'Please provide any other relevant details regarding the existing structure',
              kind: 'text',
              value: 'Supporting DUR',
            },
            {
              label:
                'Do any neighbouring properties pose an increased fire risk to the existing structure under this proposal?',
              kind: 'radio',
              value: 'No',
            },
          ],
          action: 'Next',
        },
        // B2.3 Excesses (image23)
        {
          title: 'Excesses',
          fields: [
            { label: 'Excess - fire', kind: 'picklist', value: '250' },
            { label: 'Excess - water damage', kind: 'picklist', value: '250' },
            { label: 'Excess - flood', kind: 'picklist', value: '250' },
            {
              label: 'Excess - all other damage or losses',
              kind: 'picklist',
              value: '250',
            },
          ],
          action: 'Save',
        },
      ],
    },
  },
  // Coverage 3 — Contents (image24)
  {
    addRowName: 'Contents',
    form: {
      name: 'Contents',
      steps: [
        {
          title: 'Coverage Questions',
          fields: [
            {
              label: 'Contents Sum Insured',
              kind: 'currency',
              value: '160000',
            },
            { label: 'Excess - fire', kind: 'picklist', value: 'N/A' },
            { label: 'Excess - water damage', kind: 'picklist', value: 'N/A' },
            { label: 'Excess - flood', kind: 'picklist', value: 'N/A' },
            {
              label: 'Excess - all other damage or losses',
              kind: 'picklist',
              value: 'N/A',
            },
          ],
          action: 'Save',
        },
      ],
    },
  },
  // Coverage 4 — Advanced Loss of Profits/Delayed Start Up (image25)
  {
    addRowName: 'Advanced Loss of Profits/Delayed Start Up',
    form: {
      name: 'Advanced Loss of Profits/Delayed Start Up',
      steps: [
        {
          title: 'Coverage Questions',
          fields: [
            {
              label: 'Indemnity period required (months)',
              kind: 'number',
              value: '12',
            },
            { label: 'Deductible (days)', kind: 'number', value: '30' },
            {
              label: 'Limit of indemnity required',
              kind: 'currency',
              value: '100001.00',
            },
          ],
          action: 'Save',
        },
      ],
    },
  },
  // Coverage 5 — Own Plant (image26)
  {
    addRowName: 'Own Plant',
    form: {
      name: 'Own Plant',
      steps: [
        {
          title: 'Coverage Questions',
          fields: [
            {
              label: 'Total value of own plant to be insured',
              kind: 'currency',
              value: '265789',
            },
            {
              label: 'Excess for theft &/or malicious damage',
              kind: 'picklist',
              value: 'N/A',
            },
            {
              label: 'Excess - all other damage or losses',
              kind: 'picklist',
              value: '100',
            },
          ],
          action: 'Save',
        },
      ],
    },
  },
  // Coverage 6 — Hired in Plant (image27). NOTE: block header reads "Hired In
  // Plant" (capital I); the Add row / list read "Hired in Plant".
  {
    addRowName: 'Hired in Plant',
    form: {
      name: 'Hired in Plant',
      steps: [
        {
          title: 'Coverage Questions',
          fields: [
            {
              label: 'Maximum Accident Value',
              kind: 'currency',
              value: '69875.00',
            },
            {
              label: 'Hired in plant charges',
              kind: 'currency',
              value: '176354.00',
            },
            {
              label: 'Excess for theft &/or malicious damage',
              kind: 'picklist',
              value: 'N/A',
            },
            {
              label: 'Excess - all other damage or losses',
              kind: 'picklist',
              value: '100',
            },
          ],
          action: 'Save',
        },
      ],
    },
  },
  // Coverage 7 — Public & Products Liability (image28)
  {
    addRowName: 'Public & Products Liability',
    form: {
      name: 'Public & Products Liability',
      steps: [
        {
          title: 'Coverage Questions',
          fields: [
            {
              label: 'Limit of liability required',
              kind: 'picklist',
              value: '2,000,000',
            },
            {
              label: 'Public liability third party property damage excess',
              kind: 'picklist',
              value: '100',
            },
          ],
          action: 'Save',
        },
      ],
    },
  },
  // Coverage 8 — Terrorism (image29). Grouped Sum Insured table: each editable
  // amount is entered against its readonly category label.
  {
    addRowName: 'Terrorism',
    form: {
      name: 'Terrorism',
      steps: [
        {
          title: 'Coverage Questions',
          fields: [
            { label: 'Cover Type', kind: 'picklist', value: 'Terrorism' },
            { label: 'Contract Value', kind: 'currency', value: '4567.55' },
            { label: 'Existing Structure', kind: 'currency', value: '4573.44' },
            { label: 'DSU', kind: 'currency', value: '2369.55' },
            { label: 'ACOW', kind: 'currency', value: '4573' },
            { label: 'Zone', kind: 'picklist', value: 'B' },
            {
              label: 'Floating or Specific Contract',
              kind: 'radio',
              value: 'Specific Contract',
            },
            {
              label: 'If Sum Insured or First Loss Limit',
              kind: 'picklist',
              value: 'Sum Insured',
            },
          ],
          action: 'Save',
        },
      ],
    },
  },
  // Coverage 9 — JCT 6.5.1 Non Negligent Liability (images 30–31), 2 steps
  {
    addRowName: 'JCT 6.5.1 Non Negligent Liability',
    form: {
      name: 'JCT 6.5.1 Non Negligent Liability',
      steps: [
        // B9.1 Page 1 (image30)
        {
          title: 'Page 1',
          fields: [
            {
              label: 'Type of contract',
              kind: 'picklist',
              value: 'Extensions to Existing Buildings - other Buildings',
            },
            {
              label:
                'Does the contract involve complete or partial demolition of any structures',
              kind: 'radio',
              value: 'No',
            },
            {
              label: 'Does the contract involve any pile driving or piling works',
              kind: 'radio',
              value: 'No',
            },
            {
              label: 'Does the contract involve any removal of support',
              kind: 'radio',
              value: 'No',
            },
            {
              label: 'Does the contract involve any underpinning works',
              kind: 'radio',
              value: 'No',
            },
            {
              label:
                'Any excavations below the foundation of adjoining or surrounding property',
              kind: 'radio',
              value: 'No',
            },
          ],
          action: 'Next',
        },
        // B9.2 Page 2 (image31)
        {
          title: 'Page 2',
          fields: [
            {
              label:
                'Does the contract involve any ground stabilisation work being undertaken',
              kind: 'radio',
              value: 'No',
            },
            {
              label: 'Are there any dewatering works being carried out',
              kind: 'radio',
              value: 'No',
            },
            {
              label:
                'Have any schedules of condition been drawn up for surrounding properties',
              kind: 'radio',
              value: 'No',
            },
            {
              label: 'JCT 6.5.1. Non negligent liability excess',
              kind: 'picklist',
              value: '750',
            },
            {
              label: 'Limit of liability required',
              kind: 'picklist',
              value: '5,000,000',
            },
          ],
          action: 'Save',
        },
      ],
    },
  },
];

export const RENO_COVERAGES: RenoCoverage[] = RENO_COVERAGES_ALL.filter(
  (c) => INCLUDE_TERRORISM || c.addRowName !== 'Terrorism'
); // Includes Terrorism by default (9 coverages); set RENO_INCLUDE_TERRORISM=0 to exclude

// ---------------------------------------------------------------------------
// Enter Premiums (images 33–38)
// ---------------------------------------------------------------------------

export interface RenoPremiumEntry {
  coverage: string;
  insurable: string;
  technical: string;
  grossWritten: string;
  annualized: string;
  commissionRate: string;
}

/** Top picklist "Is any part of policy Minimum & Deposit?" = No. */
export const RENO_MINIMUM_DEPOSIT = 'No';

/**
 * One entry per coverage (9). technical = grossWritten = annualized = the
 * coverage's Gross Written premium from the catalog table. Commission rate = 5.
 */
const RENO_PREMIUMS_ALL: RenoPremiumEntry[] = [
  { coverage: 'Contract Works', insurable: 'UK Test Insured', technical: '555.55', grossWritten: '555.55', annualized: '', commissionRate: '5' },
  { coverage: 'Existing Structures', insurable: 'UK Test Insured', technical: '456.77', grossWritten: '456.77', annualized: '', commissionRate: '5' },
  { coverage: 'Contents', insurable: 'UK Test Insured', technical: '777.01', grossWritten: '777.01', annualized: '', commissionRate: '5' },
  { coverage: 'Advanced Loss of Profits/Delayed Start Up', insurable: 'UK Test Insured', technical: '467.44', grossWritten: '467.44', annualized: '', commissionRate: '5' },
  { coverage: 'Own Plant', insurable: 'UK Test Insured', technical: '1233.44', grossWritten: '1233.44', annualized: '', commissionRate: '5' },
  { coverage: 'Hired in Plant', insurable: 'UK Test Insured', technical: '777.77', grossWritten: '777.77', annualized: '', commissionRate: '5' },
  { coverage: 'Public & Products Liability', insurable: 'UK Test Insured', technical: '123.44', grossWritten: '123.44', annualized: '', commissionRate: '5' },
  { coverage: 'Terrorism', insurable: 'UK Test Insured', technical: '111.44', grossWritten: '111.44', annualized: '', commissionRate: '1' },
  { coverage: 'JCT 6.5.1 Non Negligent Liability', insurable: 'UK Test Insured', technical: '134.44', grossWritten: '134.44', annualized: '', commissionRate: '5' },
];

export const RENO_PREMIUMS: RenoPremiumEntry[] = RENO_PREMIUMS_ALL.filter(
  (p) => INCLUDE_TERRORISM || p.coverage !== 'Terrorism'
); // Includes Terrorism by default (9 premiums); set RENO_INCLUDE_TERRORISM=0 to exclude

// ---------------------------------------------------------------------------
// Downstream workflow — Select Binders / Fee / UAL / users / expectations
// ---------------------------------------------------------------------------

/** Select Binders tab (images 39–40) — per-coverage binder selections. */
interface RenoBinderChoice {
  coverage: string;
  name: string;
  section: string;
  nrToBinder: string;
}

export const RENO_BINDERS_ALL: RenoBinderChoice[] = [
  { coverage: 'Contract Works', name: 'Accelerant Construction & Commercial 2026', section: 'Renovation', nrToBinder: 'New Business' },
  { coverage: 'Existing Structures', name: 'Accelerant Construction & Commercial 2026', section: 'Renovation', nrToBinder: 'New Business' },
  { coverage: 'Contents', name: 'Accelerant Construction & Commercial 2026', section: 'Renovation', nrToBinder: 'New Business' },
  { coverage: 'Advanced Loss of Profits/Delayed Start Up', name: 'Accelerant Construction & Commercial 2026', section: 'Renovation', nrToBinder: 'New Business' },
  { coverage: 'Own Plant', name: 'Accelerant Construction & Commercial 2026', section: 'Renovation', nrToBinder: 'New Business' },
  { coverage: 'Hired in Plant', name: 'Accelerant Construction & Commercial 2026', section: 'Renovation', nrToBinder: 'New Business' },
  { coverage: 'Public & Products Liability', name: 'Accelerant Construction & Commercial 2026', section: 'Renovation', nrToBinder: 'New Business' },
  { coverage: 'Terrorism', name: 'AXA XL Contractors 2026', section: 'Section C – Terrorism – CONC & CARP', nrToBinder: 'New Business' },
  { coverage: 'JCT 6.5.1 Non Negligent Liability', name: 'Accelerant Construction & Commercial 2026', section: 'Renovation', nrToBinder: 'New Business' },
];

export const RENO_BINDERS: RenoBinderChoice[] = RENO_BINDERS_ALL.filter(
  (b) => INCLUDE_TERRORISM || b.coverage !== 'Terrorism'
); // Includes Terrorism by default (9 binders); set RENO_INCLUDE_TERRORISM=0 to exclude

/** Default RENO binder for backward compat (used as fallback when specific coverage not found). */
export const RENO_BINDER = RENO_BINDERS[0];

/** Fee entry OmniScript (image50). */
export const RENO_FEES = [
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
 */
export const RENO_UAL = {
  approverName: 'T-0016-SIT2-SCC-CON-UW5 Auto-Provar',
  approverSearchTerms: ['t-0016', 'T-0016-SIT2-SCC-CON-UW5', 'T-0016'],
  errorToastText:
    'Status cannot be changed as there are outstanding UAL/Carrier Referrals',
};

/** Sandbox login users: UW3 does the build, UW5 approves the UAL referral. */
export const RENO_USERS = {
  uw3: process.env.SF_USERNAME ?? 'oliva.cons.puw3@dualgroup.com.newprodqa2',
  uw5: process.env.SF_UAL_APPROVER_USERNAME ?? 'oliva.cons.puw5@dualgroup.com.newprodqa2',
};

export const RENO_POLICY_EXPECTATIONS = {
  status: 'In Force',
  newMtaRenewal: 'New Business',
  product: 'Renovation',
};

/** MTA — Mid-term Adjustment lifecycle configuration. */
export const RENO_MTA = {
  effectiveOffsetDays: 3,
  submissionOffsetDays: 0,
  submissionTime: '09:00:00',
  reason: 'Exposure/Limit Changes',
  description: 'Test MTA',
  policyNewMtaRenewal: 'MTA',
  policyStatus: 'In Force',
  chargePremiums: [
    { coverage: 'Contract Works', chargePremium: '27.78' },
    { coverage: 'Existing Structures', chargePremium: '22.84' },
    { coverage: 'Contents', chargePremium: '38.85' },
    { coverage: 'Advanced Loss of Profits/Delayed Start Up', chargePremium: '23.37' },
    { coverage: 'Own Plant', chargePremium: '61.67' },
    { coverage: 'Hired in Plant', chargePremium: '38.89' },
    { coverage: 'Public & Products Liability', chargePremium: '6.17' },
    { coverage: 'Terrorism', chargePremium: '5.57' },
    { coverage: 'JCT 6.5.1 Non Negligent Liability', chargePremium: '6.72' },
  ],
};

/** MTA policy expectations after policy version creation. */
export const RENO_MTA_POLICY_EXPECTATIONS = {
  status: 'In Force',
  newMtaRenewal: 'MTA',
};

/** Cancellation — applied to the policy. */
export const RENO_CANCELLATION = {
  category: 'Cancel the Policy from Inception',
  instigatedBy: 'Customer',
  reason: 'Product Unsuited/Misunderstood',
  notes: 'Test Cancellation',
  returnFullPremium: 'Yes',
  returnFees: 'Yes',
  policyStatus: 'Cancelled',
};

/** Employer Reference Number step. */
export const RENO_ERN = {
  exempt: 'Yes',
  ern: 'NA',
};
