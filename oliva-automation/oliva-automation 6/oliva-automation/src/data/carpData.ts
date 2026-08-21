import { OmniForm, RenoCoverage } from './renoTypes';
import { RenoPremiumEntry } from './renoData';

/**
 * Test data for the Oliva Construction "Contractors All Risks - Project"
 * (CARP) New Business flow on the newprodqa2 sandbox — from
 * `For creating policy for CARP Product.docx` (46 screenshots catalogued in
 * scratchpad carp_coverage_catalog.md) + live org exploration.
 *
 * CARP deltas vs Renovation: different intermediary account/contact, a 5-step
 * product questionnaire, 8 insurable-level coverages (no "Contents"), premiums
 * with Minimum & Deposit = Yes, THREE fees, and RBS via the bulk
 * "Confirm No Manual RBS Referral Reasons" button (no per-RBS approval).
 */

// ---------------------------------------------------------------------------
// Account / submission wizard
// ---------------------------------------------------------------------------

export const CARP_ACCOUNT = {
  name: process.env.CARP_ACCOUNT_NAME ?? 'HOWDEN INSURANCE BROKERS LIMITED',
  // For SIT: use CARP_INTERMEDIARY_CONTACT env var to support environment-specific
  // intermediary contact (required when Intermediary and Introducer accounts share
  // the same name; browser UI will disambiguate via the contact name).
  intermediaryContact: process.env.CARP_INTERMEDIARY_CONTACT ?? 'James Chambers',
};

export const CARP_CLIENT_INFO = {
  // Existing client (Create New Client = No). The doc's SITP example used
  // "Moorgarth Retail Limited…", but on newprodqa2 the verified existing
  // client offered by the typeahead is "PG Test Insured" (live-explored).
  // For SIT: use CARP_INSURED_NAME env var to support environment-specific clients.
  insuredName: process.env.CARP_INSURED_NAME ?? 'UK Test Insured',
  industrySector: 'Construction',
  activityCode: 'Aerial & Satellite Erection',
  product: 'Contractors All Risks - Project',
  businessDescription: 'Test Reference',
  yearBusinessEstablished: '2026',
  employeeSize: '90',
  clientTurnover: '900000',
  clientClassificationType: 'Consumer',
};

export const CARP_RISK_INFO = {
  riskType: 'Insurance',
  intermediaryReference: 'Test Reference',
  insurerQuotePolicyReference: 'Test Reference',
};

export const CARP_INSURABLE = {
  insurableName: 'UK Test Insured',
};

// ---------------------------------------------------------------------------
// Product Questions — 5-step OmniScript (images 9–13)
// ---------------------------------------------------------------------------

export const CARP_PRODUCT_FORM: OmniForm = {
  name: 'CARP Product Questions',
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
      title: 'Contractors All Risks Project',
      fields: [
        { label: 'Contract Employer', kind: 'text', value: 'Test Reference 123456789!' },
        { label: 'Contract Main Contractor(s)', kind: 'text', value: 'Test Reference 123456789!' },
        { label: 'Contract Period (Months)', kind: 'text', value: '365' },
        { label: 'Maintenance Period (Months)', kind: 'text', value: '365' },
        { label: 'Project Type', kind: 'picklist', value: 'New Build - Standard Construction' },
        { label: 'Location Type', kind: 'picklist', value: 'Residential' },
        { label: 'maximum height worked to', kind: 'text', value: '2000' },
        { label: 'maximum depth worked to', kind: 'text', value: '2000' },
        { label: 'Is cover for Sub-Contractors included', kind: 'radio', value: 'Yes' },
        { label: 'application of heat', kind: 'text', value: '100' },
        { label: 'coronavirus/communicable disease', kind: 'radio', value: 'Yes' },
      ],
      action: 'Next',
    },
    {
      title: 'Contractors All Risks Project Cont.',
      fields: [
        { label: 'Describe the location of the Contract Site', kind: 'text', value: 'Test Reference 123456789!' },
        { label: 'How often will the contract site be visited', kind: 'text', value: 'Test Reference 123456789!' },
        { label: 'Detail the security in place', kind: 'text', value: 'Test Reference 123456789!' },
        // Live-verified: Contract Type is FREE TEXT on CARP (not a picklist).
        { label: 'Contract Type', kind: 'text', value: 'JCT Construction Management Contract' },
        { label: 'Interested Parties', kind: 'text', value: 'Test Reference 123456789!' },
        { label: 'external company to oversee the health', kind: 'radio', value: 'Yes' },
        { label: 'Flood checks returned as ok to quote', kind: 'radio', value: 'Yes' },
      ],
      action: 'Next',
    },
    {
      title: 'Types of Work',
      fields: [
        { label: 'timber framed buildings', kind: 'radio', value: 'Yes' },
        { label: 'alteration of any basements', kind: 'radio', value: 'Yes' },
        {
          label: 'If the answer is "Yes" to any of the above questions please provide full details',
          kind: 'text',
          value: 'Test Reference 123456789!',
        },
        { label: 'Demolition of buildings', kind: 'radio', value: 'Yes' },
        { label: 'high risk contracts', kind: 'radio', value: 'Yes' },
        { label: 'Pile driving, quarrying or use of explosives', kind: 'radio', value: 'Yes' },
        { label: 'asbestos/silica', kind: 'radio', value: 'Yes' },
        {
          label: 'If the answer is "Yes" to any of the above questions please provide full details',
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
        { label: 'keep records of training provided', kind: 'radio', value: 'Yes' },
        { label: 'enforce the use of personal protective equipment', kind: 'radio', value: 'Yes' },
        { label: 'records of personal protective equipment supplied', kind: 'radio', value: 'Yes' },
        { label: 'Has a risk assessment been carried out', kind: 'radio', value: 'Yes' },
        { label: 'written work method statements', kind: 'radio', value: 'Yes' },
        { label: 'facts that could be considered material', kind: 'radio', value: 'Yes' },
        { label: 'Additional Details (Material Facts)', kind: 'text', value: 'Test Reference 123456789!' },
      ],
      action: 'Save',
    },
  ],
};

// ---------------------------------------------------------------------------
// Coverages — 8 insurable-level (images 15–25)
// ---------------------------------------------------------------------------

// ORG DEFECT (CONFIRMED via REST 15/07/2026): CARP's Terrorism child is the
// SAME shared product as Renovation's (Oliva-ConstructionTerrorism,
// 01tPu00000FtbhRIAR) and has ZERO Binder_Section_Coverage__c rows (all other
// CARP coverages are mapped, 74 rows) — a quote containing Terrorism can never
// pass Ready → Quote Issued. The doc's own numbers agree: its policy GWP
// excludes the Terrorism premium (4,850.44 = 5,850.95 − 1,000.51) and no
// Terrorism RBS row exists. Included by default; set CARP_INCLUDE_TERRORISM=0
// to exclude if needed.
const INCLUDE_TERRORISM = process.env.CARP_INCLUDE_TERRORISM !== '0';

const CARP_COVERAGES_ALL: RenoCoverage[] = [
  // Coverage 1 — Contract Works (single step, image15)
  {
    addRowName: 'Contract Works',
    form: {
      name: 'Contract Works',
      steps: [
        {
          title: 'Coverage Questions',
          fields: [
            { label: 'Excess - fire', kind: 'picklist', value: '1,000' },
            { label: 'Excess - flood', kind: 'picklist', value: '1,000' },
            { label: 'Excess - water damage', kind: 'picklist', value: '1,000' },
            { label: 'Excess - all other damage or losses', kind: 'picklist', value: '1,000' },
            { label: 'Limit', kind: 'text', value: '167985.66' },
            { label: 'Escalation Cost Limit %', kind: 'text', value: '100' },
          ],
          action: 'Save',
        },
      ],
    },
  },
  // Coverage 2 — Existing Structures (3 steps, images 16–18)
  {
    addRowName: 'Existing Structures',
    form: {
      name: 'Existing Structures',
      steps: [
        {
          title: 'Existing Structures',
          fields: [
            { label: 'Existing Structures Sum Insured', kind: 'text', value: '167985.66' },
            { label: 'Is the building listed', kind: 'radio', value: 'No' },
            { label: 'Existing Structures Basis of Cover', kind: 'picklist', value: 'Full perils' },
            { label: "Select 'Type of Property' if 'Other' please provide details below", kind: 'picklist', value: 'Barn' },
            { label: 'Wall Construction', kind: 'text', value: '1300' },
            { label: 'Roof Construction', kind: 'text', value: '1300' },
            { label: 'Year of Build', kind: 'text', value: '2026' },
          ],
          action: 'Next',
        },
        {
          title: 'Questions',
          fields: [
            { label: 'good state of repair', kind: 'radio', value: 'Yes' },
            { label: 'historically free from flooding', kind: 'radio', value: 'Yes' },
            { label: 'ever suffered from flooding', kind: 'radio', value: 'No' },
            { label: 'visitors attending the premises', kind: 'radio', value: 'No' },
            { label: 'increased fire risk', kind: 'radio', value: 'No' },
          ],
          action: 'Next',
        },
        {
          title: 'Excesses',
          fields: [
            { label: 'Excess - fire', kind: 'picklist', value: '250' },
            { label: 'Excess - water damage', kind: 'picklist', value: '250' },
            { label: 'Excess - flood', kind: 'picklist', value: '250' },
            { label: 'Excess - all other damage or losses', kind: 'picklist', value: '250' },
          ],
          action: 'Save',
        },
      ],
    },
  },
  // Coverage 3 — Advanced Loss of Profits/Delayed Start Up (single step, image19)
  {
    addRowName: 'Advanced Loss of Profits/Delayed Start Up',
    form: {
      name: 'Advanced Loss of Profits/Delayed Start Up',
      steps: [
        {
          title: 'Coverage Questions',
          fields: [
            { label: 'Indemnity period required (months)', kind: 'text', value: '12' },
            { label: 'Deductible (days)', kind: 'text', value: '30' },
            { label: 'Limit of indemnity required', kind: 'text', value: '100001.00' },
          ],
          action: 'Save',
        },
      ],
    },
  },
  // Coverage 4 — Own Plant (single step, image20)
  {
    addRowName: 'Own Plant',
    form: {
      name: 'Own Plant',
      steps: [
        {
          title: 'Coverage Questions',
          fields: [
            { label: 'Total value of own plant to be insured', kind: 'text', value: '265789.00' },
            { label: 'Excess for theft &/or malicious damage', kind: 'picklist', value: 'N/A' },
            { label: 'Excess - all other damage or losses', kind: 'picklist', value: '100' },
            { label: 'Is DUAL DNA+ Required', kind: 'radio', value: 'No' },
          ],
          action: 'Save',
        },
      ],
    },
  },
  // Coverage 5 — Hired in Plant (single step, image21)
  {
    addRowName: 'Hired in Plant',
    form: {
      name: 'Hired in Plant',
      steps: [
        {
          title: 'Coverage Questions',
          fields: [
            { label: 'Maximum Accident Value', kind: 'text', value: '69875.00' },
            { label: 'Hired in plant charges', kind: 'text', value: '176354.00' },
            { label: 'Excess for theft &/or malicious damage', kind: 'picklist', value: 'N/A' },
            { label: 'Excess - all other damage or losses', kind: 'picklist', value: '100' },
          ],
          action: 'Save',
        },
      ],
    },
  },
  // Coverage 6 — Public & Products Liability (single step, image22)
  {
    addRowName: 'Public & Products Liability',
    form: {
      name: 'Public & Products Liability',
      steps: [
        {
          title: 'Coverage Questions',
          fields: [
            { label: 'BFSC payments for this contract', kind: 'text', value: '0.00' },
            { label: 'Limit of liability required', kind: 'picklist', value: '2,000,000' },
            { label: 'Public liability third party property damage excess', kind: 'picklist', value: '100' },
          ],
          action: 'Save',
        },
      ],
    },
  },
  // Coverage 7 — Terrorism (single step, image23). Sum Insured rows use
  // read-only value-box labels (Contract Value / Existing Structure / DSU /
  // ACOW) with the editable input beside them — handled by the engine's
  // fillValueBoxSibling (same mechanism as Renovation).
  {
    addRowName: 'Terrorism',
    form: {
      name: 'Terrorism',
      steps: [
        {
          title: 'Coverage Questions',
          fields: [
            { label: 'Cover Type', kind: 'picklist', value: 'Terrorism' },
            { label: 'Contract Value', kind: 'text', value: '4567.55' },
            { label: 'Existing Structure', kind: 'text', value: '4573.44' },
            { label: 'DSU', kind: 'text', value: '2369.55' },
            { label: 'ACOW', kind: 'text', value: '4573.00' },
            { label: 'Zone', kind: 'picklist', value: 'B' },
            { label: 'Floating or Specific Contract', kind: 'radio', value: 'Specific Contract' },
            { label: 'If Sum Insured or First Loss Limit', kind: 'picklist', value: 'Sum Insured' },
          ],
          action: 'Save',
        },
      ],
    },
  },
  // Coverage 8 — JCT 6.5.1 Non Negligent Liability (2 steps, images 24–25)
  {
    addRowName: 'JCT 6.5.1 Non Negligent Liability',
    form: {
      name: 'JCT 6.5.1 Non Negligent Liability',
      steps: [
        {
          title: 'Page 1',
          fields: [
            { label: 'Type of contract', kind: 'picklist', value: 'Extensions to Existing Buildings - other Buildings' },
            { label: 'complete or partial demolition', kind: 'radio', value: 'No' },
            { label: 'pile driving or piling works', kind: 'radio', value: 'No' },
            { label: 'removal of support', kind: 'radio', value: 'No' },
            { label: 'underpinning works', kind: 'radio', value: 'No' },
            { label: 'excavations below the foundation', kind: 'radio', value: 'No' },
          ],
          action: 'Next',
        },
        {
          title: 'Page 2',
          fields: [
            { label: 'ground stabilisation work', kind: 'radio', value: 'No' },
            { label: 'dewatering works', kind: 'radio', value: 'No' },
            { label: 'schedules of condition', kind: 'radio', value: 'No' },
            { label: 'JCT 6.5.1. Non negligent liability excess', kind: 'picklist', value: '750' },
            { label: 'Limit of liability required', kind: 'picklist', value: '5,000,000' },
          ],
          action: 'Save',
        },
      ],
    },
  },
];

export const CARP_COVERAGES: RenoCoverage[] = CARP_COVERAGES_ALL.filter(
  (c) => INCLUDE_TERRORISM || c.addRowName !== 'Terrorism'
); // Includes Terrorism by default (8 coverages); set CARP_INCLUDE_TERRORISM=0 to exclude

// ---------------------------------------------------------------------------
// Premiums (images 27–30) — technical = gross, commission 5% everywhere.
// ---------------------------------------------------------------------------

const CARP_INSURED = 'UK Test Insured';

const CARP_PREMIUMS_ALL: RenoPremiumEntry[] = [
  { coverage: 'Contract Works', insurable: CARP_INSURED, technical: '555.55', grossWritten: '555.55', annualized: '', commissionRate: '5' },
  { coverage: 'Existing Structures', insurable: CARP_INSURED, technical: '456.77', grossWritten: '456.77', annualized: '', commissionRate: '5' },
  { coverage: 'Advanced Loss of Profits/Delayed Start Up', insurable: CARP_INSURED, technical: '467.44', grossWritten: '467.44', annualized: '', commissionRate: '5' },
  { coverage: 'Own Plant', insurable: CARP_INSURED, technical: '1233.44', grossWritten: '1233.44', annualized: '', commissionRate: '5' },
  { coverage: 'Hired in Plant', insurable: CARP_INSURED, technical: '777.77', grossWritten: '777.77', annualized: '', commissionRate: '5' },
  { coverage: 'Public & Products Liability', insurable: CARP_INSURED, technical: '123.44', grossWritten: '123.44', annualized: '', commissionRate: '5' },
  { coverage: 'Terrorism', insurable: CARP_INSURED, technical: '111.44', grossWritten: '111.44', annualized: '', commissionRate: '1' },
  { coverage: 'JCT 6.5.1 Non Negligent Liability', insurable: CARP_INSURED, technical: '134.44', grossWritten: '134.44', annualized: '', commissionRate: '5' },
];

export const CARP_PREMIUMS: RenoPremiumEntry[] = CARP_PREMIUMS_ALL.filter(
  (p) => INCLUDE_TERRORISM || p.coverage !== 'Terrorism'
); // Includes Terrorism by default (8 premiums); set CARP_INCLUDE_TERRORISM=0 to exclude

/** "Is any part of policy Minimum & Deposit?" — Yes for CARP (image27). */
export const CARP_MINIMUM_DEPOSIT = 'Yes';

// ---------------------------------------------------------------------------
// Binders — per-coverage binder selections. All main coverages use Accelerant;
// Terrorism uses AXA XL Contractors 2026 (org-verified 23/07/2026).
// ---------------------------------------------------------------------------

interface CarpBinderChoice {
  coverage: string;
  name: string;
  section: string;
  nrToBinder: string;
}

export const CARP_BINDERS_ALL: CarpBinderChoice[] = [
  { coverage: 'Contract Works', name: 'Accelerant Construction & Commercial 2026', section: 'Contractors All Risks - Project', nrToBinder: 'New Business' },
  { coverage: 'Existing Structures', name: 'Accelerant Construction & Commercial 2026', section: 'Contractors All Risks - Project', nrToBinder: 'New Business' },
  { coverage: 'Advanced Loss of Profits/Delayed Start Up', name: 'Accelerant Construction & Commercial 2026', section: 'Contractors All Risks - Project', nrToBinder: 'New Business' },
  { coverage: 'Own Plant', name: 'Accelerant Construction & Commercial 2026', section: 'Contractors All Risks - Project', nrToBinder: 'New Business' },
  { coverage: 'Hired in Plant', name: 'Accelerant Construction & Commercial 2026', section: 'Contractors All Risks - Project', nrToBinder: 'New Business' },
  { coverage: 'Public & Products Liability', name: 'Accelerant Construction & Commercial 2026', section: 'Contractors All Risks - Project', nrToBinder: 'New Business' },
  { coverage: 'Terrorism', name: 'TEST AXA XL CONST', section: 'Section C – Terrorism – CARP', nrToBinder: 'New Business' },
  { coverage: 'JCT 6.5.1 Non Negligent Liability', name: 'Accelerant Construction & Commercial 2026', section: 'Contractors All Risks - Project', nrToBinder: 'New Business' },
];

export const CARP_BINDERS: CarpBinderChoice[] = CARP_BINDERS_ALL.filter(
  (b) => INCLUDE_TERRORISM || b.coverage !== 'Terrorism'
); // Includes Terrorism by default (8 binders); set CARP_INCLUDE_TERRORISM=0 to exclude

/** Default CARP binder for backward compat (used as fallback when specific coverage not found). */
export const CARP_BINDER = CARP_BINDERS[0];

// ---------------------------------------------------------------------------
// Fees — THREE fees (doc text), each entered via Add Fee → Save and Exit.
// ---------------------------------------------------------------------------

export const CARP_FEES = [
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
// UAL / users / policy expectations — same Construction org setup as Reno.
// ---------------------------------------------------------------------------

export const CARP_UAL = {
  approverName: 'T-0016-SIT-SCC-CON-UW5 Auto-Provar',
  approverSearchTerms: ['t-0016', 'T-0016-SIT-SCC-CON-UW5', 'T-0016'],
  errorToastText: 'Status cannot be changed as there are outstanding UAL/Carrier Referrals',
};

export const CARP_USERS = {
  uw3: 't-0011-con-uw3-auto-provar@scc.sit',
  uw5: 't-0016-con-uw5-auto-provar@scc.sit',
};

export const CARP_POLICY_EXPECTATIONS = {
  status: 'In Force',
  newMtaRenewal: 'New Business',
};

/**
 * MTA (Mid-Term Adjustment) — applied to the NB policy created above.
 * Charge premium (10) is applied to every coverage's "100% MTA Charge Premium" field.
 * Effective date is 3 days from inception (policy inception = today).
 */
export const CARP_MTA = {
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
    { coverage: 'Advanced Loss of Profits/Delayed Start Up', chargePremium: '23.37' },
    { coverage: 'Own Plant', chargePremium: '61.67' },
    { coverage: 'Hired in Plant', chargePremium: '38.89' },
    { coverage: 'Public & Products Liability', chargePremium: '6.17' },
    { coverage: 'Terrorism', chargePremium: '5.57' },
    { coverage: 'JCT 6.5.1 Non Negligent Liability', chargePremium: '6.72' },
  ],
};

/**
 * Cancellation — applied after second MTA.
 * Cancels the policy from inception with full premium return.
 */
export const CARP_CANCELLATION = {
  category: 'Cancel this MTA Only',
  instigatedBy: 'Customer',
  reason: 'Product Unsuited/Misunderstood',
  notes: 'Test Reference Cancellation',
  returnFullPremium: 'Yes',
  policyStatus: 'Cancelled',
};

/**
 * Cancel and Reissue (CNR) — applied to NB policy.
 * Resulting policy keeps New Business status.
 */
export const CARP_CNR = {
  reasonForCandR: 'Other',
  description: 'Test CNR',
  policyNewMtaRenewal: 'New Business',
  policyStatus: 'In Force',
};

/**
 * Renewal — applied to policy from CNR.
 * Per-coverage premium values for renewal.
 */
export const CARP_RENEWAL = {
  policyNewMtaRenewal: 'Renewal',
  policyStatus: 'In Force',
  premium: {
    technical: '55.56',
    grossWritten: '55.56',
    annualized: '555.50',
    commissionRate: '5',
  },
};
