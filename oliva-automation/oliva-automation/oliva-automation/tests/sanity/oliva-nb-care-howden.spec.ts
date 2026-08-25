import { test, expect } from '@playwright/test';
import { QuotePage } from '../../src/pages/QuotePage';
import { PolicyPage } from '../../src/pages/PolicyPage';
import { createNbPolicy } from '../../src/flows/createNbPolicy';
import { POLICY_EXPECTATIONS } from '../../src/data/testdata';

/**
 * End-to-end: Oliva New Business policy for Care Howden.
 *
 * The ENTIRE flow runs as the UW3 user (SF_USERNAME). The UAL approver
 * context (SF_UAL_APPROVER_*) is opened ONLY when Salesforce rejects the
 * stage change with "outstanding UAL/Carrier Referrals" â€” per business rule
 * the quote can be marked Bound only after that approval.
 *
 * The journey itself lives in the reusable `createNbPolicy` flow so the
 * lifecycle chain (CNRâ†’MTAâ†’Renewalâ†’Cancellation) can build on the same base.
 */
test('create NB Care Howden policy end-to-end', async ({ page, browser }) => {
  const policyNumber = await createNbPolicy(page, browser);
  expect(policyNumber).not.toEqual('');

  // Assert the resulting InsurancePolicy record (page is on it after Go To Policy).
  const quote = new QuotePage(page);
  const policy = new PolicyPage(page);
  const gwp = await quote.dualShareGwp().catch(() => '');
  await policy.assertCreated(POLICY_EXPECTATIONS, gwp);
  console.log(`Policy created: ${policyNumber}`);
});

