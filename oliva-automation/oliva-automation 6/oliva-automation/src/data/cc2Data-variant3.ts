import { OmniForm, RenoCoverage } from './renoTypes';
import { RenoPremiumEntry } from './renoData';
import { BinderChoice } from '../pages/BindersPage';

/**
 * Test data for CC2 Variant 3 — Contractors Combined (CONC) with NB→MTA→Cancellation flow.
 * Same base coverage and account as ccData.ts, but ready for modifications during test runs.
 */

export const CC2_VAR3_USERS = {
  uw3: process.env.SF_USERNAME ?? 't-0011-con-uw3-auto-provar@scc.sit',
  uw5: process.env.SF_UAL_APPROVER_USERNAME ?? 't-0016-con-uw5-auto-provar@scc.sit',
};

export const CC2_VAR3_ACCOUNT = {
  name: process.env.CC2_VAR3_ACCOUNT_NAME ?? 'HOWDEN INSURANCE BROKERS LIMITED',
  intermediaryContact: process.env.CC2_VAR3_INTERMEDIARY_CONTACT ?? 'James Chambers',
};

export const CC2_VAR3_CLIENT_INFO = {
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

export const CC2_VAR3_RISK_INFO = {
  riskType: 'Insurance',
  intermediaryReference: 'Test Reference',
  insurerQuotePolicyReference: 'Test Reference',
};

export const CC2_VAR3_PRODUCT_CARD = 'Contractors Combined';

export const CC2_VAR3_COVERAGES: RenoCoverage[] = [
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

export const CC2_VAR3_EL_TRADE = {
  tradeDescription: 'Agricultural Contractors',
  wageroll: '600',
  headcount: '600',
};

export const CC2_VAR3_MINIMUM_DEPOSIT = 'Yes';

export const CC2_VAR3_PREMIUMS: RenoPremiumEntry[] = [
  { coverage: 'Employers Liability', insurable: '', technical: '457.22', grossWritten: '457.22', annualized: '', commissionRate: '5' },
  { coverage: 'Public & Products Liability', insurable: '', technical: '1247.44', grossWritten: '1247.44', annualized: '', commissionRate: '5' },
  { coverage: 'Contractors All Risks', insurable: '', technical: '467.77', grossWritten: '467.77', annualized: '', commissionRate: '5' },
  { coverage: 'Property Damage', insurable: 'UK Test Insured VAR3', technical: '999.99', grossWritten: '999.99', annualized: '', commissionRate: '5' },
  { coverage: 'Professional Indemnity', insurable: '', technical: '167.44', grossWritten: '167.44', annualized: '', commissionRate: '5' },
  { coverage: 'Legal Expenses', insurable: '', technical: '666.44', grossWritten: '666.44', annualized: '', commissionRate: '5' },
  { coverage: 'Terrorism', insurable: '', technical: '299.99', grossWritten: '299.99', annualized: '', commissionRate: '5' },
];

export const CC2_VAR3_BINDERS: BinderChoice[] = [
  { coverage: 'Employers Liability', name: 'Accelerant Construction & Commercial 2026', section: 'Contractors Combined', nrToBinder: 'New Business' },
  { coverage: 'Public & Products Liability', name: 'Accelerant Construction & Commercial 2026', section: 'Contractors Combined', nrToBinder: 'New Business' },
  { coverage: 'Contractors All Risks', name: 'Accelerant Construction & Commercial 2026', section: 'Contractors Combined', nrToBinder: 'New Business' },
  { coverage: 'Property Damage', name: 'Allianz Contractors Combined 2023', section: 'Property Damage', nrToBinder: 'New Business' },
  { coverage: 'Professional Indemnity', name: 'HCC Contractors Combined 2026', section: 'Contractors Combined', nrToBinder: 'New Business' },
  { coverage: 'Legal Expenses', name: 'ARAG Legal Expenses 2023', section: 'Contractors Combined', nrToBinder: 'New Business' },
  { coverage: 'Terrorism', name: 'TEST AXA XL CONST', section: 'Section C – Terrorism – CONC & CARA', nrToBinder: 'New Business' },
];

export const CC2_VAR3_BINDER_DEFAULT = CC2_VAR3_BINDERS[0];

export const CC2_VAR3_FEES = [
  {
    type: 'Third Party Fee',
    subType: 'Survey Fee',
    payableBy: 'Insured',
    administeredBy: 'DUAL',
    includedInGwp: 'Yes',
    charged: '150',
    description: 'Testing Fees',
  },
  {
    type: 'Third Party Fee',
    subType: 'DUAL DNA+ Fee',
    dnaPaymentAmount: '50',
    payableBy: 'Insured',
    administeredBy: 'DUAL',
    includedInGwp: 'Yes',
    charged: '150',
    description: 'Testing Fees',
  },
  {
    type: 'DUAL Fee',
    subType: 'DUAL Policy/Admin Fee',
    payableBy: 'Insured',
    administeredBy: 'DUAL',
    includedInGwp: 'Yes',
    charged: '150',
    description: 'Testing Fees',
  },
];

export const CC2_VAR3_UAL = {
  approverName: 'T-0016-SIT2-SCC-CON-UW5 Auto-Provar',
  approverSearchTerms: ['t-0016', 'T-0016-SIT2-SCC-CON-UW5', 'T-0016'],
  errorToastText: 'Status cannot be changed as there are outstanding UAL/Carrier Referrals',
};

export const CC2_VAR3_EXPECTATIONS = {
  submissionRiskIdPattern: /DOU\/\d+\/CONC\/\d+/,
  quoteRiskIdPattern: /DOU\/\d+\/CONC\/\d+\/\d+/,
  dualShareGwp: 'GBP',
  status: 'In Force',
};

export const CC2_VAR3_MTA = {
  effectiveOffsetDays: 3,
  submissionOffsetDays: 0,
  submissionTime: '09:00:00',
  reason: 'Exposure/Limit Changes',
  description: 'Test MTA',
  policyNewMtaRenewal: 'MTA',
  policyStatus: 'In Force',
  chargePremiums: [
    { coverage: 'Employers Liability', chargePremium: '22' },
    { coverage: 'Public & Products Liability', chargePremium: '28' },
    { coverage: 'Property Damage', chargePremium: '14' },
    { coverage: 'Terrorism', chargePremium: '9' },
  ],
};

export const CC2_VAR3_PD_COVERAGE: RenoCoverage = {
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

export const CC2_VAR3_CANCELLATION = {
  category: 'Cancel the Policy from Inception',
  instigatedBy: 'Customer',
  reason: 'Product Too Expensive',
  notes: 'Test Cancellation',
  returnFullPremium: 'Yes',
  returnFees: 'Yes',
  policyStatus: 'Cancelled',
};
