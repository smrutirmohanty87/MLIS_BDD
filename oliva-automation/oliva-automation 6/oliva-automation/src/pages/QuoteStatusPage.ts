import { Locator, Page, expect } from '@playwright/test';
import { UAL } from '../data/testdata';
import { openRecordTab, waitForSpinners } from '../utils/sf';
import { logOlivaPolicyNumber } from '../utils/policyTracker';

/** Outcome of a path-stage transition attempt. */
export type StageResult = 'ok' | 'ual-required';

/**
 * Quote record page — stage transitions (with the conditional UAL branch),
 * ERN exemption, sanction check and policy creation.
 */
export class QuoteStatusPage {
  /**
   * @param ual approver/toast config — defaults to the Care (sitp) UAL; the
   *   Construction Renovation flow injects RENO_UAL (T-0016 approver) here.
   */
  constructor(private page: Page, private ual: typeof UAL = UAL) {}

  /** Toast filtered by text (verified toast container classes). */
  private toast(text: string | RegExp) {
    return this.page
      .locator('.slds-notify, [data-key], .toastMessage')
      .filter({ hasText: text })
      .first();
  }

  /** Visible record-layout item containing a field label. */
  private detailItem(label: string) {
    return this.page
      .locator('records-record-layout-item, force-record-layout-item, .slds-form-element')
      .filter({ hasText: label })
      .filter({ visible: true })
      .first();
  }

  /** Click the VISIBLE record tab with this name (multiple subtabs share names). */
  private async clickVisibleTab(name: string): Promise<void> {
    const tabs = this.page
      .getByRole('tab', { name, exact: true })
      .filter({ visible: true });
    await expect(tabs.last()).toBeVisible({ timeout: 60_000 });
    await tabs.last().click();
    await waitForSpinners(this.page);
  }

  /** Click a locator if it becomes visible; returns whether it was clicked. */
  private async clickIfVisible(locator: Locator, timeout = 4_000): Promise<boolean> {
    if (await locator.isVisible({ timeout }).catch(() => false)) {
      await locator.click();
      return true;
    }
    return false;
  }

  /** Footer Save of a Lightning inline record edit. */
  private footerSave() {
    return this.page
      .locator('button[name="SaveEdit"]')
      .or(this.page.getByRole('button', { name: 'Save', exact: true }))
      .filter({ visible: true })
      .last();
  }

  /**
   * Header actions overflow ▾. Several page regions expose a "more actions"
   * button (list-view split panel, activity tiles, the record header), so try
   * EVERY visible candidate until one opens a menu containing `expectedItem`.
   */
  private async openHeaderActionsMenu(expectedItem: string | RegExp): Promise<void> {
    // Bring the record header into view — earlier steps (e.g. setUalApprover)
    // leave the page scrolled down, and the "Show more actions" ▾ lives up top.
    await this.page.mouse.wheel(0, -3000);
    await this.page.waitForTimeout(300);
    const candidates = this.page
      .getByRole('button', { name: /more actions/i })
      .filter({ visible: true });
    const count = Math.max(await candidates.count(), 1);
    for (let i = 0; i < count; i++) {
      await candidates.nth(i).click().catch(() => {});
      const opened = await this.page
        .getByRole('menuitem')
        .first()
        .isVisible({ timeout: 3000 })
        .catch(() => false);
      if (opened) {
        const item = this.page.getByRole('menuitem', { name: expectedItem }).first();
        if (await item.isVisible({ timeout: 1500 }).catch(() => false)) return;
      }
      await this.page.keyboard.press('Escape').catch(() => {});
      await this.page.waitForTimeout(300);
    }
    throw new Error(`No header actions menu contains "${expectedItem}"`);
  }

  /** Details tab → "ERN Details" → inline edit "ERN Exempt" = Yes → Save. */
  async setErnExempt(): Promise<void> {
    await this.clickVisibleTab('Details');
    await this.page
      .getByText('ERN Details', { exact: false })
      .first()
      .scrollIntoViewIfNeeded()
      .catch(() => {});

    const item = this.detailItem('ERN Exempt');
    await item.scrollIntoViewIfNeeded().catch(() => {});
    await this.page
      .getByRole('button', { name: /Edit ERN Exempt/i })
      .or(item.locator('button[title*="Edit"]'))
      .filter({ visible: true })
      .first()
      .click();

    const picklist = this.page
      .getByRole('combobox', { name: /ERN Exempt/i })
      .filter({ visible: true })
      .first();
    await picklist.click();
    await this.page.getByRole('option', { name: 'Yes', exact: true }).first().click();

    await this.footerSave().click();
    await waitForSpinners(this.page);
    await expect(this.detailItem('ERN Exempt')).toContainText('Yes', { timeout: 60_000 });
  }

  /**
   * Click the path chevron for `stage`, then "Mark as Current Status" /
   * "Mark Status as Complete", and race the success toast against the UAL
   * error toast. The error toast is dismissed before returning.
   *
   * @returns 'ok' on "Record updated", 'ual-required' on the UAL error toast.
   */
  async markStage(stage: string): Promise<StageResult> {
    // Idempotent: if the stage is ALREADY current (e.g. a resumed run on a quote
    // that was issued in a prior attempt), don't click anything — pressing
    // "Mark Status as Complete" on the current stage would advance the path
    // one stage too far.
    // NOTE: only `.slds-is-current` marks the TRUE current stage —
    // `.slds-is-active` merely means "selected/clicked" and false-positives.
    // `.slds-is-complete` (green check) means the stage was already passed —
    // also 'ok', so a resumed run can never regress the path.
    const alreadyCurrent = this.page
      .locator('.slds-path__item.slds-is-current, .slds-path__item.slds-is-complete')
      .filter({ hasText: stage })
      .filter({ visible: true })
      .first();
    if (await alreadyCurrent.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log(`[QuoteStatusPage] markStage("${stage}") — already current/complete, skipping`);
      return 'ok';
    }

    const chevron = this.page
      .locator('.slds-path__item')
      .filter({ hasText: stage })
      .or(this.page.getByRole('option', { name: stage }))
      .filter({ visible: true })
      .first();
    await chevron.click();
    await waitForSpinners(this.page);

    // Label depends on whether a non-current stage is selected — handle both.
    const markButton = this.page
      .getByRole('button', { name: /Mark (Status as Complete|as Current Status)/ })
      .filter({ visible: true })
      .first();
    await markButton.click();

    // Outcome detection is STATE-BASED, not toast-only: the Construction org
    // doesn't reliably show the "Record updated" toast (verified — the click
    // can silently no-op or the toast text differs), so poll for ANY of:
    // success toast, UAL error toast, the stage actually becoming current, or
    // a confirmation dialog (accept it). Re-click once mid-way if nothing moved.
    const success = this.toast('Record updated');
    const errorToast = this.toast(this.ual.errorToastText);
    const stageCurrent = this.page
      .locator('.slds-path__item.slds-is-current')
      .filter({ hasText: stage })
      .filter({ visible: true })
      .first();

    const deadline = Date.now() + 90_000;
    let reclicked = false;
    while (Date.now() < deadline) {
      if (await errorToast.isVisible().catch(() => false)) {
        console.log(`[QuoteStatusPage] markStage("${stage}") blocked by UAL referrals`);
        await this.page
          .locator('.slds-notify button[title*="Close"], .slds-notify__close button, button.toastClose')
          .filter({ visible: true })
          .first()
          .click()
          .catch(() => {});
        await expect(errorToast).toBeHidden({ timeout: 15_000 }).catch(() => {});
        return 'ual-required';
      }
      if (await success.isVisible().catch(() => false)) {
        await waitForSpinners(this.page);
        return 'ok';
      }
      if (await stageCurrent.isVisible().catch(() => false)) {
        console.log(`[QuoteStatusPage] markStage("${stage}") confirmed via path state`);
        await waitForSpinners(this.page);
        return 'ok';
      }
      // ANY other error toast (e.g. "Binders must be selected for all
      // applicable coverages") — fail FAST with its text instead of a silent
      // 90s timeout. The UAL toast was already checked above.
      const anyError = this.page
        .locator('.slds-notify.slds-notify_toast.slds-theme_error, .toastMessage')
        .filter({ hasText: /must be|cannot|not allowed|error|failed|invalid/i })
        .filter({ visible: true })
        .first();
      if (await anyError.isVisible().catch(() => false)) {
        const text = ((await anyError.textContent().catch(() => '')) ?? '').trim();
        throw new Error(`markStage("${stage}") blocked: "${text}"`);
      }
      // Confirmation dialog (some transitions ask) — accept it.
      const confirm = this.page
        .getByRole('dialog')
        .filter({ visible: true })
        .last()
        .getByRole('button', { name: /^(Save|Confirm|Yes|OK|Finish)$/i })
        .first();
      if (await confirm.isVisible().catch(() => false)) {
        await confirm.click().catch(() => {});
        await waitForSpinners(this.page);
        continue;
      }

      // Construction org: the transition opens an OmniScript WIZARD in a console
      // subtab ("c:dualQ…") that must be completed before the stage advances
      // (Care shows a toast instead). Drive it generically: advance buttons
      // until the subtab closes or the stage becomes current.
      if (await this.driveStageWizard()) continue;
      // Half-way with no movement: the click may have landed during a settle —
      // re-click the (still visible) Mark button once.
      if (!reclicked && Date.now() > deadline - 45_000) {
        if (await markButton.isVisible().catch(() => false)) {
          console.log(`[QuoteStatusPage] markStage("${stage}") re-clicking Mark button`);
          await markButton.click().catch(() => {});
          reclicked = true;
        }
      }
      await this.page.waitForTimeout(2000);
    }
    throw new Error(
      `markStage("${stage}"): no success toast, no UAL toast, and the stage never became current`
    );
  }

  /**
   * If a "c:dualQ…" stage-transition wizard subtab is open, bring it to the
   * foreground and click its advance button (Next/Submit/Finish/Generate/OK/
   * Continue — whichever is visible). @returns whether a wizard was handled.
   */
  private async driveStageWizard(): Promise<boolean> {
    const wizardTab = this.page
      .getByRole('tab', { name: /c:dualQ/i })
      .filter({ visible: true })
      .last();
    if (!(await wizardTab.isVisible({ timeout: 1000 }).catch(() => false))) return false;
    if ((await wizardTab.getAttribute('aria-selected').catch(() => null)) !== 'true') {
      await wizardTab.click().catch(() => {});
      await waitForSpinners(this.page);
    }
    const advance = this.page
      .getByRole('button', { name: /^(Next|Submit|Finish|Generate|OK|Continue|Save|Done|Issue)$/i })
      .filter({ visible: true })
      .last();
    if (await advance.isVisible({ timeout: 3000 }).catch(() => false)) {
      const label = (await advance.textContent().catch(() => '')) ?? '';
      console.log(`[QuoteStatusPage] stage wizard — clicking "${label.trim()}"`);
      await advance.click().catch(() => {});
      await waitForSpinners(this.page);
    }
    return true;
  }

  /**
   * Details tab → "UAL Details" → inline edit "UAL Approver": search the
   * restricted "Quote UAL Approvers" lookup, using Advanced Search when the
   * dropdown does not offer the approver directly. Picks the EXACT approver
   * name (never the "-Bdx" variant), then saves.
   */
  async setUalApprover(): Promise<void> {
    await this.clickVisibleTab('Details');
    await this.page
      .getByText('UAL Details', { exact: false })
      .first()
      .scrollIntoViewIfNeeded()
      .catch(() => {});

    const item = this.detailItem('UAL Approver');
    await item.scrollIntoViewIfNeeded().catch(() => {});
    await this.page
      .getByRole('button', { name: /Edit UAL Approver/i })
      .or(item.locator('button[title*="Edit"]'))
      .filter({ visible: true })
      .first()
      .click();

    const lookup = this.page
      .getByPlaceholder(/Search Quote UAL Approvers/i)
      .or(this.page.getByRole('combobox', { name: /UAL Approver/i }))
      .filter({ visible: true })
      .first();
    await lookup.click();

    // The exact approver option, excluding the "-Bdx" variant (whose name
    // contains the base name as a substring).
    const directOption = this.page
      .getByRole('option', { name: this.ual.approverName })
      .filter({ hasNotText: '-Bdx' })
      .filter({ visible: true })
      .first();

    // PRIMARY path — recently-viewed items shown on click (no typing). Verified
    // live: on MTA/Renewal quotes the restricted lookup's typed SEARCH returns
    // "No results" for every term; the approver is only offered as a recently
    // viewed item (the NB flow earlier in the chain makes the user recent). Do
    // NOT type first — typing filters the recent list out.
    await this.page.waitForTimeout(1200);
    let picked = await this.clickIfVisible(directOption);

    // FALLBACK — typed search (works on the searchable NB quote). Try each term
    // most-specific first, clicking the option as soon as it appears.
    if (!picked) {
      for (const term of this.ual.approverSearchTerms) {
        await lookup.click();
        await lookup.fill(term);
        await this.page.waitForTimeout(1500);
        if (await this.clickIfVisible(directOption)) {
          picked = true;
          break;
        }
      }
    }

    // LAST RESORT — the Advanced Search dialog.
    let expectedApproverText = this.ual.approverName;
    if (!picked) {
      expectedApproverText = await this.pickApproverViaAdvancedSearch();
    }

    await this.footerSave().click();
    await waitForSpinners(this.page);
    const approverToken = expectedApproverText.match(/T-\d{4}(?:-[A-Z0-9]+)*/i)?.[0] ?? expectedApproverText;
    await expect(this.detailItem('UAL Approver')).toContainText(approverToken, {
      timeout: 60_000,
    });
  }

  /**
   * "Show more results" → Advanced Search dialog → radio row → Select. The
   * restricted lookup matches on NAME PREFIX, so we search the leading portion
   * of the name and fall back to a broader prefix if the first yields no rows.
   */
  private async pickApproverViaAdvancedSearch(): Promise<string> {
    await this.page.getByText(/Show more results/i).first().click();
    const dialog = this.page.getByRole('dialog').filter({ visible: true }).last();
    await expect(dialog).toBeVisible({ timeout: 30_000 });

    const searchBox = dialog
      .getByRole('searchbox')
      .or(dialog.locator('input[type="search"], input[type="text"]'))
      .filter({ visible: true })
      .first();

    // EXACT approver row — exclude the "-Bdx" variant.
    const row = dialog
      .locator('tr')
      .filter({ hasText: this.ual.approverName })
      .filter({ hasNotText: '-Bdx' })
      .first();

    for (const term of this.ual.approverSearchTerms) {
      await searchBox.click();
      await searchBox.fill(term);
      const searchButton = dialog.getByRole('button', { name: 'Search', exact: true }).first();
      if (await searchButton.isVisible().catch(() => false)) {
        await searchButton.click();
      } else {
        await searchBox.press('Enter');
      }
      await waitForSpinners(this.page);
      if (await row.isVisible({ timeout: 15_000 }).catch(() => false)) break;
    }

    let selectedRow = row;
    if (!(await row.isVisible({ timeout: 2_000 }).catch(() => false))) {
      // Fallback for env/user drifts: pick the first non-Bdx approver row.
      selectedRow = dialog
        .locator('tr')
        .filter({ has: dialog.locator('input[type="radio"], .slds-radio') })
        .filter({ hasNotText: '-Bdx' })
        .first();
    }

    await expect(selectedRow).toBeVisible({ timeout: 30_000 });
    await selectedRow
      .locator('input[type="radio"], .slds-radio')
      .first()
      .click({ force: true });
    await dialog.getByRole('button', { name: 'Select', exact: true }).first().click();
    await waitForSpinners(this.page);
    return ((await selectedRow.innerText().catch(() => this.ual.approverName)) || this.ual.approverName).replace(/\s+/g, ' ').trim();
  }

  /** Header ▾ → "Submit UAL Approval" → modal (prefilled comment) → Save. */
  async submitUalApproval(): Promise<void> {
    await this.openHeaderActionsMenu('Submit UAL Approval');
    await this.page.getByRole('menuitem', { name: 'Submit UAL Approval' }).first().click();

    const dialog = this.page
      .getByRole('dialog')
      .filter({ hasText: 'Submit UAL Approval' })
      .first();
    await expect(dialog).toBeVisible({ timeout: 30_000 });
    await dialog.getByRole('button', { name: 'Save', exact: true }).first().click();
    await expect(dialog).toBeHidden({ timeout: 60_000 });
    await waitForSpinners(this.page);
  }

  /** Full reload; used after the approver acts (quote auto-advances to Ready). */
  async reloadAndWait(): Promise<void> {
    await this.page.reload();
    await waitForSpinners(this.page);
    await expect(
      this.page
        .getByRole('tab', { name: 'Details', exact: true })
        .filter({ visible: true })
        .last()
    ).toBeVisible({ timeout: 60_000 });
  }

  /**
   * Header ▾ → "Sanction Check". Either a progress modal appears and
   * auto-dismisses, or (verified on reissued/copied quotes whose sanction was
   * already run) an "Sanction check is already done" info toast shows — in
   * which case there is nothing to wait for.
   */
  async runSanctionCheck(): Promise<void> {
    await this.openHeaderActionsMenu('Sanction Check');
    await this.page.getByRole('menuitem', { name: 'Sanction Check' }).first().click();

    const alreadyDone = this.toast(/Sanction check is already done/i);
    const progress = this.page.getByText('A Sanction Check is in progress').first();
    // Race: whichever appears first. If "already done", skip the wait.
    await Promise.race([
      alreadyDone.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {}),
      progress.waitFor({ state: 'visible', timeout: 15_000 }).catch(() => {}),
    ]);
    if (!(await alreadyDone.isVisible().catch(() => false))) {
      await progress.waitFor({ state: 'hidden', timeout: 60_000 }).catch(() => {});
    }
    await waitForSpinners(this.page);
  }

  /** Reload-poll (6×, 10s apart) until "Sanction Check Status (Insured)" = Pass. */
  async waitForSanctionPass(): Promise<void> {
    for (let attempt = 1; attempt <= 6; attempt++) {
      await this.page.reload();
      await waitForSpinners(this.page);
      await this.clickVisibleTab('Details');
      await this.page
        .getByText('Sanctions Check Information', { exact: false })
        .first()
        .scrollIntoViewIfNeeded()
        .catch(() => {});

      const status = this.detailItem('Sanction Check Status (Insured)');
      const text = (await status.textContent().catch(() => '')) ?? '';
      if (text.includes('Pass')) {
        console.log(`[QuoteStatusPage] sanction check passed on attempt ${attempt}`);
        return;
      }
      console.log(`[QuoteStatusPage] sanction status not "Pass" yet (attempt ${attempt}/6)`);
      if (attempt < 6) {
        await this.page.waitForTimeout(10_000); // documented async-result poll interval
      }
    }

    // Doc remediation branch: "check if Sanction check status is in Pass —
    // if not, update the highlighted and Save it". Inline-edit the status to
    // Pass (same pattern as setErnExempt) before giving up.
    console.log('[QuoteStatusPage] sanction not "Pass" after 6 polls — applying manual remediation');
    const item = this.detailItem('Sanction Check Status (Insured)');
    await item.scrollIntoViewIfNeeded().catch(() => {});
    await this.page
      .getByRole('button', { name: /Edit Sanction Check Status/i })
      .or(item.locator('button[title*="Edit"]'))
      .filter({ visible: true })
      .first()
      .click();
    const picklist = this.page
      .getByRole('combobox', { name: /Sanction Check Status/i })
      .filter({ visible: true })
      .first();
    await picklist.click();
    await this.page.getByRole('option', { name: 'Pass', exact: true }).first().click();
    await this.footerSave().click();
    await waitForSpinners(this.page);
    await expect(
      this.detailItem('Sanction Check Status (Insured)'),
      'Sanction Check Status (Insured) did not reach "Pass" after 6 polls + manual remediation'
    ).toContainText('Pass', { timeout: 60_000 });
    console.log('[QuoteStatusPage] sanction status set to "Pass" via manual remediation');
  }

  /**
   * CNR — "Selected Binders" tab → "Confirm No Manual RBS Referral Reasons"
   * button; waits for the "Confirm No Manual Reasons selected …" toast.
   */
  async confirmNoManualRbsReferralReasons(): Promise<void> {
    await openRecordTab(this.page, 'Selected Binders');
    // Wait for the Risk Binder Sections grid to render so the bulk action
    // covers every section (verified: clicking too early misses rows).
    await expect(
      this.page.getByText('Risk Binder Sections', { exact: false }).first()
    ).toBeVisible({ timeout: 60_000 });
    await expect(
      this.page.getByRole('link', { name: /^RBS-/ }).first()
    ).toBeVisible({ timeout: 60_000 });

    await this.page
      .getByRole('button', { name: /Confirm No Manual RBS Referral Reasons/i })
      .filter({ visible: true })
      .first()
      .click();
    await expect(this.toast(/Confirm No Manual Reasons selected/i)).toBeVisible({
      timeout: 60_000,
    });
    await waitForSpinners(this.page);
  }

  /**
   * NB / Renewal — Actions panel "Create Policy" → Policy Details/Create Policy
   * form → Submit → "Policy Success". @returns the generated policy number.
   */
  async createPolicy(): Promise<string> {
    return this.runPolicyCreation({
      actionButton: 'Create Policy',
      formHeading: 'Create Policy',
      successText: 'Policy Success',
      idSource: 'input',
    });
  }

  /**
   * CNR — Actions panel "Cancel and Reissue Policy" → "Policy Details" form →
   * Submit → "Policy Success". @returns the reissued policy number.
   */
  async cancelAndReissuePolicy(): Promise<string> {
    return this.runPolicyCreation({
      actionButton: 'Cancel and Reissue Policy',
      formHeading: 'Policy Details',
      successText: 'Policy Success',
      idSource: 'input',
    });
  }

  /**
   * MTA — Actions panel "Create Policy Version" → "New Policy Version" form →
   * Submit → "Policy Version done" ("Policy Id: …"). @returns the policy id.
   */
  async createPolicyVersion(): Promise<string> {
    return this.runPolicyCreation({
      actionButton: 'Create Policy Version',
      formHeading: 'New Policy Version',
      successText: 'Policy Version done',
      idSource: 'text',
    });
  }

  /**
   * Generic policy-creation driver: click the Actions button, wait for the
   * OmniScript form, Submit, then loop (≤3 min) handling both outcomes —
   * non-fatal red error block (click Continue) and the success screen — and
   * read back the policy identifier (from a "Policy Number" input, or from the
   * "Policy Id: …" success text).
   */
  private async runPolicyCreation(opts: {
    actionButton: string;
    formHeading: string;
    successText: string;
    idSource: 'input' | 'text';
  }): Promise<string> {
    // Filter to VISIBLE and scroll — the Actions panel button can have hidden
    // duplicates in the DOM, and it sits in the right rail (may be off-screen).
    const actionButton = this.page
      .getByRole('button', { name: opts.actionButton })
      .filter({ visible: true })
      .first();
    await actionButton.waitFor({ state: 'visible', timeout: 60_000 });
    await actionButton.scrollIntoViewIfNeeded().catch(() => {});
    await actionButton.click();
    await expect(
      this.page
        .getByRole('heading', { name: opts.formHeading })
        .or(this.page.getByText(opts.formHeading, { exact: true }))
        .filter({ visible: true })
        .last()
    ).toBeVisible({ timeout: 60_000 });
    await waitForSpinners(this.page);

    await this.page.getByRole('button', { name: 'Submit', exact: true }).first().click();

    const successMark = this.page.getByText(opts.successText, { exact: false }).first();
    const continueButton = this.page
      .getByRole('button', { name: 'Continue', exact: true })
      .filter({ visible: true })
      .first();

    const deadline = Date.now() + 180_000;
    while (Date.now() < deadline) {
      if (await successMark.isVisible().catch(() => false)) {
        const id =
          opts.idSource === 'input'
            ? await this.readPolicyNumberInput()
            : await this.readPolicyIdText();
        await logOlivaPolicyNumber({ policyNumber: id, flowAction: opts.actionButton });
        console.log(`[QuoteStatusPage] policy created via "${opts.actionButton}": ${id}`);
        return id;
      }
      if (await continueButton.isVisible().catch(() => false)) {
        // Non-fatal error block (e.g. DRPInstalmentSettlementDueDate access).
        console.log('[QuoteStatusPage] non-fatal error block — clicking Continue');
        await continueButton.click().catch(() => {});
        await waitForSpinners(this.page);
      }
      await this.page.waitForTimeout(2000);
    }
    throw new Error(
      `"${opts.successText}" did not appear within 3 minutes of Submit`
    );
  }

  /** Read the "Policy Number" success input (CNR / Create Policy screens). */
  private async readPolicyNumberInput(): Promise<string> {
    const input = this.page
      .getByLabel('Policy Number', { exact: false })
      .or(
        this.page
          .locator('.slds-form-element')
          .filter({ hasText: 'Policy Number' })
          .locator('input')
      )
      .filter({ visible: true })
      .first();
    await expect(input).toBeVisible({ timeout: 30_000 });
    return (await input.inputValue()).trim();
  }

  /** Read the "Policy Id: …" success text (Create Policy Version screen). */
  private async readPolicyIdText(): Promise<string> {
    const el = this.page.getByText(/Policy Id:/i).filter({ visible: true }).first();
    await expect(el).toBeVisible({ timeout: 30_000 });
    const text = (await el.innerText()).trim();
    const match = text.match(/Policy Id:\s*(\S+)/i);
    return match ? match[1] : text.replace(/Policy Id:\s*/i, '').trim();
  }

  /** "Go To Policy" → InsurancePolicy record page (path shows "In Force"). */
  async goToPolicy(): Promise<void> {
    await this.page
      .getByRole('link', { name: 'Go To Policy' })
      .or(this.page.getByRole('button', { name: 'Go To Policy' }))
      .first()
      .click();
    await this.page.waitForURL(/\/InsurancePolicy\//, { timeout: 90_000 });
    await waitForSpinners(this.page);
    // Filter to the VISIBLE path item — other (background) workspace tabs can
    // leave stale, hidden "In Force" chevrons in the DOM; `.first()` alone may
    // resolve to one of those and report "hidden".
    await expect(
      this.page
        .locator('.slds-path__item')
        .filter({ hasText: 'In Force' })
        .filter({ visible: true })
        .first()
    ).toBeVisible({ timeout: 90_000 });
  }
}
