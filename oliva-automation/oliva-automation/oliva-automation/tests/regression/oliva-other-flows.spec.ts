import { test, expect } from '@playwright/test';
import { createNbPolicy } from '../../src/flows/createNbPolicy';
import { issueAndBond } from '../../src/flows/issueAndBond';
import { PolicyActionsPage } from '../../src/pages/PolicyActionsPage';
import { QuotePage } from '../../src/pages/QuotePage';
import { QuoteStatusPage } from '../../src/pages/QuoteStatusPage';
import { PremiumPage } from '../../src/pages/PremiumPage';
import { BindersPage } from '../../src/pages/BindersPage';
import { RbsApprovalPage } from '../../src/pages/RbsApprovalPage';
import { PolicyPage } from '../../src/pages/PolicyPage';
import { CNR, MTA, RENEWAL, CANCELLATION } from '../../src/data/testdata';

/**
 * End-to-end lifecycle chain on a New Business policy:
 *   CNR (Cancel & Re-issue) â†’ MTA â†’ Renewal â†’ Cancellation
 *
 * Each flow runs on the policy produced by the previous one (the doc: "only
 * NB policy should be present which is base of all flows"). The base NB policy
 * is created fresh via the shared `createNbPolicy` flow so the run is fully
 * self-contained. The whole journey runs as UW3; the UW5/UAL approval branch
 * fires only when Salesforce actually blocks a stage change (see issueAndBond).
 */
test('lifecycle chain: CNR â†’ MTA â†’ Renewal â†’ Cancellation', async ({ page, browser }) => {
  // Five sequential Salesforce journeys â€” well beyond the 30-min default.
  test.setTimeout(75 * 60 * 1000);

  const policyActions = new PolicyActionsPage(page);
  const quote = new QuotePage(page);
  const status = new QuoteStatusPage(page);
  const premiums = new PremiumPage(page);
  const binders = new BindersPage(page);
  const rbs = new RbsApprovalPage(page);
  const policy = new PolicyPage(page);

  await test.step('Create base New Business policy', async () => {
    const nb = await createNbPolicy(page, browser);
    expect(nb, 'base NB policy number').not.toEqual('');
    console.log(`[chain] base NB policy: ${nb}`);
  });

  await test.step('CNR â€” Cancel and Reissue', async () => {
    await policyActions.startCancelAndReissue();
    await status.confirmNoManualRbsReferralReasons();
    await issueAndBond(page, browser, status);
    const reissued = await status.cancelAndReissuePolicy();
    expect(reissued, 'reissued policy number').not.toEqual('');
    await status.goToPolicy();
    await policy.assertState(CNR.policyStatus, CNR.policyNewMtaRenewal);
    console.log(`[chain] CNR reissued policy: ${reissued}`);
  });

  await test.step('MTA â€” Mid-term Adjustment', async () => {
    await policyActions.createMta();
    await quote.clickEnterPremiums();
    await premiums.fillMtaChargeAndSubmitByCoverage(MTA.chargePremiums);
    await rbs.approveFirstRbs();
    await issueAndBond(page, browser, status);
    const mtaPolicy = await status.createPolicyVersion();
    expect(mtaPolicy, 'MTA policy id').not.toEqual('');
    await status.goToPolicy();
    await policy.assertState(MTA.policyStatus, MTA.policyNewMtaRenewal);
    console.log(`[chain] MTA policy: ${mtaPolicy}`);
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
    console.log(`[chain] Renewal policy: ${renewalPolicy}`);
  });

  await test.step('Cancellation', async () => {
    await policyActions.cancelPolicy();
    await policy.assertState(CANCELLATION.policyStatus);
    console.log('[chain] policy cancelled');
  });
});

