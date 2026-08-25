import { test, expect, Page } from '@playwright/test';
import { jwtLogin, sfQueryOne } from '../../src/auth/sfJwt';
import { waitForSpinners, closeAllWorkspaceTabs, openRecordTab } from '../../src/utils/sf';
import { AccountsPage } from '../../src/pages/AccountsPage';
import { SubmissionWizardPage } from '../../src/pages/SubmissionWizardPage';
import { SubmissionPage } from '../../src/pages/SubmissionPage';
import { QuoteWizardPage } from '../../src/pages/QuoteWizardPage';
import { QuotePage } from '../../src/pages/QuotePage';
import { OmniScriptFormPage } from '../../src/pages/OmniScriptFormPage';
import { PremiumPage } from '../../src/pages/PremiumPage';
import { BindersPage } from '../../src/pages/BindersPage';
import {
  JCT_ACCOUNT, JCT_CLIENT_INFO, JCT_RISK_INFO, JCT_INSURABLE,
  JCT_PRODUCT_FORM, JCT_COVERAGES, JCT_PREMIUMS, JCT_MINIMUM_DEPOSIT,
  JCT_BINDER, JCT_USERS,
} from '../../src/data/jctData';

/**
 * THROWAWAY live-exploration spec for the JCT 6.5.1 Non Negligent Liability
 * NB flow on newprodqa2 (steps: submission â†’ quote â†’ product questions â†’
 * coverage â†’ premiums â†’ binders; STOPS after binders â€” the shared back-half
 * is already proven by sibling specs).
 *
 * Run:  EXPLORE=jct npx playwright test tests/explore-jct.spec.ts
 * Resume flags (iteration only):
 *   JCT_QUOTE_ID=<0Q0â€¦>  resume on an existing quote
 *   JCT_SKIP_PQ=1        skip product questions (already saved on the quote)
 *   JCT_SKIP_COV=1       skip coverage add
 *   JCT_SKIP_PREM=1      skip Enter Premiums
 *   JCT_SKIP_BINDERS=1   skip binder selection
 */

/** Dump every visible label / radio-group text / combobox option to console. */
async function dumpVisibleForm(page: Page, tag: string): Promise<void> {
  const labels = await page
    .locator('label')
    .filter({ visible: true })
    .allInnerTexts()
    .catch(() => [] as string[]);
  console.log(`[dump:${tag}] visible labels (${labels.length}):`);
  for (const l of labels) console.log(`  label> ${l.replace(/\s+/g, ' ').trim()}`);
  const options = await page
    .locator('[role="option"], lightning-base-combobox-item')
    .filter({ visible: true })
    .allInnerTexts()
    .catch(() => [] as string[]);
  if (options.length) {
    console.log(`[dump:${tag}] visible options:`);
    for (const o of options) console.log(`  option> ${o.replace(/\s+/g, ' ').trim()}`);
  }
}

/** Shadow-walking row dump â€” locator allInnerTexts returned empty on the
 *  binder grids (silently), so walk every open shadow root directly. */
async function dumpRowsDeep(page: Page, tag: string): Promise<void> {
  const rows = await page.evaluate(() => {
    const out: string[] = [];
    const seen = new Set<Element>();
    const visible = (el: Element) => {
      const r = (el as HTMLElement).getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    };
    const walk = (root: Document | ShadowRoot) => {
      root.querySelectorAll('tr, [role="row"]').forEach((el) => {
        if (!seen.has(el) && visible(el)) {
          seen.add(el);
          out.push((el.textContent || '').replace(/\s+/g, ' ').trim());
        }
      });
      root.querySelectorAll('*').forEach((e) => {
        if ((e as HTMLElement).shadowRoot) walk((e as HTMLElement).shadowRoot!);
      });
    };
    walk(document);
    return out;
  });
  console.log(`[deep:${tag}] ${rows.length} row(s):`);
  for (const r of rows) console.log(`  row> ${r}`);
}

/** Dump the options of the combobox whose label contains `label`. */
async function dumpPicklistOptions(page: Page, label: string): Promise<void> {
  const combo = page
    .locator('.slds-form-element, lightning-combobox, lightning-picklist')
    .filter({ hasText: label })
    .filter({ visible: true })
    .last()
    .locator('input, button[role="combobox"], [role="combobox"], select')
    .filter({ visible: true })
    .first();
  if (!(await combo.isVisible().catch(() => false))) {
    console.log(`[picklist:${label}] combo not visible`);
    return;
  }
  await combo.click().catch(() => {});
  await page.waitForTimeout(1000);
  const options = await page
    .locator('[role="option"]:not(.slds-path__link), lightning-base-combobox-item')
    .filter({ visible: true })
    .allInnerTexts()
    .catch(() => [] as string[]);
  console.log(`[picklist:${label}] options: ${JSON.stringify(options.map((o) => o.trim()))}`);
  await page.keyboard.press('Escape').catch(() => {});
}

test.describe('JCT exploration suite', () => {
  test.skip(process.env.EXPLORE !== 'jct');

  test('EXPLORE: JCT 6.5.1 NNL NB â€” submission â†’ binders (newprodqa2)', async ({ page }) => {
  test.setTimeout(45 * 60 * 1000);

  const accounts = new AccountsPage(page);
  const wizard = new SubmissionWizardPage(page);
  const submission = new SubmissionPage(page);
  const quoteWizard = new QuoteWizardPage(page);
  const quote = new QuotePage(page);
  const forms = new OmniScriptFormPage(page);
  const premiums = new PremiumPage(page);
  const binders = new BindersPage(page, JCT_BINDER);

  const loginUser = JCT_USERS.uw3; // deliberately UW3 (uw5 in use elsewhere)

  await test.step('Login as Construction UW3 (JWT)', async () => {
    await jwtLogin(page, loginUser);
  });

  const resumeQuoteId = process.env.JCT_QUOTE_ID;
  let jctQuoteId = resumeQuoteId ?? '';

  if (resumeQuoteId) {
    await test.step(`Resume on quote ${resumeQuoteId}`, async () => {
      await page.goto(`/lightning/r/Quote/${resumeQuoteId}/view`);
      await waitForSpinners(page);
      await closeAllWorkspaceTabs(page);
      await page.goto(`/lightning/r/Quote/${resumeQuoteId}/view`);
      await waitForSpinners(page);
      await expect(
        page.getByRole('tab', { name: 'Coverages', exact: true }).first()
      ).toBeVisible({ timeout: 90_000 });
    });
  } else {

  await test.step('Open HOWDEN account (SOQL) and start submission', async () => {
    const acc = await sfQueryOne(
      loginUser,
      `SELECT Id FROM Account WHERE Name = '${JCT_ACCOUNT.name}' LIMIT 1`
    );
    if (!acc?.Id) throw new Error(`Account not found: ${JCT_ACCOUNT.name}`);
    await page.goto(`/lightning/r/Account/${acc.Id}/view`);
    await waitForSpinners(page);
    await accounts.startNewOlivaSubmission();
  });

  await test.step('Submission wizard step 1 â€” Submission Source', async () => {
    await wizard.fillSubmissionSource(JCT_ACCOUNT.intermediaryContact);
  });

  await test.step('Probe Underwriting Division state (client info step)', async () => {
    // AMBIGUITY #3: is Underwriting Division present/editable, and is
    // "Property" auto or manual? Probe BEFORE the standard fill (which never
    // touches it) â€” final confirmation comes from the quote Details tab later.
    const uwDiv = page
      .getByLabel('Underwriting Division', { exact: false })
      .and(page.locator('input, textarea'))
      .filter({ visible: true })
      .first();
    const present = await uwDiv.isVisible({ timeout: 5000 }).catch(() => false);
    console.log(`[explore] Underwriting Division input present: ${present}`);
    if (present) {
      console.log(`[explore]   value="${await uwDiv.inputValue().catch(() => '?')}"`);
      console.log(`[explore]   readonly=${await uwDiv.getAttribute('readonly').catch(() => null)}`);
      console.log(`[explore]   disabled=${await uwDiv.getAttribute('disabled').catch(() => null)}`);
    }
  });

  await test.step('Submission wizard steps 2-4 (client / risk / claims)', async () => {
    try {
      await wizard.fillClientInformation(JCT_CLIENT_INFO as never);
    } catch (err) {
      console.log(`[explore] client info FAILED: ${(err as Error).message}`);
      await dumpVisibleForm(page, 'client-info');
      throw err;
    }
    try {
      await wizard.fillRiskInformation({ ...JCT_RISK_INFO, quoteRequiredOffsetDays: 0 } as never);
    } catch (err) {
      console.log(`[explore] risk info FAILED: ${(err as Error).message}`);
      await dumpVisibleForm(page, 'risk-info');
      throw err;
    }
    await wizard.submitClaimsHistory();
    const riskId = await submission.riskId();
    console.log(`[explore] SUBMISSION RISK ID: ${riskId}`);
    console.log(`[explore] submission url: ${page.url()}`);
    expect(riskId).toMatch(/DOU\/\d+\/JCTL\/\d+/);
  });

  await test.step('Create quote (capture middle wizard step)', async () => {
    await submission.createNewQuote();
    // Capture what the wizard steps actually are before driving them.
    const stepTexts = await page
      .locator('.slds-progress__item, [class*="omniscript"] li')
      .filter({ visible: true })
      .allInnerTexts()
      .catch(() => [] as string[]);
    console.log(`[explore] quote wizard rail: ${JSON.stringify(stepTexts.map((s) => s.trim()))}`);
    await quoteWizard.completeWizard();
    const m = page.url().match(/\/Quote\/(0Q0[A-Za-z0-9]+)\//);
    if (!m?.[1]) throw new Error(`Could not parse quote id from URL: ${page.url()}`);
    jctQuoteId = m[1];
    console.log(`[explore] JCT_QUOTE_ID=${jctQuoteId}`);
  });

  } // end non-resume

  if (process.env.JCT_SKIP_PQ !== '1') {
    await test.step('Product Questions â€” Oliva Standard Questions (1 step)', async () => {
      await quote.editRenovationProductQuestions('JCT 6.5.1 Non Negligent Liability');
      await dumpVisibleForm(page, 'product-questions');
      await dumpPicklistOptions(page, 'Current Insurer/MGA');
      try {
        await forms.fill(JCT_PRODUCT_FORM);
      } catch (err) {
        console.log(`[explore] product form FAILED: ${(err as Error).message}`);
        await dumpVisibleForm(page, 'product-questions-fail');
        throw err;
      }
    });
  }

  if (process.env.JCT_SKIP_COV !== '1') {
    await test.step('Add JCT coverage under the risk-location card', async () => {
      // The Risk Locations card re-renders after the product-questions modal
      // closes; wait for its "Show Coverages" toggle before driving the page
      // object (run 1 raced this and found 0 toggles page-wide).
      await expect(
        page.getByText('Show Coverages', { exact: true }).filter({ visible: true }).first()
      ).toBeVisible({ timeout: 60_000 });
      for (const cov of JCT_COVERAGES) {
        await quote.addRenoCoverage(JCT_INSURABLE.insurableName, cov.addRowName);
        await dumpVisibleForm(page, 'coverage-page1');
        await dumpPicklistOptions(page, 'Type of contract');
        try {
          await forms.fill(cov.form);
        } catch (err) {
          console.log(`[explore] coverage form FAILED: ${(err as Error).message}`);
          await dumpVisibleForm(page, 'coverage-fail');
          throw err;
        }
      }
    });
  }

  if (process.env.JCT_SKIP_PREM !== '1') {
    await test.step('Enter Premiums (Minimum & Deposit = Yes)', async () => {
      await quote.clickEnterPremiums();
      await premiums.answerMinimumDeposit(JCT_MINIMUM_DEPOSIT);
      // Capture whether Insurable Name renders (catalog: SHOWN on JCT).
      const insurables = page.getByLabel('Insurable Name', { exact: true }).filter({ visible: true });
      const n = await insurables.count();
      for (let i = 0; i < n; i++) {
        console.log(`[explore] premium section ${i + 1} Insurable Name="${await insurables.nth(i).inputValue()}"`);
      }
      await premiums.fillAndSubmit(JCT_PREMIUMS);
    });
  }

  if (process.env.JCT_SKIP_BINDERS !== '1') {
    await test.step('Capture ALL available binder rows (read-only pass)', async () => {
      await openRecordTab(page, 'Select Binders');
      const rowBtn = page
        .getByRole('button', { name: 'Select Binders', exact: true })
        .filter({ visible: true })
        .first();
      await expect(rowBtn).toBeVisible({ timeout: 60_000 });
      // Dump the risk grid rows first â€” wait for the RBC row text to paint
      // (run 2 raced this: rows render several seconds after the button).
      await expect(
        page.getByText(/RBC-\d+/).first()
      ).toBeVisible({ timeout: 60_000 });
      const riskRows = await page
        .locator('tr, [role="row"]')
        .filter({ visible: true })
        .allInnerTexts()
        .catch(() => [] as string[]);
      console.log('[explore] risk grid rows:');
      for (const r of riskRows) console.log(`  risk> ${r.replace(/\s+/g, ' | ').trim()}`);
      await dumpRowsDeep(page, 'risk-grid');
      await rowBtn.click();
      await waitForSpinners(page);
      await expect(page.getByText('Available Binders').first()).toBeVisible({ timeout: 60_000 });
      // Wait for an actual binder row (Add button) before dumping.
      await expect(
        page.getByRole('button', { name: 'Add', exact: true }).first()
      ).toBeVisible({ timeout: 60_000 });
      const binderRows = await page
        .locator('tr, [role="row"]')
        .filter({ visible: true })
        .allInnerTexts()
        .catch(() => [] as string[]);
      console.log('[explore] AVAILABLE BINDERS view rows:');
      for (const r of binderRows) console.log(`  binder> ${r.replace(/\s+/g, ' | ').trim()}`);
      await dumpRowsDeep(page, 'binder-view');
      await page.getByRole('button', { name: 'Back', exact: true }).first().click();
      await waitForSpinners(page);
    });

    if (process.env.JCT_CAPTURE_ONLY !== '1') {
    await test.step('Select binder "Accelerant Oliva Construction 2024" by name', async () => {
      await binders.selectAllBinders();
    });

    await test.step('Verify green flag after reload', async () => {
      // selectAllBinders already reloads; assert the saved binder shows green
      // (flag img alt/text varies â€” log the row state instead of hard-assert,
      // mirroring the proven sibling behavior; but DO verify the selected
      // binder persisted by re-opening the binder view).
      const rowBtn = page
        .getByRole('button', { name: 'Select Binders', exact: true })
        .filter({ visible: true })
        .first();
      await expect(rowBtn).toBeVisible({ timeout: 60_000 });
      await rowBtn.click();
      await waitForSpinners(page);
      await expect(page.getByText('Selected Binders').first()).toBeVisible({ timeout: 60_000 });
      const selected = page
        .locator('tr, [role="row"]')
        .filter({ hasText: JCT_BINDER.name })
        .filter({ has: page.getByRole('button', { name: 'Remove', exact: true }) })
        .first();
      await expect(selected).toBeVisible({ timeout: 30_000 });
      console.log(`[explore] selected binder row: ${(await selected.innerText()).replace(/\s+/g, ' | ')}`);
      await page.getByRole('button', { name: 'Back', exact: true }).first().click().catch(() => {});
    });
    } // end !JCT_CAPTURE_ONLY
  }

  await test.step('Read Underwriting Division (SOQL + Details tab)', async () => {
    // REST readback â€” authoritative confirmation of auto-derived fields.
    const rec = await sfQueryOne(
      loginUser,
      `SELECT FIELDS(ALL) FROM Quote WHERE Id = '${jctQuoteId}' LIMIT 1`
    ).catch((e) => (console.log(`[explore] FIELDS(ALL) query failed: ${e.message}`), undefined));
    if (rec) {
      for (const [k, v] of Object.entries(rec)) {
        if (v != null && /division|class|risk.?id|product|gwp|status/i.test(k)) {
          console.log(`[explore] Quote.${k} = ${JSON.stringify(v)}`);
        }
      }
    }
    await page.goto(`/lightning/r/Quote/${jctQuoteId}/view`);
    await waitForSpinners(page);
    await openRecordTab(page, 'Details');
    const uwDivItem = page
      .locator('records-record-layout-item, .slds-form-element, [data-target-selection-name]')
      .filter({ hasText: /Underwriting Division|UW Division/ })
      .filter({ visible: true })
      .first();
    if (await uwDivItem.isVisible({ timeout: 15_000 }).catch(() => false)) {
      console.log(`[explore] quote Details UW Division: "${(await uwDivItem.innerText()).replace(/\s+/g, ' ')}"`);
    } else {
      console.log('[explore] UW Division field not found on quote Details');
    }
    console.log(`[explore] DONE â€” resume with JCT_QUOTE_ID=${jctQuoteId}`);
  });
});});
