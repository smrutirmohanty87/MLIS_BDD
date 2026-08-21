import { Browser, Page } from '@playwright/test';
import { QuoteStatusPage } from '../pages/QuoteStatusPage';
import { ApprovalPage } from '../pages/ApprovalPage';
import { jwtLogin } from '../auth/sfJwt';
import { RENO_USERS } from '../data/renoData';

/**
 * "Issue and bond" for the Construction Renovation quote — same shape as the
 * Care `issueAndBond` (Quote Issued → sanction → Bound with the conditional
 * UW5/UAL branch), but the UW5 approver context authenticates via JWT
 * (newprodqa2 enforces MFA) instead of a password. `status` must already be
 * constructed with RENO_UAL (T-0016 approver).
 *
 * @param skipSanctionCheck If true, skip sanction check (used for MTA quotes where sanction was already done on NB)
 */
export async function renoIssueAndBond(
  page: Page,
  browser: Browser,
  status: QuoteStatusPage,
  skipSanctionCheck: boolean = false
): Promise<void> {
  const result = await status.markStage('Quote Issued');
  if (result === 'ual-required') {
    await status.setUalApprover();
    await status.submitUalApproval();

    const quoteId = page.url().match(/Quote\/([a-zA-Z0-9]+)\//)?.[1] ?? '';
    if (!quoteId) {
      throw new Error('Could not parse quote id from URL for UAL approval');
    }

    const approverContext = await browser.newContext();
    try {
      const approverPage = await approverContext.newPage();
      await jwtLogin(approverPage, RENO_USERS.uw5);
      const approver = new ApprovalPage(approverPage);
      await approver.approvePendingUal(quoteId);
    } finally {
      await approverContext.close();
    }

    await status.reloadAndWait();
    const retry = await status.markStage('Quote Issued');
    if (retry !== 'ok') {
      throw new Error('"Quote Issued" still blocked after UAL approval');
    }
  }

  if (!skipSanctionCheck) {
    await status.runSanctionCheck();
    await status.waitForSanctionPass();
  }

  const bound = await status.markStage('Bound');
  if (bound !== 'ok') {
    throw new Error('Marking the quote "Bound" failed (unexpected UAL block)');
  }
}
