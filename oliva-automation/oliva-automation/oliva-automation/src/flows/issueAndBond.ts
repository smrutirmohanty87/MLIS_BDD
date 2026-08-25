import { Browser, Page } from '@playwright/test';
import { QuoteStatusPage } from '../pages/QuoteStatusPage';
import { ApprovalPage } from '../pages/ApprovalPage';

/**
 * Shared "issue and bond" sequence for a quote (New Business, CNR, MTA,
 * Renewal): mark "Quote Issued", run the sanction check to Pass, then mark
 * "Bound". Leaves the quote on its record page ready for policy creation.
 *
 * Business rule (NON-NEGOTIABLE): the UW5/UAL approval branch runs ONLY when
 * Salesforce actually blocks the "Quote Issued" transition with the
 * "outstanding UAL/Carrier Referrals" toast. Otherwise the ENTIRE flow stays
 * on the UW3 user. A second browser context is opened for the UW5 approver
 * and closed immediately after approval.
 */
export async function issueAndBond(
  page: Page,
  browser: Browser,
  status: QuoteStatusPage
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
      const approver = new ApprovalPage(approverPage);
      await approver.login(
        process.env.SF_UAL_APPROVER_USERNAME!,
        process.env.SF_UAL_APPROVER_PASSWORD!
      );
      await approver.approvePendingUal(quoteId);
    } finally {
      await approverContext.close();
    }

    // Approval auto-advances the quote to "Ready"; re-attempt "Quote Issued".
    await status.reloadAndWait();
    const retry = await status.markStage('Quote Issued');
    if (retry !== 'ok') {
      throw new Error('"Quote Issued" still blocked after UAL approval');
    }
  }

  await status.runSanctionCheck();
  await status.waitForSanctionPass();

  const bound = await status.markStage('Bound');
  if (bound !== 'ok') {
    throw new Error('Marking the quote "Bound" failed (unexpected UAL block)');
  }
}
