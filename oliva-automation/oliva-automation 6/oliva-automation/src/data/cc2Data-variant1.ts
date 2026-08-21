import { OmniForm, RenoCoverage } from './renoTypes';
import { RenoPremiumEntry } from './renoData';
import { BinderChoice } from '../pages/BindersPage';

/**
 * Test data for CC2 Variant 1 — Contractors Combined (CONC) with NB→MTA→Cancellation flow.
 * Same base coverage and account as ccData.ts, but ready for modifications during test runs.
 *
 * Environment configuration:
 * - Users are read from SF_USERNAME and SF_UAL_APPROVER_USERNAME in .env
 * - To switch environments, use: .\switch-env.ps1 sit|uat2|sitp
 */

// ---------------------------------------------------------------------------
// Users / account / submission wizard
// ---------------------------------------------------------------------------

export const CC2_VAR1_USERS = {
  uw3: process.env.SF_USERNAME || 't-0011-con-uw3-auto-provar@scc.sit',
  uw5: process.env.SF_UAL_APPROVER_USERNAME || 't-0016-con-uw5-auto-provar@scc.sit',
};

export const CC2_VAR1_ACCOUNT = {
  name: process.env.CC2_VAR1_ACCOUNT_NAME ?? 'HOWDEN INSURANCE BROKERS LIMITED',
  intermediaryContact: process.env.CC2_VAR1_INTERMEDIARY_CONTACT ?? 'James Chambers',
};

export const CC2_VAR1_INSURED_ADDRESS = {
  search: '7 Chelwood Close, Coulsdon, Surrey, CR5 3EY, United Kingdom',
  addressLine: '7 Chelwood Close',
  city: 'Coulsdon',
  countyState: 'Surrey',
  postcode: 'CR5 3EY',
  country: 'United Kingdom',
};

export const CC2_VAR1_CLIENT_INFO = {
  insuredName: 'UK Test Insured',
  createNewClient: true,
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

export const CC2_VAR1_RISK_INFO = {
  riskType: 'Insurance',
  intermediaryReference: 'Test Reference',
  insurerQuotePolicyReference: 'Test Reference',
};

export const CC2_VAR1_PRODUCT_CARD = 'Contractors Combined';

// ---------------------------------------------------------------------------
// Coverages — SEVEN coverages (same as existing cc2Data.ts)
// ---------------------------------------------------------------------------

export const CC2_VAR1_COVERAGES: RenoCoverage[] = [
  {
    addRowName: 'Employers Liability',
    form: {
      name: 'Employers Liability',
      steps: [
        {
          title: 'Coverage Questions',
          fields: [
            { label: 'Drivers Supervisory Wageroll', kind: 'currency', value: '1,000.00' },
            { label: 'Drivers Supervisory Headcount', kind: 'number', value: '1,003.00' },
            { label: 'Heat Wageroll', kind: 'currency', value: '1,005.00' },
            { label: 'Woodworking/ Metalworking Wageroll', kind: 'currency', value: '1,008.00' },
            { label: 'Trade Description', kind: 'readonly', value: 'Aerial & Satellite Erection' },
            { label: '(Name of trade description) wageroll', kind: 'readonly', value: '123.00' },
            { label: '(Name of trade description) headcount', kind: 'readonly', value: '14.00' },
          ],
          action: 'Save',
        },
      ],
    },
  },
  {
    addRowName: 'Public & Products Liability',
    form: {
      name: 'Public & Products Liability',
      steps: [
        {
          title: 'Public & Products Liability',
          fields: [
            { label: 'Is public & products liability cover required', kind: 'picklist', value: 'Public Liability' },
            { label: 'Trade 1 Turnover', kind: 'currency', value: '100' },
            { label: 'Trade 2 Turnover', kind: 'currency', value: '200' },
            { label: 'Trade 3 Turnover', kind: 'currency', value: '300' },
            { label: 'Trade 4 Turnover', kind: 'currency', value: '400' },
            { label: 'Trade 5 Turnover', kind: 'currency', value: '500' },
            { label: 'Turnover derived from heat work', kind: 'currency', value: '111' },
            { label: 'Annual payments to bona fide sub contractors', kind: 'currency', value: '115' },
            { label: 'Annual cost of materials', kind: 'currency', value: '121' },
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
            { label: 'Heat Excess', kind: 'picklist', value: '250' },
            { label: 'Water Damage Excess', kind: 'picklist', value: '500' },
            { label: 'Underground Services Excess', kind: 'picklist', value: '750' },
            { label: 'All other third party property damage claims excess', kind: 'picklist', value: '250' },
            { label: 'Limit of liability required', kind: 'picklist', value: '1,000,000' },
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
            { label: '*Cover Type', kind: 'picklist', value: 'Terrorism' },
            { label: 'Law and Jurisdiction', kind: 'readonly', value: '' },
            { label: 'Contract Value', kind: 'text', value: '1100' },
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

export const CC2_VAR1_EL_TRADE = {
  tradeDescription: 'Aerial & Satellite Erection',
  wageroll: '123.00',
  headcount: '14.00',
};

export const CC2_VAR1_PD_COVERAGE: RenoCoverage = {
  addRowName: 'Property Damage',
  form: {
    name: 'Property Damage',
    steps: [
      {
        title: 'Coverage Questions',
        fields: [
          { label: 'What level of property cover is required', kind: 'picklist', value: 'Option 1' },
          { label: 'NACOSS approved alarm system', kind: 'radio', value: 'No' },
          { label: 'Property Excess', kind: 'picklist', value: '350' },
        ],
        action: 'Save',
      },
    ],
  },
};

export const CC2_VAR1_SECOND_LOCATION = {
  insurableName: 'Test',
  addressSearch: 'London, UK',
  addressLine: 'London',
  city: 'London',
  countyState: 'Greater London',
  postcode: 'ec3a2bj',
  country: 'United Kingdom',
  latitude: '51.5072178',
  longitude: '-0.1275862',
};

// ---------------------------------------------------------------------------
// Premiums — 7 coverages
// ---------------------------------------------------------------------------

export const CC2_VAR1_MINIMUM_DEPOSIT = 'Yes';

export const CC2_VAR1_PREMIUMS: RenoPremiumEntry[] = [
  { coverage: 'Employers Liability', insurable: '', technical: '1500.24', grossWritten: '56.31', annualized: '10012.32', commissionRate: '1.26457687' },
  { coverage: 'Public & Products Liability', insurable: '', technical: '1300.61', grossWritten: '17.27', annualized: '1245.21', commissionRate: '12.67127689' },
  { coverage: 'Property Damage', insurable: 'UK Test Insured', technical: '3127.67', grossWritten: '1431.87', annualized: '1234.54', commissionRate: '3.1' },
  { coverage: 'Terrorism', insurable: '', technical: '1007.66', grossWritten: '541.12', annualized: '713.54', commissionRate: '4.5' },
];

// ---------------------------------------------------------------------------
// Binders
// ---------------------------------------------------------------------------

export const CC2_VAR1_BINDERS: BinderChoice[] = [
  { coverage: 'Employers Liability', name: 'Accelerant Oliva Construction 2023', section: 'Contractors Combined', nrToBinder: 'New Business' },
  { coverage: 'Public & Products Liability', name: 'Allianz Contractors Combined 2023', section: 'Public / Products / Pollution Liability', nrToBinder: 'New Business' },
  { coverage: 'Property Damage', name: 'Allianz Contractors Combined 2023', section: 'Property Damage', nrToBinder: 'New Business' },
  { coverage: 'Terrorism', name: 'AXA XL Contractors 2025', section: 'Terrorism - Annual', nrToBinder: 'New Business' },
];

export const CC2_VAR1_BINDER_DEFAULT = CC2_VAR1_BINDERS[0];

// ---------------------------------------------------------------------------
// Fees
// ---------------------------------------------------------------------------

export const CC2_VAR1_FEES = [
  {
    type: 'Third Party Fee',
    subType: 'Survey Fee',
    payableBy: 'Insured',
    administeredBy: 'DUAL',
    includedInGwp: 'No',
    charged: '190',
    description: 'Testing Fees',
  },
  {
    type: 'Third Party Fee',
    subType: 'DUAL DNA+ Fee',
    dnaPaymentAmount: '25',
    payableBy: 'Insured',
    administeredBy: 'DUAL',
    includedInGwp: 'No',
    charged: '155',
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
// UAL config
// ---------------------------------------------------------------------------

export const CC2_VAR1_UAL = {
  approverName: 'T-0016-SIT2-SCC-CON-UW5 Auto-Provar',
  approverSearchTerms: ['t-0016', 'T-0016-SIT2-SCC-CON-UW5', 'T-0016'],
  errorToastText: 'Status cannot be changed as there are outstanding UAL/Carrier Referrals',
};

// ---------------------------------------------------------------------------
// Expectations and lifecycle
// ---------------------------------------------------------------------------

export const CC2_VAR1_EXPECTATIONS = {
  submissionRiskIdPattern: /DOU\/\d+\/CONC\/\d+/,
  quoteRiskIdPattern: /DOU\/\d+\/CONC\/\d+\/\d+/,
  dualShareGwp: 'GBP',
  status: 'In Force',
};

export const CC2_VAR1_MTA = {
  effectiveOffsetDays: 3,
  submissionOffsetDays: 0,
  submissionTime: '09:00:00',
  reason: 'Exposure/Limit Changes',
  description: 'Test MTA',
  policyNewMtaRenewal: 'MTA',
  policyStatus: 'In Force',
  chargePremiums: [
    { coverage: 'Employers Liability', chargePremium: '30.24' },
    { coverage: 'Public & Products Liability', chargePremium: '0' },
    { coverage: 'Property Damage', chargePremium: '43.13' },
    { coverage: 'Terrorism', chargePremium: '21.54' },
  ],
};

export const CC2_VAR1_CANCELLATION = {
  category: 'Cancel the Policy from Inception',
  instigatedBy: 'Customer',
  reason: 'Product Too Expensive',
  notes: 'Test Cancellation',
  returnFullPremium: 'Yes',
  returnFees: 'No',
  policyStatus: 'Cancelled',
};
