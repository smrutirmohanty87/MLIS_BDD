import { OmniForm, RenoCoverage } from './renoTypes';
import { RenoPremiumEntry } from './renoData';

/**
 * Test data for the Oliva Construction "Contractors All Risks - Project" (CARP)
 * New Business variant 1 — focused on NB flow only with minimal coverages.
 * 
 * CARP NB-Variant1 deltas vs base CARP: simplified test data with only 3 coverages
 * (Contract Works, Advanced Loss of Profits/Delayed Start Up, Terrorism).
 * Includes premiums with Minimum & Deposit = Yes, single DUAL Policy/Admin fee, and RBS
 * via the bulk "Confirm No Manual RBS Referral Reasons" button.
 */

// ---------------------------------------------------------------------------
// Account / submission wizard
// ---------------------------------------------------------------------------

export const CARP_NB_VARIANT1_ACCOUNT = {
  name: process.env.CARP_ACCOUNT_NAME ?? 'HOWDEN INSURANCE BROKERS LIMITED',
  intermediaryContact: process.env.CARP_INTERMEDIARY_CONTACT ?? 'James Chambers',
};

export const CARP_NB_VARIANT1_CLIENT_INFO = {
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

export const CARP_NB_VARIANT1_RISK_INFO = {
  riskType: 'Insurance',
  intermediaryReference: 'Test Reference',
  insurerQuotePolicyReference: 'Test Reference',
};

export const CARP_NB_VARIANT1_INSURABLE = {
  insurableName: 'UK Test Insured',
};

// ---------------------------------------------------------------------------
// Coverages — 3 coverages for variant testing
// ---------------------------------------------------------------------------

const INCLUDE_TERRORISM = process.env.CARP_NB_VARIANT1_INCLUDE_TERRORISM !== '0';

const CARP_NB_VARIANT1_COVERAGES_ALL: RenoCoverage[] = [
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
];

export const CARP_NB_VARIANT1_COVERAGES: RenoCoverage[] = CARP_NB_VARIANT1_COVERAGES_ALL.filter(
  (c) => INCLUDE_TERRORISM || c.addRowName !== 'Terrorism'
); // Includes Terrorism by default (3 coverages); set CARP_NB_VARIANT1_INCLUDE_TERRORISM=0 to exclude

// ---------------------------------------------------------------------------
// Premiums — technical = gross, commission 5% (1% for Terrorism)
// ---------------------------------------------------------------------------

const CARP_NB_VARIANT1_INSURED = 'UK Test Insured';

const CARP_NB_VARIANT1_PREMIUMS_ALL: RenoPremiumEntry[] = [
  { coverage: 'Contract Works', insurable: CARP_NB_VARIANT1_INSURED, technical: '3220', grossWritten: '3220', annualized: '3220', commissionRate: '17.5' },
  { coverage: 'Advanced Loss of Profits/Delayed Start Up', insurable: CARP_NB_VARIANT1_INSURED, technical: '1164.38', grossWritten: '1164.38', annualized: '1164.38', commissionRate: '17.5' },
  { coverage: 'Terrorism', insurable: CARP_NB_VARIANT1_INSURED, technical: '849.5', grossWritten: '849.5', annualized: '849.5', commissionRate: '0' },
];

export const CARP_NB_VARIANT1_PREMIUMS: RenoPremiumEntry[] = CARP_NB_VARIANT1_PREMIUMS_ALL.filter(
  (p) => INCLUDE_TERRORISM || p.coverage !== 'Terrorism'
); // Includes Terrorism by default (3 premiums); set CARP_NB_VARIANT1_INCLUDE_TERRORISM=0 to exclude

/** "Is any part of policy Minimum & Deposit?" — Yes for CARP (image27). */
export const CARP_NB_VARIANT1_MINIMUM_DEPOSIT = 'Yes';

// ---------------------------------------------------------------------------
// Binders — per-coverage binder selections for 3 coverages
// ---------------------------------------------------------------------------

interface CarpNbVariant1BinderChoice {
  coverage: string;
  name: string;
  section: string;
  nrToBinder: string;
}

export const CARP_NB_VARIANT1_BINDERS_ALL: CarpNbVariant1BinderChoice[] = [
  { coverage: 'Contract Works', name: 'Accelerant Oliva Construction 2024', section: 'Contractors All Risks - Project', nrToBinder: 'New Business' },
  { coverage: 'Advanced Loss of Profits/Delayed Start Up', name: 'Accelerant Oliva Construction 2024', section: 'Contractors All Risks - Project', nrToBinder: 'New Business' },
  { coverage: 'Terrorism', name: 'AXA XL Contractors 2025', section: 'Section C – Terrorism – CARP', nrToBinder: 'New Business' },
];

export const CARP_NB_VARIANT1_BINDERS: CarpNbVariant1BinderChoice[] = CARP_NB_VARIANT1_BINDERS_ALL.filter(
  (b) => INCLUDE_TERRORISM || b.coverage !== 'Terrorism'
); // Includes Terrorism by default (3 binders); set CARP_NB_VARIANT1_INCLUDE_TERRORISM=0 to exclude

/** Default CARP NB-Variant1 binder for backward compat. */
export const CARP_NB_VARIANT1_BINDER = CARP_NB_VARIANT1_BINDERS[0];

// ---------------------------------------------------------------------------
// Fees — DUAL Policy/Admin Fee
// ---------------------------------------------------------------------------

export const CARP_NB_VARIANT1_FEES = [
  {
    type: 'DUAL Fee',
    subType: 'DUAL Policy/Admin Fee',
    payableBy: 'Insured',
    administeredBy: 'DUAL',
    includedInGwp: 'No',
    charged: '175',
    description: 'TESTING FEES',
  },
];

// ---------------------------------------------------------------------------
// UAL / users / policy expectations
// ---------------------------------------------------------------------------

export const CARP_NB_VARIANT1_UAL = {
  approverName: 'T-0016-SIT-SCC-CON-UW5 Auto-Provar',
  approverSearchTerms: ['t-0016', 'T-0016-SIT-SCC-CON-UW5', 'T-0016'],
  errorToastText: 'Status cannot be changed as there are outstanding UAL/Carrier Referrals',
};

export const CARP_NB_VARIANT1_USERS = {
  uw3: process.env.CARP_CON_USERNAME_UW3 ?? 't-0011-con-uw3-auto-provar@scc.sit',
  uw5: process.env.SF_USERNAME ?? 't-0016-con-uw5-auto-provar@scc.sit',
};

export const CARP_NB_VARIANT1_POLICY_EXPECTATIONS = {
  status: 'In Force',
  newMtaRenewal: 'New Business',
};
