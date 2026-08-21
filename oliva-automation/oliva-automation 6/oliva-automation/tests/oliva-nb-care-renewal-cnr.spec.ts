import { test, expect } from '@playwright/test';
import { jwtLogin } from '../src/auth/sfJwt';
import { createNbPolicy } from '../src/flows/createNbPolicy';
import { issueAndBond } from '../src/flows/issueAndBond';
import { PolicyActionsPage } from '../src/pages/PolicyActionsPage';
import { QuotePage } from '../src/pages/QuotePage';
import { QuoteStatusPage } from '../src/pages/QuoteStatusPage';
import { PremiumPage } from '../src/pages/PremiumPage';
import { BindersPage } from '../src/pages/BindersPage';
import { RbsApprovalPage } from '../src/pages/RbsApprovalPage';
import { PolicyPage } from '../src/pages/PolicyPage';
import { CNR, RENEWAL, CANCELLATION } from '../src/data/testdata';

/**
 * End-to-end lifecycle chain for Care Howden:
 *   NB (New Business) → Renewal → CNR (Cancel & Reissue)
 *
 * The base NB policy is created fresh via the shared `createNbPolicy` flow.
 * Then Renewal and CNR flows run sequentially on the policy produced by the
 * previous one. The entire journey runs as Care UW3; UW5/UAL approval branch
 * fires only when Salesforce rejects a stage change (see issueAndBond).
 *
 * Uses Care-specific users from SIT environment:
 *   SF_CARE_USERNAME (Care UW3): t-0001-car-uw3-auto-provar@scc.sit
 *   SF_CARE_UAL_APPROVER_USERNAME (Care UW5): t-0006-car-uw5-auto-provar@scc.sit
 */
test('Care Howden lifecycle: NB → Renewal → CNR', async ({ page, browser }) => {
  // Set up Care-specific users for this test
  const careUwUser = process.env.SF_CARE_USERNAME || 't-0001-car-uw3-auto-provar@scc.sit';
  const careUalUser = process.env.SF_CARE_UAL_APPROVER_USERNAME || 't-0006-car-uw5-auto-provar@scc.sit';
  process.env.SF_USERNAME = careUwUser;
  process.env.SF_UAL_APPROVER_USERNAME = careUalUser;

  // Three sequential Salesforce journeys — well beyond the 30-min default.
  test.setTimeout(75 * 60 * 1000);

  // JWT login as Care UW3 (required for SIT environment)
  await jwtLogin(page, careUwUser);

  const policyActions = new PolicyActionsPage(page);
  const quote = new QuotePage(page);
  const status = new QuoteStatusPage(page);
  const premiums = new PremiumPage(page);
  const binders = new BindersPage(page);
  const rbs = new RbsApprovalPage(page);
  const policy = new PolicyPage(page);

  await test.step('Create base New Business policy', async () => {
    const nb = await createNbPolicy(page, browser, true); // skipLogin=true for JWT auth
    expect(nb, 'base NB policy number').not.toEqual('');
    console.log(`[care-renewal-cnr] base NB policy: ${nb}`);
  });

  await test.step('Renewal', async () => {
    await policyActions.startRenewal();
    await quote.clickEnterPremiums();
    await premiums.fillUniformAndSubmit(RENEWAL.premium);
    await binders.selectAllBinders();
    await rbs.approveFirstRbs();
    await issueAndBond(page, browser, status);
    const renewalPolicy = await status.createPolicy();
    expect(renewalPolicy, 'renewal policy number').not.toEqual('');
    await status.goToPolicy();
    await policy.assertState(RENEWAL.policyStatus, RENEWAL.policyNewMtaRenewal);
    console.log(`[care-renewal-cnr] Renewal policy: ${renewalPolicy}`);
  });

  await test.step('CNR — Cancel and Reissue', async () => {
    await policyActions.startCancelAndReissue();
    await status.confirmNoManualRbsReferralReasons();
    await issueAndBond(page, browser, status);
    const reissued = await status.cancelAndReissuePolicy();
    expect(reissued, 'reissued policy number').not.toEqual('');
    await status.goToPolicy();
    await policy.assertState(CNR.policyStatus, CNR.policyNewMtaRenewal);
    console.log(`[care-renewal-cnr] CNR reissued policy: ${reissued}`);
  });
});
