import { OmniForm, RenoCoverage } from './renoTypes';
import { RenoPremiumEntry } from './renoData';
import { BinderChoice } from '../pages/BindersPage';

/**
 * Test data for CC2 Variant 2 — Contractors Combined (CONC) with NB→MTA→Cancellation flow.
 * Same base coverage and account as ccData.ts, but ready for modifications during test runs.
 */

// ---------------------------------------------------------------------------
// Users / account / submission wizard
// ---------------------------------------------------------------------------

export const CC2_VAR2_USERS = {
  uw3: process.env.SF_USERNAME ?? 't-0011-con-uw3-auto-provar@scc.sit',
  uw5: process.env.SF_UAL_APPROVER_USERNAME ?? 't-0016-con-uw5-auto-provar@scc.sit',
};

export const CC2_VAR2_ACCOUNT = {
  name: process.env.CC2_VAR2_ACCOUNT_NAME ?? 'HOWDEN INSURANCE BROKERS LIMITED',
  intermediaryContact: process.env.CC2_VAR2_INTERMEDIARY_CONTACT ?? 'James Chambers',
};

export const CC2_VAR2_INSURED_ADDRESS = {
  search: '7 Chelwood Close, Coulsdon, Surrey, CR5 3EY, United Kingdom',
  addressLine: '7 Chelwood Close',
  city: 'Coulsdon',
  countyState: 'Surrey',
  postcode: 'CR5 3EY',
  country: 'United Kingdom',
};

export const CC2_VAR2_CLIENT_INFO = {
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

export const CC2_VAR2_RISK_INFO = {
  riskType: 'Insurance',
  intermediaryReference: 'Test Reference',
  insurerQuotePolicyReference: 'Test Reference',
};

export const CC2_VAR2_PRODUCT_CARD = 'Contractors Combined';

// ---------------------------------------------------------------------------
// Coverages — SEVEN coverages (same as existing cc2Data.ts)
// ---------------------------------------------------------------------------

export const CC2_VAR2_COVERAGES: RenoCoverage[] = [
  {
    addRowName: 'Employers Liability',
    form: {
      name: 'Employers Liability',
      steps: [
        {
          title: 'Coverage Questions',
          fields: [
            { label: 'Drivers Supervisory Wageroll', kind: 'currency', value: '25,625.00' },
            { label: 'Drivers Supervisory Headcount', kind: 'number', value: '1.00' },
            { label: 'Heat Wageroll', kind: 'currency', value: '2,400.00' },
            { label: 'Woodworking/ Metalworking Wageroll', kind: 'currency', value: '0' },
            { label: 'Trade Description', kind: 'readonly', value: 'Agricultural Contractors' },
            { label: '(Name of trade description) wageroll', kind: 'readonly', value: '600' },
            { label: '(Name of trade description) headcount', kind: 'readonly', value: '600' },
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
            { label: 'Is public & products liability cover required', kind: 'picklist', value: 'Public & Products Liability' },
            { label: 'Trade 1 Turnover', kind: 'currency', value: '950,000.00' },
            { label: 'Turnover derived from heat work', kind: 'currency', value: '20,000.00' },
            { label: 'Annual payments to bona fide sub contractors', kind: 'currency', value: '80,000.00' },
            { label: 'Annual cost of materials', kind: 'currency', value: '700,000.00' },
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
            { label: 'Limit of liability required', kind: 'picklist', value: '5,000,000' },
          ],
          action: 'Save',
        },
      ],
    },
  },
  {
    addRowName: 'Contractors All Risks',
    form: {
      name: 'Contractors All Risks',
      steps: [
        {
          title: 'Coverage Questions',
          fields: [
            { label: 'Is contract works cover required', kind: 'radio', value: 'Yes' },
            { label: 'Maximum Contract Value', kind: 'currency', value: '300,000.00' },
            { label: 'Maximum contract period (months)', kind: 'text', value: '3' },
            { label: 'Is employees tools cover required', kind: 'radio', value: 'Yes' },
            { label: 'Total value of employees tools', kind: 'currency', value: '5,000.00' },
            { label: 'Maximum sum insured employees tools per employee', kind: 'currency', value: '1000' },
            { label: 'Employees Tools Excess', kind: 'picklist', value: '100' },
            { label: 'Is own plant cover required', kind: 'radio', value: 'Yes' },
            { label: 'Total value of own plant', kind: 'currency', value: '6000' },
            { label: 'Is DUAL DNA+ Required', kind: 'radio', value: 'Yes' },
            { label: 'Number of new DUAL DNA+ kits required', kind: 'picklist', value: '1' },
            { label: 'DNA+ Lifecycle', kind: 'picklist', value: '3' },
            { label: 'Is hired in plant cover required', kind: 'radio', value: 'Yes' },
            { label: 'Annual Hiring Fees', kind: 'currency', value: '30,000.00' },
            { label: 'Hired in plant maximum accident value', kind: 'currency', value: '100,000.00' },
            { label: 'Theft & malicious damage excess', kind: 'picklist', value: '1500' },
            { label: 'All other car claims excess', kind: 'picklist', value: '1500' },
          ],
          action: 'Save',
        },
      ],
    },
  },
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
            { label: 'Is contract & debt recovery cover required', kind: 'radio', value: 'No' },
            { label: 'Is the insured a main contractor/property developer', kind: 'radio', value: 'No' },
          ],
          action: 'Save',
        },
      ],
    },
  },
];

export const CC2_VAR2_EL_TRADE = {
  tradeDescription: 'Roofing Contractors - cold 15m',
  wageroll: '76,875.00',
  headcount: '4.00',
};

export const CC2_VAR2_SECOND_LOCATION = {
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

export const CC2_VAR2_MINIMUM_DEPOSIT = 'Yes';

export const CC2_VAR2_PREMIUMS: RenoPremiumEntry[] = [
  { coverage: 'Employers Liability', insurable: '', technical: '1768.13', grossWritten: '1768.13', annualized: '', commissionRate: '17.5' },
  { coverage: 'Public & Products Liability', insurable: '', technical: '2565.84', grossWritten: '2155.31', annualized: '', commissionRate: '17.5' },
  { coverage: 'Contractors All Risks', insurable: '', technical: '2054', grossWritten: '2505.88', annualized: '', commissionRate: '17.5' },
  { coverage: 'Legal Expenses', insurable: '', technical: '115.78', grossWritten: '115.78', annualized: '', commissionRate: '17.5' },
];

// ---------------------------------------------------------------------------
// Binders
// ---------------------------------------------------------------------------

export const CC2_VAR2_BINDERS: BinderChoice[] = [
  { coverage: 'Employers Liability', name: 'Allianz Contractors Combined 2025', section: 'Employers Liability', nrToBinder: 'New Business' },
  { coverage: 'Public & Products Liability', name: 'Allianz Contractors Combined 2025', section: 'Public / Products / Pollution Liability', nrToBinder: 'New Business' },
  { coverage: 'Contractors All Risks', name: 'Allianz Contractors Combined 2025', section: 'Contractors All Risks', nrToBinder: 'New Business' },
  { coverage: 'Legal Expenses', name: 'ARAG Legal Expenses 2024', section: '24 ARAG Legal Expenses', nrToBinder: 'New Business' },
];

export const CC2_VAR2_BINDER_DEFAULT = CC2_VAR2_BINDERS[0];

// ---------------------------------------------------------------------------
// Fees
// ---------------------------------------------------------------------------

export const CC2_VAR2_FEES = [
  {
    type: 'Third Party Fee',
    subType: 'DUAL DNA+ Fee',
    dnaPaymentAmount: '80.34',
    payableBy: 'Insured',
    administeredBy: 'DUAL',
    includedInGwp: 'Yes',
    charged: '200',
    description: 'Testing Fees',
  },
  {
    type: 'DUAL Fee',
    subType: 'DUAL Policy/Admin Fee',
    payableBy: 'Insured',
    administeredBy: 'DUAL',
    includedInGwp: 'No',
    charged: '150',
    description: 'Testing Fees',
  },
];

// ---------------------------------------------------------------------------
// UAL config
// ---------------------------------------------------------------------------

export const CC2_VAR2_UAL = {
  approverName: 'T-0016-SIT2-SCC-CON-UW5 Auto-Provar',
  approverSearchTerms: ['t-0016', 'T-0016-SIT2-SCC-CON-UW5', 'T-0016'],
  errorToastText: 'Status cannot be changed as there are outstanding UAL/Carrier Referrals',
};

// ---------------------------------------------------------------------------
// Expectations and lifecycle
// ---------------------------------------------------------------------------

export const CC2_VAR2_EXPECTATIONS = {
  submissionRiskIdPattern: /DOU\/\d+\/CONC\/\d+/,
  quoteRiskIdPattern: /DOU\/\d+\/CONC\/\d+\/\d+/,
  dualShareGwp: 'GBP',
  status: 'In Force',
};

export const CC2_VAR2_MTA = {
  effectiveOffsetDays: 3,
  submissionOffsetDays: 0,
  submissionTime: '09:00:00',
  reason: 'Exposure/Limit Changes',
  description: 'Test MTA',
  policyNewMtaRenewal: 'MTA',
  policyStatus: 'In Force',
  chargePremiums: [
    { coverage: 'Employers Liability', chargePremium: '116.26' },
    { coverage: 'Public & Products Liability', chargePremium: '141.36' },
    { coverage: 'Contractors All Risks', chargePremium: '164.77' },
    { coverage: 'Legal Expenses', chargePremium: '7.61' },
  ],
};

export const CC2_VAR2_CANCELLATION = {
  category: 'Cancel the Policy from Inception',
  instigatedBy: 'Customer',
  reason: 'Product Too Expensive',
  notes: 'Test Cancellation',
  returnFullPremium: 'Yes',
  returnFees: 'No',
  policyStatus: 'Cancelled',
};
