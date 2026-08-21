import { test, expect, Page } from '@playwright/test';
import { jwtLogin, sfQueryOne } from '../src/auth/sfJwt';
import { waitForSpinners, closeAllWorkspaceTabs, openRecordTab } from '../src/utils/sf';
import { AccountsPage } from '../src/pages/AccountsPage';
import { SubmissionWizardPage } from '../src/pages/SubmissionWizardPage';
import { SubmissionPage } from '../src/pages/SubmissionPage';
import { QuoteWizardPage } from '../src/pages/QuoteWizardPage';
import { QuotePage } from '../src/pages/QuotePage';
import { OmniScriptFormPage } from '../src/pages/OmniScriptFormPage';
import { PremiumPage } from '../src/pages/PremiumPage';
import {
  CARA_ACCOUNT, CARA_CLIENT_INFO, CARA_RISK_INFO, CARA_INSURABLE,
  CARA_PRODUCT_FORM, CARA_COVERAGES, CARA_PREMIUMS, CARA_MINIMUM_DEPOSIT,
  CARA_BINDERS_ALL, CARA_USERS,
} from '../src/data/caraData';

/**
 * THROWAWAY live exploration of the CARA (Contractors All Risks - Annual) NB
 * flow on newprodqa2 — validates cara_catalog.md §2 and resolves ambiguities
 * A1–A13 up to (and including) binder selection + RBS structure capture.
 * STOPS after the Selected Binders / RBS dump: no fees, no ERN, no issue/bond.
 *
 * Run:  EXPLORE=cara npx playwright test tests/explore-cara.spec.ts
 * Resume flags:
 *   CARA_QUOTE_ID=0Q0…    resume on an existing quote (skips submission+quote)
 *   CARA_SKIP_FORM=1      skip the 4-step product questionnaire
 *   CARA_SKIP_COVERAGES=1 skip adding coverages (CARA_COV_START=n to start mid-list)
 *   CARA_SKIP_PREMIUMS=1  skip Enter Premiums
 *   CARA_SKIP_BINDERS=1   skip binder selection (dump-only pass)
 *   CARA_SKIP_RBS=1       skip the Selected Binders / RBS structure dump
 */

/** Dump all visible labels + radio-group texts inside the open dialog. */
async function dumpModalState(page: Page, tag: string): Promise<void> {
  try {
    const dialog = page.getByRole('dialog').filter({ visible: true }).first();
    const scope = (await dialog.isVisible().catch(() => false)) ? dialog : page;
    const labels = await scope.locator('label').filter({ visible: true }).allInnerTexts();
    console.log(`[dump:${tag}] ${labels.length} visible labels:`);
    for (const l of labels) {
      const t = l.replace(/\s+/g, ' ').trim();
      if (t) console.log(`  label: ${t}`);
    }
  } catch (e) {
    console.log(`[dump:${tag}] failed: ${(e as Error).message}`);
  }
}

/** innerText of a locator, whitespace-collapsed. */
async function rowTextOf(loc: ReturnType<Page['locator']>): Promise<string> {
  return ((await loc.innerText().catch(() => '')) || '').replace(/\s+/g, ' ').trim();
}

/** Visible dropdown option texts right now. */
async function visibleOptions(page: Page): Promise<string[]> {
  const texts = await page
    .locator('[role="option"]:not(.slds-path__link), lightning-base-combobox-item')
    .filter({ visible: true })
    .allInnerTexts()
    .catch(() => [] as string[]);
  return texts.map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean);
}

/**
 * Wizard-style lookup/picklist pick WITH option capture: click the labelled
 * input, dump every visible option, click `preferred` if offered; else try
 * typing to filter; else fall back to `fallback` (loud deviation log).
 */
async function pickOptionCapture(
  page: Page,
  label: string,
  preferred: string,
  fallback?: string
): Promise<string> {
  const input = page.getByLabel(label, { exact: false }).first();
  await input.click();
  await page.waitForTimeout(1500);
  let opts = await visibleOptions(page);
  console.log(`[explore] "${label}" options: ${JSON.stringify(opts)}`);
  if (!opts.includes(preferred)) {
    // Lookups may need typing to filter/fetch more options.
    await input.fill(preferred).catch(() => {});
    await page.waitForTimeout(2000);
    opts = await visibleOptions(page);
    console.log(
      `[explore] "${label}" options after typing "${preferred}": ${JSON.stringify(opts)}`
    );
  }
  const target = opts.includes(preferred) ? preferred : fallback;
  if (!target || !opts.includes(target)) {
    throw new Error(
      `[explore] "${label}": neither "${preferred}" nor fallback "${fallback}" offered — options: ${JSON.stringify(opts)}`
    );
  }
  if (target !== preferred) {
    console.log(`[explore] DEVIATION: "${label}" = "${target}" (doc wanted "${preferred}")`);
  }
  await page
    .locator('[role="option"]:not(.slds-path__link), lightning-base-combobox-item')
    .filter({ visible: true })
    .filter({
      hasText: new RegExp(`^\\s*${target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`),
    })
    .first()
    .click();
  await waitForSpinners(page);
  return target;
}

/** Fill a labelled text field (restricted to input/textarea, like the wizard). */
async function fillWizardText(page: Page, label: string, value: string): Promise<void> {
  const input = page
    .getByLabel(label, { exact: false })
    .and(page.locator('input, textarea'))
    .first();
  await input.click();
  await input.fill(value);
}

test.describe('CARA exploration suite', () => {
  test.skip(process.env.EXPLORE !== 'cara');

  test('explore CARA NB flow (steps 1-8: submission → binders → RBS capture)', async ({ page }) => {
  test.setTimeout(50 * 60 * 1000);

  const accounts = new AccountsPage(page);
  const wizard = new SubmissionWizardPage(page);
  const submission = new SubmissionPage(page);
  const quoteWizard = new QuoteWizardPage(page);
  const quote = new QuotePage(page);
  const forms = new OmniScriptFormPage(page);
  const premiums = new PremiumPage(page);

  const user = CARA_USERS.uw5; // UW5 deliberately (UW3 in use by a parallel agent)

  await test.step('1. JWT login as UW5', async () => {
    await jwtLogin(page, user);
  });

  let quoteId = process.env.CARA_QUOTE_ID ?? '';

  if (quoteId) {
    await test.step(`Resume on existing quote ${quoteId}`, async () => {
      await page.goto(`/lightning/r/Quote/${quoteId}/view`);
      await waitForSpinners(page);
      await closeAllWorkspaceTabs(page);
      await page.goto(`/lightning/r/Quote/${quoteId}/view`);
      await waitForSpinners(page);
      await expect(
        page.getByRole('tab', { name: 'Coverages', exact: true }).first()
      ).toBeVisible({ timeout: 90_000 });
    });
  } else if (process.env.CARA_SUBMISSION_ID) {
    await test.step(`Resume on existing submission ${process.env.CARA_SUBMISSION_ID}`, async () => {
      await page.goto(`/lightning/r/Opportunity/${process.env.CARA_SUBMISSION_ID}/view`);
      await waitForSpinners(page);
      await closeAllWorkspaceTabs(page);
      await page.goto(`/lightning/r/Opportunity/${process.env.CARA_SUBMISSION_ID}/view`);
      await waitForSpinners(page);
      await expect(
        page.getByRole('button', { name: 'Create New Quote' }).first()
      ).toBeVisible({ timeout: 90_000 });
    });

    await test.step('3. Create quote (from resumed submission)', async () => {
      await submission.createNewQuote();
      await quoteWizard.completeWizard();
      const m = page.url().match(/\/Quote\/(0Q0[A-Za-z0-9]+)\//);
      if (!m?.[1]) throw new Error(`Could not parse quote id from URL: ${page.url()}`);
      quoteId = m[1];
      console.log(`[explore] CARA_QUOTE_ID=${quoteId}  (use for resume)`);
    });
  } else {
    await test.step('2a. Open HOWDEN account and start submission', async () => {
      const acc = await sfQueryOne(
        user,
        `SELECT Id FROM Account WHERE Name = '${CARA_ACCOUNT.name}' LIMIT 1`
      );
      if (!acc?.Id) throw new Error(`Account not found: ${CARA_ACCOUNT.name}`);
      await page.goto(`/lightning/r/Account/${acc.Id}/view`);
      await waitForSpinners(page);
      await accounts.startNewOlivaSubmission();
    });

    await test.step('2b. Submission wizard (doc-exact insured, Retail, empty insurer ref)', async () => {
      await wizard.fillSubmissionSource(CARA_ACCOUNT.intermediaryContact);

      // Client Information — manual fill (instead of wizard.fillClientInformation)
      // so every lookup's OPTION LIST is captured, esp. Client Classification
      // Type where the doc wants "Retail" (A2) — run 1 proved "Retail" is not
      // offered as a plain visible option.
      const d = CARA_CLIENT_INFO;
      // Insured typeahead: type, wait for remote fetch, capture + click option.
      const insured = page.getByLabel('Insured Name', { exact: false }).first();
      await insured.click();
      await insured.fill(d.insuredName);
      await page.waitForTimeout(2500);
      const insOpts = await visibleOptions(page);
      console.log(`[explore] Insured Name options: ${JSON.stringify(insOpts.slice(0, 10))}`);
      await page
        .locator('[role="option"]:not(.slds-path__link), lightning-base-combobox-item')
        .or(page.getByText(d.insuredName, { exact: true }))
        .filter({ visible: true })
        .filter({ hasText: 'Moorgarth' })
        .first()
        .click();
      await waitForSpinners(page);

      await pickOptionCapture(page, 'Industry Sector', d.industrySector);
      await pickOptionCapture(page, 'Activity Code', d.activityCode);
      await pickOptionCapture(page, 'Product', d.product);
      await fillWizardText(page, 'Business Description', d.businessDescription);
      await pickOptionCapture(page, 'Year Business Established', d.yearBusinessEstablished);
      await fillWizardText(page, 'Employee Size', d.employeeSize);
      await fillWizardText(page, 'Client Turnover', d.clientTurnover);
      // Client Classification Type — LIVE FINDING (run 2): with the existing
      // Moorgarth client it PREFILLS to "Retail" (account-sourced), but the UI
      // option list is only [--, Consumer, Micro, Small, Commercial,
      // Reinsurance] — "Retail" is NOT manually selectable. Leave the prefill
      // alone (the stored Opportunity field ends up "Retail", doc-exact).
      const classInput = page
        .getByLabel('Client Classification Type', { exact: false })
        .and(page.locator('input'))
        .first();
      const classVal = (await classInput.inputValue().catch(() => '')).trim();
      console.log(`[explore] Client Classification Type prefilled value: "${classVal}"`);
      if (!classVal) {
        await pickOptionCapture(
          page,
          'Client Classification Type',
          d.clientClassificationType,
          'Consumer'
        );
      } else {
        // Close any dropdown a stray click may have opened.
        await page.keyboard.press('Escape').catch(() => {});
      }
      await page.getByRole('button', { name: 'Next', exact: true }).first().click();
      await waitForSpinners(page);

      await wizard.fillRiskInformation({ ...CARA_RISK_INFO, quoteRequiredOffsetDays: 0 } as never);
      await wizard.submitClaimsHistory();
      // LIVE FINDING (run 2): SubmissionPage.riskId() (first DOU/... text on
      // the page) is UNSAFE for this insured — Moorgarth has many prior
      // submissions and a Potential-Matches/other-tab Risk ID (a RENO one) can
      // match first. Read the authoritative RiskId__c via REST instead.
      const oppMatch = page.url().match(/\/Opportunity\/(006[A-Za-z0-9]+)\//);
      if (oppMatch?.[1]) {
        const rec = await sfQueryOne(
          user,
          `SELECT RiskId__c, Client_Classification_Type__c FROM Opportunity WHERE Id = '${oppMatch[1]}'`
        );
        console.log(
          `[explore] SUBMISSION ${oppMatch[1]} RiskId__c=${rec?.RiskId__c} ` +
            `Client_Classification_Type__c=${rec?.Client_Classification_Type__c}`
        );
        expect(String(rec?.RiskId__c)).toMatch(/DOU\/\d+\/CARA\/\d+/);
      } else {
        const riskId = await submission.riskId();
        console.log(`[explore] SUBMISSION Risk ID (page text, may be stale): ${riskId}`);
      }
    });

    await test.step('3. Create quote', async () => {
      await submission.createNewQuote();
      await quoteWizard.completeWizard();
      const m = page.url().match(/\/Quote\/(0Q0[A-Za-z0-9]+)\//);
      if (!m?.[1]) throw new Error(`Could not parse quote id from URL: ${page.url()}`);
      quoteId = m[1];
      console.log(`[explore] CARA_QUOTE_ID=${quoteId}  (use for resume)`);
    });
  }

  if (process.env.CARA_SKIP_FORM !== '1') {
    await test.step('4. Product Questions (4 steps)', async () => {
      await quote.editRenovationProductQuestions('Contractors All Risks - Annual');
      try {
        await forms.fill(CARA_PRODUCT_FORM);
      } catch (e) {
        await dumpModalState(page, 'product-form-failure');
        throw e;
      }
    });
  }

  if (process.env.CARA_SKIP_COVERAGES !== '1') {
    const start = parseInt(process.env.CARA_COV_START ?? '0', 10);
    for (let i = start; i < CARA_COVERAGES.length; i++) {
      const cov = CARA_COVERAGES[i];
      await test.step(`5.${i + 1} Add coverage: ${cov.addRowName}`, async () => {
        await quote.addRenoCoverage(CARA_INSURABLE.insurableName, cov.addRowName);
        await dumpModalState(page, `open:${cov.addRowName}`);
        try {
          await forms.fill(cov.form);
        } catch (e) {
          await dumpModalState(page, `failure:${cov.addRowName}`);
          throw e;
        }
      });
    }
  }

  if (process.env.CARA_SKIP_PREMIUMS !== '1') {
    await test.step('6. Enter premiums (Minimum & Deposit = Yes, 6 rows)', async () => {
      await quote.clickEnterPremiums();
      await premiums.answerMinimumDeposit(CARA_MINIMUM_DEPOSIT);
      await premiums.fillAndSubmit(CARA_PREMIUMS);
    });
  }

  // -------------------------------------------------------------------------
  // 7. Binder selection — CUSTOM (per-row DIFFERENT binder names; the shared
  // BindersPage only supports one binder for all rows). Captures every
  // offered binder per coverage row.
  // -------------------------------------------------------------------------
  if (process.env.CARA_SKIP_BINDERS !== '1') {
    await test.step('7. Select binders per coverage row (capture all offerings)', async () => {
      await openRecordTab(page, 'Select Binders');

      const buttons = () =>
        page
          .getByRole('button', { name: 'Select Binders', exact: true })
          .filter({ visible: true });
      await expect(buttons().first()).toBeVisible({ timeout: 60_000 });
      const total = await buttons().count();
      console.log(`[explore] risk grid: ${total} coverage row(s) need binders`);

      // Dump the pre-selection risk grid rows (RBC ids, limits, premiums).
      const gridRows = page
        .locator('tr, [role="row"]')
        .filter({ has: page.getByRole('button', { name: 'Select Binders', exact: true }) })
        .filter({ visible: true });
      const gridCount = await gridRows.count();
      const rowCoverages: string[] = [];
      for (let i = 0; i < gridCount; i++) {
        const t = await rowTextOf(gridRows.nth(i));
        console.log(`[explore] risk row ${i}: ${t}`);
        if (i < total) rowCoverages.push(t);
      }

      for (let i = 0; i < total; i++) {
        await buttons().nth(i).scrollIntoViewIfNeeded().catch(() => {});
        await buttons().nth(i).click();
        await waitForSpinners(page);
        await expect(page.getByText('Available Binders').first()).toBeVisible({
          timeout: 60_000,
        });

        // Identify which coverage this binder view is for: prefer the risk-grid
        // row text captured above; verify against the view's own text.
        const viewText = ((await page
          .locator('.oneWorkspaceTabWrapper .active, body')
          .first()
          .innerText()
          .catch(() => '')) || '').replace(/\s+/g, ' ');
        const rowHint = rowCoverages[i] ?? '';
        const choice =
          CARA_BINDERS_ALL.find((b) => rowHint.includes(b.coverage)) ??
          CARA_BINDERS_ALL.find((b) => viewText.includes(b.coverage));
        console.log(
          `[explore] row ${i} → coverage guess "${choice?.coverage ?? 'UNKNOWN'}"` +
            ` (row: "${rowHint.slice(0, 120)}")`
        );

        // Dump EVERY available binder row (name + section + caps). Wait for
        // the table to actually paint first (run 4: row 0 dumped too early).
        await page
          .getByRole('button', { name: /^(Add|Remove)$/, exact: false })
          .filter({ visible: true })
          .first()
          .waitFor({ state: 'visible', timeout: 20_000 })
          .catch(() => {});
        const availRows = page
          .locator('tr, [role="row"]')
          .filter({ has: page.getByRole('button', { name: 'Add', exact: true }) })
          .filter({ visible: true });
        const nAvail = await availRows.count();
        const seen = new Set<string>();
        for (let j = 0; j < nAvail; j++) {
          const t = await rowTextOf(availRows.nth(j));
          if (t && !seen.has(t)) {
            seen.add(t);
            console.log(`[explore]   available binder: ${t}`);
          }
        }

        // ---- RECONCILE the row (idempotent — safe on resumed/polluted quotes).
        const selRows = () =>
          page
            .locator('tr, [role="row"]')
            .filter({ has: page.getByRole('button', { name: 'Remove', exact: true }) })
            .filter({ visible: true });
        const dumpToasts = async (tag: string) => {
          const toasts = await page
            .locator('.slds-notify, [data-key], .toastMessage')
            .filter({ visible: true })
            .allInnerTexts()
            .catch(() => [] as string[]);
          const clean = (toasts || [])
            .map((t) => (t ?? '').replace(/\s+/g, ' ').trim())
            .filter(Boolean);
          if (clean.length) console.log(`[explore]   toasts(${tag}): ${JSON.stringify(clean)}`);
          return clean.join(' | ');
        };

        // (1) REMOVE any selected binder that is NOT our intended one (run 5
        // accidentally double-added Accelerant Oliva Construction 2024).
        for (let guard = 0; guard < 4; guard++) {
          let wrongRow: import('@playwright/test').Locator | undefined;
          const n = await selRows().count();
          for (let k = 0; k < n; k++) {
            const t = await rowTextOf(selRows().nth(k));
            if (choice && t && !t.includes(choice.name)) {
              wrongRow = selRows().nth(k);
              console.log(`[explore]   removing WRONG selected binder: ${t}`);
              break;
            }
          }
          if (!wrongRow) break;
          await wrongRow.getByRole('button', { name: 'Remove', exact: true }).first().click();
          await waitForSpinners(page);
          // Success/confirm dialog → OK/Close.
          const ok = page
            .getByRole('dialog')
            .filter({ visible: true })
            .last()
            .getByRole('button', { name: /^(OK|Close|Done|Yes)$/i })
            .filter({ visible: true })
            .first();
          if (await ok.isVisible({ timeout: 5000 }).catch(() => false)) {
            await ok.click().catch(() => {});
            await waitForSpinners(page);
          }
          await dumpToasts('after-remove');
        }

        // (2) ADD our binder if it is not already selected.
        const ourSelected = () => selRows().filter({ hasText: choice?.name ?? '§none§' });
        let addClicked = false;
        if (!(await ourSelected().first().isVisible().catch(() => false))) {
          const namedAdd = page
            .locator('tr, [role="row"]')
            .filter({ hasText: choice?.name ?? '§none§' })
            .filter({ has: page.getByRole('button', { name: 'Add', exact: true }) })
            .first()
            .getByRole('button', { name: 'Add', exact: true })
            .first();
          try {
            await namedAdd.waitFor({ state: 'visible', timeout: 15_000 });
            console.log(`[explore]   adding binder BY NAME: ${choice?.name}`);
            await namedAdd.click();
            addClicked = true;
            await waitForSpinners(page);
            await dumpToasts('after-add');
          } catch {
            console.log(
              `[explore]   binder "${choice?.name}" NOT offered and not selected — skipping row`
            );
          }
        } else {
          console.log(`[explore]   binder "${choice?.name}" already selected`);
        }

        // (3) Ensure N/R to Binder on OUR selected row, then Save.
        const selectedRow = ourSelected().last();
        if (addClicked) {
          await expect(selectedRow).toBeVisible({ timeout: 60_000 });
        }
        if (await selectedRow.isVisible({ timeout: 12_000 }).catch(() => false)) {
          console.log(`[explore]   selected row: ${await rowTextOf(selectedRow)}`);
          const nr = choice?.nrToBinder ?? 'New Business';
          if (
            !(await selectedRow.getByText(nr, { exact: false }).first().isVisible().catch(() => false))
          ) {
            const pencil = selectedRow.locator('button[title*="Edit"]').last();
            await expect(pencil).toBeVisible({ timeout: 15_000 });
            await pencil.scrollIntoViewIfNeeded().catch(() => {});
            await pencil.click();
            const cellTrigger = page.getByText('Select N/R', { exact: false }).first();
            await expect(cellTrigger).toBeVisible({ timeout: 15_000 });
            await cellTrigger.click();
            await page
              .getByRole('option', { name: nr })
              .or(
                page
                  .locator('[role="listbox"] [role="option"], lightning-base-combobox-item')
                  .filter({ hasText: nr })
              )
              .first()
              .click();
            // Footer Save under the Selected Binders table — the VISIBLE one
            // (a hidden Save from the residual "Edit Premiums" subtab exists
            // in the DOM). Run 4 saw a Save click not commit (footer + yellow
            // cells persisted), so retry until the toast fires or the footer
            // disappears — and log EVERY toast (success or error).
            const toast = page
              .locator('.slds-notify, [data-key], .toastMessage')
              .filter({ hasText: 'Selected Binders saved successfully' })
              .first();
            const save = page
              .getByRole('button', { name: 'Save', exact: true })
              .filter({ visible: true })
              .last();
            let saved = false;
            for (let attempt = 0; attempt < 3 && !saved; attempt++) {
              await save.scrollIntoViewIfNeeded().catch(() => {});
              await save.click().catch(() => {});
              saved = await toast.isVisible({ timeout: 20_000 }).catch(() => false);
              await dumpToasts(`after-save-${attempt}`);
              if (!saved) {
                // Toast may have been missed — treat a vanished footer Save as committed.
                saved = !(await save.isVisible().catch(() => false));
                if (saved) console.log('[explore]   footer gone without toast — treating as saved');
              }
            }
            if (!saved) {
              throw new Error(`[explore] binder N/R save did not commit for row ${i}`);
            }
            await waitForSpinners(page);
          }
        } else {
          console.log('[explore]   NO bindable binder for this row — skipped');
        }

        await page.getByRole('button', { name: 'Back', exact: true }).first().click();
        await waitForSpinners(page);
      }

      // REST truth-check: dump every RBS row now on the quote.
      const rbsRecs = await (async () => {
        const out: string[] = [];
        try {
          // sfQueryOne returns one record; use a small inline paged fetch via
          // repeated queries ordered by Name with Name > last.
          let lastName = '';
          for (let k = 0; k < 15; k++) {
            const rec = await sfQueryOne(
              user,
              `SELECT Name, Binder_Name__c, Binder_Section__r.Name, N_R_to_Binder__c, ` +
                `Binder_Allocation_Percentage__c FROM Risk_Binder_Section__c ` +
                `WHERE Quote__c = '${quoteId}' AND Name > '${lastName}' ORDER BY Name LIMIT 1`
            );
            if (!rec) break;
            lastName = String(rec.Name);
            out.push(
              `${rec.Name} | ${rec.Binder_Name__c} | ` +
                `${(rec as never as { Binder_Section__r: { Name: string } }).Binder_Section__r?.Name} | ` +
                `N/R=${rec.N_R_to_Binder__c} | alloc=${rec.Binder_Allocation_Percentage__c}`
            );
          }
        } catch (e) {
          out.push(`REST RBS dump failed: ${(e as Error).message}`);
        }
        return out;
      })();
      console.log(`[explore] REST RBS rows (${rbsRecs.length}):`);
      for (const r of rbsRecs) console.log(`[explore]   RBS: ${r}`);

      // Reload → flags refresh; verify via the "Remove All Selected Binders"
      // enablement + grid dump.
      await page.reload();
      await waitForSpinners(page);
      await openRecordTab(page, 'Select Binders');
      await expect(buttons().first()).toBeVisible({ timeout: 60_000 });
      const after = page
        .locator('tr, [role="row"]')
        .filter({ has: page.getByRole('button', { name: 'Select Binders', exact: true }) })
        .filter({ visible: true });
      const nAfter = await after.count();
      for (let i = 0; i < nAfter; i++) {
        console.log(`[explore] post-binder row ${i}: ${await rowTextOf(after.nth(i))}`);
      }
      // Green-flag proxy: count green/red status icons if identifiable.
      const flags = await page
        .locator('img[alt], lightning-icon, [title]')
        .filter({ visible: true })
        .evaluateAll((els) =>
          els
            .map((e) => (e.getAttribute('alt') || e.getAttribute('title') || '').toLowerCase())
            .filter((t) => t.includes('flag') || t.includes('green') || t.includes('red'))
        )
        .catch(() => [] as string[]);
      console.log(`[explore] status flag hints after reload: ${JSON.stringify(flags)}`);
      const removeAll = page
        .getByRole('button', { name: 'Remove All Selected Binders' })
        .first();
      if (await removeAll.isVisible().catch(() => false)) {
        console.log(
          `[explore] "Remove All Selected Binders" enabled=${await removeAll.isEnabled()}`
        );
      }
    });
  }

  // -------------------------------------------------------------------------
  // 8. Selected Binders tab — list ALL RBS rows; open ONE and capture the
  // referral/carrier/approval structure. NO approvals performed.
  // -------------------------------------------------------------------------
  if (process.env.CARA_SKIP_RBS !== '1') {
    await test.step('8. Selected Binders: RBS list + one-RBS structure capture', async () => {
      await openRecordTab(page, 'Selected Binders');
      await expect(page.getByText('Risk Binder Sections').first()).toBeVisible({
        timeout: 60_000,
      });
      await waitForSpinners(page);

      const rbsLinks = page.getByRole('link', { name: /^RBS-/ }).filter({ visible: true });
      await expect(rbsLinks.first()).toBeVisible({ timeout: 60_000 });
      const rbsRows = page
        .locator('tr, [role="row"]')
        .filter({ has: page.getByRole('link', { name: /^RBS-/ }) })
        .filter({ visible: true });
      const nRbs = await rbsRows.count();
      console.log(`[explore] Risk Binder Sections: ${await rbsLinks.count()} link(s), ${nRbs} row(s)`);
      const seen = new Set<string>();
      for (let i = 0; i < nRbs; i++) {
        const t = await rowTextOf(rbsRows.nth(i));
        if (t && !seen.has(t)) {
          seen.add(t);
          console.log(`[explore] RBS row: ${t}`);
        }
      }

      // Open the FIRST RBS for structure capture only.
      await rbsLinks.first().click();
      await waitForSpinners(page);
      await expect(
        page.getByText('Risk Binder Section', { exact: false }).first()
      ).toBeVisible({ timeout: 60_000 });

      // (a) Referral Reasons tab structure.
      const refTab = page
        .getByRole('tab', { name: 'Referral Reasons', exact: true })
        .filter({ visible: true });
      if (await refTab.last().isVisible({ timeout: 20_000 }).catch(() => false)) {
        await refTab.last().click();
        await waitForSpinners(page);
        const confirmBox = page
          .getByRole('checkbox', { name: /Confirm No Manual Reasons/i })
          .first();
        if (await confirmBox.isVisible({ timeout: 15_000 }).catch(() => false)) {
          console.log(
            `[explore] "Confirm No Manual Reasons" present, checked=${await confirmBox
              .isChecked()
              .catch(() => 'unknown')}`
          );
        } else {
          console.log('[explore] "Confirm No Manual Reasons" checkbox NOT found');
        }
        const manualRows = await page
          .getByText(/RBS-\d+ - /)
          .filter({ visible: true })
          .allInnerTexts()
          .catch(() => []);
        console.log(`[explore] manual referral reason rows: ${JSON.stringify(manualRows)}`);
        const autoSection = page
          .locator('article, .slds-card, div')
          .filter({ hasText: 'Automatic Referral Reasons' })
          .last();
        console.log(
          `[explore] Automatic Referral Reasons section text: ${(
            await rowTextOf(autoSection)
          ).slice(0, 300)}`
        );
      }

      // (b) Carrier Selection Details card (carrier name!).
      const carrierCard = page
        .locator('article, .slds-card')
        .filter({ hasText: 'Carrier Selection Detail' })
        .last();
      await carrierCard.scrollIntoViewIfNeeded().catch(() => {});
      if (await carrierCard.isVisible({ timeout: 20_000 }).catch(() => false)) {
        console.log(`[explore] Carrier card: ${await rowTextOf(carrierCard)}`);
      } else {
        console.log('[explore] Carrier Selection Details card NOT visible on this layout');
      }

      // (c) Details tab → Approval Status editability (hover for pencil).
      const detTab = page
        .getByRole('tab', { name: 'Details', exact: true })
        .filter({ visible: true });
      await detTab.last().click();
      await waitForSpinners(page);
      const referralSection = page
        .getByRole('heading', { name: 'Referral Information' })
        .or(page.getByText('Referral Information', { exact: true }))
        .first();
      await referralSection.scrollIntoViewIfNeeded().catch(() => {});
      await page.mouse.wheel(0, 600);
      const statusItem = page
        .locator('records-record-layout-item, force-record-layout-item, .slds-form-element')
        .filter({ hasText: 'Approval Status' })
        .filter({ visible: true })
        .first();
      if (await statusItem.isVisible({ timeout: 20_000 }).catch(() => false)) {
        console.log(`[explore] Approval Status field: "${await rowTextOf(statusItem)}"`);
        await statusItem.hover().catch(() => {});
        const pencil = page
          .getByRole('button', { name: /Edit Approval Status/i })
          .or(statusItem.locator('button[title*="Edit"]'))
          .filter({ visible: true })
          .first();
        console.log(
          `[explore] Approval Status EDITABLE by UW5: ${await pencil
            .isVisible({ timeout: 8000 })
            .catch(() => false)}`
        );
      } else {
        console.log('[explore] Approval Status field NOT found on Details tab');
      }

      // Also capture Binder Section + carrier-ish fields from Details.
      for (const fld of ['Binder Section', 'GWP', 'Sum Insured/Limit Applied']) {
        const item = page
          .locator('records-record-layout-item, force-record-layout-item, .slds-form-element')
          .filter({ hasText: fld })
          .filter({ visible: true })
          .first();
        if (await item.isVisible().catch(() => false)) {
          console.log(`[explore] Details "${fld}": ${await rowTextOf(item)}`);
        }
      }

      console.log(`[explore] DONE — CARA_QUOTE_ID=${quoteId}`);
    });
  }
});
});
