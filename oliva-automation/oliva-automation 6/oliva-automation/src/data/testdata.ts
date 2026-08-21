/**
 * Test data for the Oliva NB Policy - Care Howden E2E scenario.
 * Values transcribed from "Oliva NB Policy for Care Howden" walkthrough doc.
 * Dates are computed relative to the run date (the doc used fixed June-2026
 * dates only because that is when its screenshots were captured).
 */

export const ACCOUNT = {
  listView: 'All Intermediary Accounts',
  name: 'MARSHALL WOOLDRIDGE LIMITED',
  intermediaryContact: 'Amy Thorpe',
};

export const OLIVA_PRODUCTS = {
	care: ['Care Howden', 'Care Non Howden', 'Care ROI'] as const,
  construction: [
    'Renovation',
    'Contractors Excess Layer',
    'Contractors All Risks - Annual',
    'Contractors Combined',
    'Contractors All Risks - Project',
    'JCT 6.5.1 Non Negligent Liability',
    'Legal Expenses',
  ] as const,
};

export type CareProduct = (typeof OLIVA_PRODUCTS.care)[number];
export type ConstructionProduct = (typeof OLIVA_PRODUCTS.construction)[number];
export type OlivaProduct = CareProduct | ConstructionProduct;

export const PRODUCT_HLCOB: Record<OlivaProduct, 'Care' | 'Construction'> = {
  'Care Howden': 'Care',
  'Care Non Howden': 'Care',
  'Care ROI': 'Care',
  Renovation: 'Construction',
  'Contractors Excess Layer': 'Construction',
  'Contractors All Risks - Annual': 'Construction',
  'Contractors Combined': 'Construction',
  'Contractors All Risks - Project': 'Construction',
  'JCT 6.5.1 Non Negligent Liability': 'Construction',
  'Legal Expenses': 'Construction',
};

export const CLIENT_INFO_CARE = {
  createNewClient: 'No' as const,
  insuredName:
    'Moorgarth Retail Limited as employer and Allclear Demolition Ltd as contractors',
  submissionThroughRegionalCommercial: 'No',
  underwritingDivision: 'Property',
  highLevelClassOfBusiness: 'Care',
  industrySector: 'Care Home',
  activityCode: 'Childrens Care Home',
  product: 'Care Howden',
  businessDescription: 'test business description',
  yearBusinessEstablished: String(new Date().getFullYear()),
  employeeSize: '5700000',
  clientTurnover: '500000',
  clientClassificationType: 'Small',
};

export const CLIENT_INFO_CONSTRUCTION = {
  ...CLIENT_INFO_CARE,
  industrySector: 'Construction',
  activityCode: 'Contraction work',
  highLevelClassOfBusiness: 'Construction',
  product: 'Contractors All Risks - Annual',
};

/** Backward-compatible alias used by existing Care flows. */
export const CLIENT_INFO = CLIENT_INFO_CARE;

export const RISK_INFO = {
  riskType: 'Insurance',
  subscription: 'No',
  newOrRenewal: 'New Business',
  quoteRequiredOffsetDays: 5,
  inceptionTime: '00:00:00',
  expiryTime: '23:59:00',
  intermediaryReference: 'Intermediary ref',
  insurerQuotePolicyReference: 'Insurer',
  submissionCurrency: 'GBP',
};

export const CLAIMS_HISTORY = { madeClaimsLast5Years: 'No' };

/** Asset Protection - Property Damage: step 1 declared values (uplift 15%). */
export const ASSET_PROTECTION = {
  buildingsCoverRequired: 'Yes' as const,
  buildingsCoverType: 'Buildings Cover',
  buildings: { declared: '11000', uplift: '15' },
  contentsRequired: 'Yes' as const,
  contents: { declared: '12000.12', uplift: '15' },
  residentsContentsRequired: 'Yes' as const,
  residentsContents: '16500.45',
  stockRequired: 'Yes' as const,
  stock: { declared: '13000.91', uplift: '15' },
  computerRequired: 'Yes' as const,
  computer: { declared: '14000.42', uplift: '15' },
  businessAllRiskRequired: 'Yes' as const,
  businessAllRisks: '17000.94',
};

/** Asset Protection: "Questions Cont." page 1 (detail texts follow the doc). */
export const ASSET_QUESTIONS = {
  yearOfConstruction: '2010',
  percentRoofFlat: '10',
  purposeBuilt: { answer: 'No', detail: 'Page2 1Premises purpose built for the current usage' },
  externalWallsBrickStone: {
    answer: 'No',
    detail: 'Page2 2 external walls built of brick/stone and roof constructed of slate/tiles',
  },
  staffLiveAtPremises: { answer: 'Yes', detail: 'Page2 3 member of staff live at the business premises' },
  solelyCareHome: { answer: 'No', detail: 'Page2 4 premises occupied solely as a care home' },
  staff24Hours: { answer: 'No', detail: 'Page2 5 Staff in attendance 24 hours a day' },
  floodingPast10Years: {
    answer: 'Yes',
    detail: 'Page2 6 property on site suffered from flooding at any time over past 10 years',
  },
  goodStateOfRepair: { answer: 'No', detail: 'Page2 7 building in good state of repair' },
  listedBuilding: { answer: 'Yes', grade: 'Grade 2' },
  subsidenceHistory: {
    answer: 'Yes',
    detail: 'Page2 8 Subsidence, heave, landslip, made up ground, near underground works or near a cliff',
  },
  /** Fallback used for any question on the 2nd "Questions Cont." page. */
  defaultDetail: 'Automated test detail',
};

/** Asset Protection: Covers & Excesses step. All covers = Yes. */
export const COVERS_EXCESSES = {
  moneyAssaultIncluded: 'Yes' as const,
  excesses: {
    'Accidental Damage': '250',
    'Escape Of Water': '500',
    'Fire Lightning Explosion Aircraft': '250',
    Flood: '250',
    'Material Damage': '250',
    Storm: '250',
    Subsidence: '1500',
    Theft: '111',
  },
  propertyType: 'Bungalow',
};

export const REVENUE_PROTECTION = {
  limitType: 'Gross Revenue',
  annualFeeIncome: '1100000.23',
  indemnityPeriodMonths: '12 months',
  lossOfRegistrationIncluded: 'Yes' as const,
  lossOfRegistrationSumInsured: '25000',
};

export const GROUP_PERSONAL_ACCIDENT = {
  goodPhysicalMentalCondition: 'Yes' as const,
  underAge75: 'Yes' as const,
};

export interface RiskLocationData {
  insurableName: string;
  addressSearch: string;
  /** Address fields filled directly (Google Places autocomplete is
   *  unreliable under automation), captured from the live sandbox. */
  addressLine: string;
  city: string;
  countyState: string;
  postcode: string;
  country: string;
  latitude: string;
  longitude: string;
}

export const INSURABLE_2: RiskLocationData = {
  insurableName: 'Insurable 2',
  addressSearch: 'Orchideeënlaan 41, 8900 Ieper, Belgium',
  addressLine: 'Orchideeënlaan 41',
  city: 'Bel City',
  countyState: 'WV',
  postcode: '8900',
  country: 'Belgium',
  latitude: '50.8449366',
  longitude: '2.8700368',
};

export const INSURABLE_3: RiskLocationData = {
  insurableName: 'Insurable 3',
  addressSearch: '82 Chapman Ave, Glenroy VIC 3046, Australia',
  addressLine: '82 Chapman Ave',
  city: 'Aus City',
  countyState: 'Merri-Bek City',
  postcode: '3046',
  country: 'Australia',
  latitude: '-37.7049204',
  longitude: '144.9118707',
};

export interface PremiumEntry {
  coverage: string;
  insurable: string; // '' for product-level (Group Personal Accident)
  technical: string;
  grossWritten: string;
  annualized: string;
  commissionRate: string;
}

/** Keyed by coverage + insurable because panel order varies between runs. */
export const PREMIUMS: PremiumEntry[] = [
  { coverage: 'Asset Protection - Property Damage', insurable: 'Insurable 2', technical: '1001.54', grossWritten: '1001.34', annualized: '1003.32', commissionRate: '2' },
  { coverage: 'Asset Protection - Property Damage', insurable: 'Moorgarth', technical: '2111.54', grossWritten: '2222.12', annualized: '2001.54', commissionRate: '4' },
  { coverage: 'Asset Protection - Property Damage', insurable: 'Insurable 3', technical: '3333.1', grossWritten: '3112.43', annualized: '3921.32', commissionRate: '1' },
  { coverage: 'Revenue Protection - Business Interruption', insurable: 'Insurable 3', technical: '4111.43', grossWritten: '4123.43', annualized: '4001.42', commissionRate: '5' },
  { coverage: 'Revenue Protection - Business Interruption', insurable: 'Moorgarth', technical: '5000', grossWritten: '5321.54', annualized: '5321.43', commissionRate: '2' },
  { coverage: 'Revenue Protection - Business Interruption', insurable: 'Insurable 2', technical: '6124.43', grossWritten: '6123.54', annualized: '6321.54', commissionRate: '2' },
  { coverage: 'Group Personal Accident', insurable: '', technical: '543.43', grossWritten: '7231.21', annualized: '7313.54', commissionRate: '2' },
];

export const BINDER = {
  name: 'Aviva Care 2023',
  section: 'Aviva Care - Section 1',
  nrToBinder: 'New Business',
  carrier: 'Aviva Insurance Company Limited',
};

export const FEE = {
  type: 'DUAL Fee',
  subType: 'DUAL Policy/Admin Fee',
  payableBy: 'Insured',
  administeredBy: 'DUAL',
  includedInGwp: 'Yes',
  charged: '100',
  description: 'Test',
};

/**
 * UAL (Underwriting Authority Limit) conditional branch.
 * Used ONLY when marking the quote stage fails with
 * "Status cannot be changed as there are outstanding UAL/Carrier Referrals".
 */
export const UAL_CARE = {
  approverName: 'T-0006-SIT2-SCC-CAR-UW5 Auto-Provar',
  /**
   * The restricted "Quote UAL Approvers" lookup behaves differently per quote
   * (verified live):
   *  - New Business quote: searchable — "Provar" matches inline.
   *  - MTA/Renewal quote: the typed SEARCH returns "No results" for every term
   *    ("Provar", "T-0006"…); the approver is only offered as a RECENTLY-VIEWED
   *    item on click (the NB flow earlier in the chain makes the user recent).
   * So QuoteStatusPage tries recently-viewed first, then these search terms
   * (most-specific first), then the Advanced Search dialog. The `-Bdx` variant
   * is excluded by the row/option filters.
   */
  approverSearchTerms: ['Provar', 'T-0006-SIT2-SCC-CAR-UW5', 'T-0006'],
  errorToastText: 'Status cannot be changed as there are outstanding UAL/Carrier Referrals',
};

export const UAL_CONSTRUCTION = {
  approverName: 'T-0016-SIT2-SCC-CON-UW5 Auto-Provar',
  approverSearchTerms: ['Provar', 'T-0016-SIT2-SCC-CON-UW5', 'T-0016'],
  errorToastText: 'Status cannot be changed as there are outstanding UAL/Carrier Referrals',
};

/**
 * Environment-specific UAL approver data
 * @param baseUrl - The Salesforce instance URL
 * @param credentialType - 'care' or 'con'
 * @returns UAL approver data for the environment
 */
export function getUalApproverForEnvironment(
  baseUrl: string,
  credentialType: 'care' | 'con' = 'care'
): { approverName: string; approverSearchTerms: string[]; errorToastText: string } {
  const isSitp = baseUrl.includes('--sitp');
  const isUat2 = baseUrl.includes('--uat2');
  const isSit = baseUrl.includes('--sit');
  
  if (credentialType === 'care') {
    if (isUat2) {
      return {
        approverName: 'T-0006-UAT2-SCC-CAR-UW5 Auto-Provar',
        approverSearchTerms: ['T-0006-UAT2', 'CAR-UW5', 'T-0006', 'Auto-Provar', 'Provar'],
        errorToastText: 'Status cannot be changed as there are outstanding UAL/Carrier Referrals',
      };
    }
    if (isSitp) {
      return {
        approverName: 'T-0006-SIT2-SCC-CAR-UW5 Auto-Provar',
        approverSearchTerms: ['Provar', 'T-0006-SIT2-SCC-CAR-UW5', 'T-0006'],
        errorToastText: 'Status cannot be changed as there are outstanding UAL/Carrier Referrals',
      };
    }
    if (isSit) {
      return {
        approverName: 'T-0006-SIT-SCC-CAR-UW5 Auto-Provar',
        approverSearchTerms: ['Provar', 'T-0006-SIT-SCC-CAR-UW5', 'T-0006'],
        errorToastText: 'Status cannot be changed as there are outstanding UAL/Carrier Referrals',
      };
    }
    // Default to newprodqa2
    return UAL_CARE;
  }
  
  // Construction
  if (isUat2) {
    return {
      approverName: 'T-0016-UAT2-SCC-CON-UW5 Auto-Provar',
      approverSearchTerms: ['T-0016-UAT2', 'CON-UW5', 'T-0016', 'Auto-Provar', 'Provar'],
      errorToastText: 'Status cannot be changed as there are outstanding UAL/Carrier Referrals',
    };
  }
  if (isSitp) {
    return {
      approverName: 'T-0016-SIT2-SCC-CON-UW5 Auto-Provar',
      approverSearchTerms: ['Provar', 'T-0016-SIT2-SCC-CON-UW5', 'T-0016'],
      errorToastText: 'Status cannot be changed as there are outstanding UAL/Carrier Referrals',
    };
  }
  if (isSit) {
    return {
      approverName: 'T-0016-SIT-SCC-CON-UW5 Auto-Provar',
      approverSearchTerms: ['Provar', 'T-0016-SIT-SCC-CON-UW5', 'T-0016'],
      errorToastText: 'Status cannot be changed as there are outstanding UAL/Carrier Referrals',
    };
  }
  // Default to newprodqa2
  return UAL_CONSTRUCTION;
}

/** Backward-compatible alias used by existing Care flows/pages. */
export const UAL = UAL_CARE;

export const POLICY_EXPECTATIONS = {
  settlementCurrency: 'GBP',
  settlementType: 'Broker Settled',
  insurerReference: 'Insurer',
  status: 'In Force',
  newMtaRenewal: 'New Business',
  product: 'Care Howden',
};

// ---------------------------------------------------------------------------
// Post-NB lifecycle flows (run in sequence on the New Business policy):
//   CNR (Cancel & Re-issue) -> MTA -> Renewal -> Cancellation
// Values transcribed from "Implementation of other flows on New Business
// Policy" walkthrough doc + its 47 annotated screenshots.
// ---------------------------------------------------------------------------

/**
 * CNR — "Cancel and Reissue Details" OmniScript.
 * Effective/Expiry dates and Reason ("Cancel and Reissue") are prefilled and
 * read-only; only "Reason for C&R" and Description are set.
 */
export const CNR = {
  reasonForCandR: 'Other',
  description: 'Test CNR',
  /** Resulting policy keeps New/MTA/Renewal = New Business, path In Force. */
  policyNewMtaRenewal: 'New Business',
  policyStatus: 'In Force',
};

/**
 * MTA — "Enter MTA Information" OmniScript + the MTA "Enter Premiums" screen
 * (only "100% MTA Charge Premium" is editable there; other premium fields are
 * carried over read-only).
 */
export const MTA = {
  /**
   * MTA Effective + Submission dates are EMPTY and required on the live wizard
   * (the doc's prefilled screenshots are stale). Effective must be within the
   * policy period and on/after inception; the base NB policy incepts "today",
   * so a few days out is safe. Format is DD-MM-YYYY (see ukDateDash).
   */
  effectiveOffsetDays: 3,
  submissionOffsetDays: 0,
  submissionTime: '09:00:00',
  reason: 'Exposure/Limit Changes',
  description: 'Test MTA',
  /** Applied to every coverage's "100% MTA Charge Premium". */
  chargePremium: '10',
  policyNewMtaRenewal: 'MTA',
  policyStatus: 'In Force',
};

/**
 * Renewal — "Warning" (Yes) -> "Risk Details" (dates prefilled, Submit) ->
 * "Enter Premiums" (uniform values across all coverages) -> Select Binders
 * (all rows, N/R = New Business) -> RBS approval -> issue/bond -> Create Policy.
 */
export const RENEWAL = {
  premium: {
    technical: '10',
    grossWritten: '10',
    annualized: '5',
    commissionRate: '2',
  },
  policyNewMtaRenewal: 'Renewal',
  policyStatus: 'In Force',
};

/**
 * Cancellation — "Cancel Policy" form -> Next -> "Enter Premiums"
 * (Return FULL Premium = Yes) -> Submit. Policy path moves to "Cancelled".
 */
export const CANCELLATION = {
  category: 'Cancel the Policy from Inception',
  instigatedBy: 'Customer',
  reason: 'Product Too Expensive',
  notes: 'Test Cancellation',
  returnFullPremium: 'Yes',
  policyStatus: 'Cancelled',
};
