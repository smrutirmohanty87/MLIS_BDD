import { expect, Locator, Page } from '@playwright/test';
import { sfQueryOne } from '../auth/sfJwt';
import { openRecordTab, waitForSpinners } from '../utils/sf';
import { QuoteStatusPage } from '../pages/QuoteStatusPage';
import { RbsApprovalPage } from '../pages/RbsApprovalPage';
import {
  CC2_CLIENT_INFO, CC2_EL_TRADE, CC2_INSURED_ADDRESS, CC2_SECOND_LOCATION,
} from '../data/cc2Data';

/**
 * CC2 (Expanded Contractors Combined NB) flow helpers — the pieces of the
 * live-proven exploration (tests/explore-cc2.spec.ts, quote 0Q0Pu000006iu33KAA
 * reached Status "Issued") that the shared page objects don't cover:
 *  - Client Information with the "Create New Client = Yes" sub-form (it hides
 *    the Insured Name typeahead; committed via the "Create Client" button);
 *  - the quote wizard's custom step 3 "Insurable Detail" (fills only blanks);
 *  - the EL "Trade Details" grid row (the generic OmniScript engine
 *    mis-targets the row's combobox);
 *  - the SINGLE-STEP second-insurable modal (the shared
 *    QuotePage.addRiskLocation expects Care's 2-step form);
 *  - clauses save (the shared savePredefinedClauses ticks ALL 174 rows and
 *    the ticks don't bind on this org — proven mechanism is ONE tick → Save;
 *    clauses are NOT a gate, so the step never hard-fails);
 *  - the In Progress → Ready → Issued sequence with REST verification (the
 *    path chevron / markStage 'ok' is NOT a completion signal — live-proven).
 */

// New-client sub-form values, live-verified on newprodqa2 (the source doc
// never shows the sub-form): Company Type options are Company/Individual and
// Client Status options are Approved/Under Compliance Review/Restricted —
// the preference lists below resolve to "Company" / "Approved".
const NEW_CLIENT = {
  companyRegistrationNumber: '12345678',
  companyTypePreference: ['Company', 'Limited Company'],
  clientStatusPreference: ['Approved', 'Active'],
  vulnerablePreference: ['No'],
};

function escapeRx(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

/** Visible dropdown option matching `text` exactly. */
function optionLocator(page: Page, text: string): Locator {
  return page
    .locator('[role="option"]:not(.slds-path__link), lightning-base-combobox-item')
    .filter({ visible: true })
    .filter({ hasText: new RegExp(`^\\s*${escapeRx(text)}\\s*$`) })
    .first();
}

/** Wizard lookup/picklist pick: open, type-to-filter if needed, click option. */
async function pickOption(page: Page, label: string, option: string): Promise<void> {
  const input = page.getByLabel(label, { exact: false }).first();
  await input.click();
  await page.waitForTimeout(1500);
  if (!(await optionLocator(page, option).isVisible({ timeout: 2000 }).catch(() => false))) {
    await input.fill(option).catch(() => {});
    await page.waitForTimeout(2000);
  }
  const opt = optionLocator(page, option);
  await expect(opt, `"${label}": option "${option}" not offered`).toBeVisible({ timeout: 15_000 });
  await opt.click();
  await waitForSpinners(page);
}

/**
 * Click a labelled control; if a dropdown opens, pick the first `preferred`
 * entry present (else the first real option). If NO options appear, treat it
 * as a text field and fill `preferred[0]` (Registered Country behaves either
 * way depending on render — live-proven handling).
 */
async function pickFirstAvailable(page: Page, label: string | RegExp, preferred: string[]): Promise<string> {
  const input = page.getByLabel(label).and(page.locator('input')).filter({ visible: true }).first();
  await input.click();
  await page.waitForTimeout(1500);
  const opts = await visibleOptions(page);
  if (!opts.length) {
    await input.fill(preferred[0]);
    return preferred[0];
  }
  const target = preferred.find((p) => opts.includes(p)) ?? opts.find((o) => !/^--/.test(o)) ?? opts[0];
  await optionLocator(page, target).click();
  await waitForSpinners(page);
  return target;
}

/** Fill a labelled text field (restricted to input/textarea). */
async function fillWizardText(page: Page, label: string | RegExp, value: string): Promise<void> {
  const input = page.getByLabel(label).and(page.locator('input, textarea')).filter({ visible: true }).first();
  await input.click();
  await input.fill(value);
}

/** Visible validation/error text (toasts + inline), collapsed to one string. */
async function visibleErrorText(page: Page): Promise<string> {
  const texts = await page
    .locator('.slds-has-error, [role="alert"], .vlocity-error, .omniscript-error, .slds-notify, .toastMessage')
    .filter({ visible: true })
    .allInnerTexts()
    .catch(() => [] as string[]);
  return (texts || []).map((t) => t.replace(/\s+/g, ' ').trim()).filter(Boolean).join(' | ');
}

// ------------------------------------------------- 1. Client Information step

/**
 * Submission wizard step 2 "Client Information". Default path is the
 * existing-client typeahead ("Mr Jones Testing" exists on newprodqa2 —
 * Account 001Pu00000sBCP9IAO, created by the exploration). `createNew` runs
 * the "Create New Client = Yes" sub-form (only valid for a name that does not
 * exist yet — a duplicate create silently no-ops).
 */
export async function fillCc2ClientInformation(
  page: Page,
  insuredName: string,
  createNew: boolean
): Promise<void> {
  const d = CC2_CLIENT_INFO;

  if (createNew) {
    // Flip "Create New Client" to Yes — this HIDES the Insured Name typeahead
    // and reveals the new-client sub-form (live finding, run 1).
    const grp = page
      .locator('lightning-radio-group, fieldset, .slds-form-element')
      .filter({ hasText: 'Create New Client' })
      .filter({ visible: true })
      .last();
    const yes = grp.getByRole('radio', { name: 'Yes', exact: true }).first();
    if (await yes.count().catch(() => 0)) {
      await yes.check({ force: true }).catch(async () => {
        await grp.locator('label:has-text("Yes")').first().click();
      });
    } else {
      await grp.locator('label:has-text("Yes")').first().click();
    }
    await waitForSpinners(page);
    await page.waitForTimeout(1500);

    await fillWizardText(page, /^\*?\s*Client Name\s*$/, insuredName);
    await fillWizardText(page, /^\*?\s*Company Registration Number\s*$/, NEW_CLIENT.companyRegistrationNumber);
    await pickFirstAvailable(page, /^\*?\s*Company Type\s*$/, NEW_CLIENT.companyTypePreference);
    await pickFirstAvailable(page, /^\*?\s*Client Status\s*$/, NEW_CLIENT.clientStatusPreference);
    await fillWizardText(page, /^\*?\s*Registered Address Line\s*$/, CC2_INSURED_ADDRESS.addressLine);
    await fillWizardText(page, /^\*?\s*Registered City\s*$/, CC2_INSURED_ADDRESS.city);
    await fillWizardText(page, /^\*?\s*Registered County\/State\s*$/, CC2_INSURED_ADDRESS.countyState);
    await fillWizardText(page, /^\*?\s*Registered Postcode\s*$/, CC2_INSURED_ADDRESS.postcode);
    // Country may render as a picklist ("United Kingdom") or plain text.
    await pickFirstAvailable(page, /^\*?\s*Registered Country\s*$/, [CC2_INSURED_ADDRESS.country]);
    // "Use same address for Trading Address" defaults to Yes (leave it);
    // the vulnerable picklist is unstarred but part of the mandatory section.
    await pickFirstAvailable(page, /Is this client vulnerable/i, NEW_CLIENT.vulnerablePreference).catch((e) =>
      console.log(`[cc2] vulnerable picklist skipped: ${(e as Error).message.slice(0, 140)}`)
    );

    // The sub-form MUST be committed via the blue "Create Client" button.
    const createClient = page
      .getByRole('button', { name: 'Create Client', exact: true })
      .filter({ visible: true })
      .first();
    await expect(createClient).toBeVisible({ timeout: 15_000 });
    await createClient.click();
    await waitForSpinners(page);
    await page.waitForTimeout(3000);
    // Live workaround (run 4): the LWC can miss bindings — on a
    // "mandatory/incomplete" error, blur every text field once and retry.
    const errText = await visibleErrorText(page);
    if (/mandatory|incomplete/i.test(errText)) {
      console.log('[cc2] mandatory-fields error after Create Client — re-blurring inputs and retrying');
      for (const rx of [/^\*?\s*Client Name\s*$/, /^\*?\s*Company Registration Number\s*$/,
        /^\*?\s*Registered Address Line\s*$/, /^\*?\s*Registered City\s*$/,
        /^\*?\s*Registered County\/State\s*$/, /^\*?\s*Registered Country\s*$/,
        /^\*?\s*Registered Postcode\s*$/]) {
        const f = page.getByLabel(rx).and(page.locator('input, textarea')).filter({ visible: true }).first();
        if (await f.isVisible({ timeout: 1000 }).catch(() => false)) {
          await f.click().catch(() => {});
          await page.keyboard.press('Tab').catch(() => {});
        }
      }
      await createClient.click();
      await waitForSpinners(page);
      await page.waitForTimeout(3000);
    }
  } else {
    // Existing-client typeahead (proven default).
    const nameInput = page.getByLabel('Insured Name', { exact: false }).first();
    await nameInput.click();
    await nameInput.fill(insuredName);
    await page.waitForTimeout(2500);
    await page
      .getByRole('option', { name: insuredName, exact: true })
      .or(page.getByText(insuredName, { exact: true }))
      .filter({ visible: true })
      .first()
      .click();
    await waitForSpinners(page);
  }

  // The product-information block (Industry Sector…) renders only after
  // "Create Client" commits / the existing client resolves.
  await page
    .getByLabel('Industry Sector', { exact: false })
    .filter({ visible: true })
    .first()
    .waitFor({ state: 'visible', timeout: 30_000 })
    .catch(async () => {
      throw new Error(`Industry Sector never rendered — client not committed? Errors: ${await visibleErrorText(page)}`);
    });
  await pickOption(page, 'Industry Sector', d.industrySector);
  await pickOption(page, 'Activity Code', d.activityCode);
  await pickOption(page, 'Product', d.product);
  await fillWizardText(page, 'Business Description', d.businessDescription);
  await pickOption(page, 'Year Business Established', d.yearBusinessEstablished);
  await fillWizardText(page, 'Employee Size', d.employeeSize);
  await fillWizardText(page, 'Client Turnover', d.clientTurnover);
  // Classification is PREFILLED for existing clients — only pick when blank.
  const classInput = page.getByLabel('Client Classification Type', { exact: false }).and(page.locator('input')).first();
  const classVal = (await classInput.inputValue().catch(() => '')).trim();
  if (!classVal) {
    await pickOption(page, 'Client Classification Type', d.clientClassificationType);
  } else {
    await page.keyboard.press('Escape').catch(() => {});
  }

  await page.getByRole('button', { name: 'Next', exact: true }).first().click();
  await waitForSpinners(page);
  // The step transition shows a LONG spinner (>20s live) — waitFor, not
  // isVisible (isVisible ignores its timeout — live lesson).
  const step3 = page.getByText('Risk Type', { exact: false }).filter({ visible: true }).first();
  await step3.waitFor({ state: 'visible', timeout: 120_000 }).catch(async () => {
    throw new Error(`Client Information step did not advance — errors: ${await visibleErrorText(page)}`);
  });
}

// --------------------------------------------- 2. Quote wizard (3-step) + id

/**
 * Drive the Create-New-Quote 3-step wizard. Step 3 "Insurable Detail"
 * prefills from the client account (live-proven for "Mr Jones Testing"), so
 * only BLANK fields are filled (a freshly created client has no address).
 * @returns the new quote id (0Q0…).
 */
export async function completeCc2QuoteWizard(page: Page, insuredName: string): Promise<string> {
  // Step 1 — Select Product (preselected; Next).
  await expect(page.getByText('Select Product', { exact: true }).first()).toBeVisible({ timeout: 90_000 });
  await page.getByRole('button', { name: 'Next', exact: true }).first().click();
  await waitForSpinners(page);
  // Step 2 — Quote Overview.
  await expect(page.getByText('Quote Overview', { exact: true }).first()).toBeVisible({ timeout: 90_000 });
  await page.getByRole('button', { name: 'Next', exact: true }).first().click();
  await waitForSpinners(page);
  // Step 3 — Insurable Detail.
  await expect(page.getByText('Insurable Detail', { exact: true }).first()).toBeVisible({ timeout: 90_000 });

  const nameInput = page.getByLabel('Insurable Name', { exact: false }).and(page.locator('input')).filter({ visible: true }).first();
  if (!(await nameInput.inputValue().catch(() => '')).trim()) {
    await nameInput.click();
    await nameInput.fill(insuredName);
  }
  const addr: Array<[RegExp, string]> = [
    [/Address Line/i, CC2_INSURED_ADDRESS.addressLine],
    [/^\*?\s*(Risk )?City\s*$/i, CC2_INSURED_ADDRESS.city],
    [/County\/State/i, CC2_INSURED_ADDRESS.countyState],
    [/Postcode/i, CC2_INSURED_ADDRESS.postcode],
    [/^\*?\s*(Risk )?Country\s*$/i, CC2_INSURED_ADDRESS.country],
  ];
  for (const [rx, val] of addr) {
    const f = page.getByLabel(rx).and(page.locator('input, textarea')).filter({ visible: true }).first();
    if (!(await f.isVisible({ timeout: 2000 }).catch(() => false))) continue;
    if (!(await f.inputValue().catch(() => '')).trim()) {
      await f.click({ clickCount: 3 });
      await f.fill(val);
    }
  }

  await page.getByRole('button', { name: 'Submit', exact: true }).first().click();
  await expect(page.getByRole('tab', { name: 'Coverages' }).first()).toBeVisible({ timeout: 150_000 });
  await expect(page.getByRole('button', { name: 'Enter Premiums' }).first()).toBeVisible({ timeout: 150_000 });

  const m = page.url().match(/\/Quote\/(0Q0[A-Za-z0-9]+)\//);
  if (!m?.[1]) throw new Error(`Could not parse quote id from URL: ${page.url()}`);
  return m[1];
}

// ------------------------------------------------------ 3. EL Trade Details

/**
 * Fill the Employers Liability "Trade Details" grid row BEFORE running the
 * generic OmniScript engine — the engine mis-targets the row's combobox
 * (live run 8). Row labels are literal: "*Trade Description",
 * "*(Name of trade description) wageroll", "(… ) headcount".
 */
export async function fillElTradeRow(
  page: Page,
  tradeData?: { tradeDescription: string; wageroll: string; headcount?: string }
): Promise<void> {
  const trade = tradeData || CC2_EL_TRADE;
  const tradeCombo = page.getByLabel(/^\*?\s*Trade Description\s*$/).filter({ visible: true }).first();
  await expect(tradeCombo).toBeVisible({ timeout: 20_000 });
  await tradeCombo.click();
  await page.waitForTimeout(1500);
  const optLoc = page
    .locator('[role="option"]:not(.slds-path__link), lightning-base-combobox-item, [role="listbox"] li')
    .filter({ visible: true })
    .filter({ hasText: new RegExp(`^\\s*${escapeRx(trade.tradeDescription)}\\s*$`) })
    .first();
  if (await optLoc.isVisible({ timeout: 5000 }).catch(() => false)) {
    await optLoc.click();
  } else {
    // Type-to-filter combobox fallback (proven path when the list is long).
    await tradeCombo.fill(trade.tradeDescription).catch(() => {});
    await page.waitForTimeout(1500);
    if (await optLoc.isVisible({ timeout: 3000 }).catch(() => false)) await optLoc.click();
    else await page.keyboard.press('Enter').catch(() => {});
  }
  await waitForSpinners(page);

  const tradeWage = page
    .getByLabel(/\(Name of trade description\) wageroll/i)
    .and(page.locator('input'))
    .filter({ visible: true })
    .first();
  await expect(tradeWage).toBeVisible({ timeout: 15_000 });
  await tradeWage.click({ clickCount: 3 });
  await tradeWage.fill(trade.wageroll);
  if (trade.headcount) {
    const head = page
      .getByLabel(/\(Name of trade description\) headcount/i)
      .and(page.locator('input'))
      .filter({ visible: true })
      .first();
    await head.click({ clickCount: 3 });
    await head.fill(trade.headcount);
  }
}

// ------------------------------------------- 4. Second insurable (one step)

/**
 * "+ Add Risk Locations" → SINGLE-STEP "Risk Location/Insurable" modal
 * (live-proven; the shared QuotePage.addRiskLocation expects Care's 2-step
 * form). Handles a Next→Save layout too, defensively.
 */
export async function addCc2SecondInsurable(page: Page): Promise<void> {
  const d = CC2_SECOND_LOCATION;
  const addLink = page
    .getByRole('link', { name: 'Add Risk Locations' })
    .or(page.getByRole('button', { name: 'Add Risk Locations' }))
    .or(page.getByText('Add Risk Locations', { exact: true }))
    .first();
  await expect(addLink).toBeVisible({ timeout: 30_000 });
  await addLink.click();
  const modalHeading = page.getByRole('heading', { name: 'Risk Location/Insurable' }).first();
  await expect(modalHeading).toBeVisible({ timeout: 30_000 });

  await page.getByLabel('Insurable Name').filter({ visible: true }).first().fill(d.insurableName);
  const fillField = async (rx: RegExp, value: string, optional = false): Promise<void> => {
    const input = page.getByLabel(rx).filter({ visible: true }).first();
    if (!(await input.isVisible({ timeout: optional ? 1500 : 15_000 }).catch(() => false))) return;
    await input.click({ clickCount: 3 });
    await input.fill(value);
  };
  await fillField(/^\*?\s*Address Line\s*$/, d.addressLine);
  await fillField(/^\*?\s*City\s*$/, d.city);
  await fillField(/^\*?\s*County\/State\s*$/, d.countyState);
  await fillField(/^\*?\s*Postcode\s*$/, d.postcode);
  await fillField(/^\*?\s*Country\s*$/, d.country);
  await fillField(/^\*?\s*Latitude\s*$/, d.latitude, true);
  await fillField(/^\*?\s*Longitude\s*$/, d.longitude, true);

  const saveBtn = page.getByRole('button', { name: 'Save', exact: true }).filter({ visible: true }).last();
  const nextBtn = page.getByRole('button', { name: 'Next', exact: true }).filter({ visible: true }).last();
  if (await saveBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await saveBtn.click();
  } else if (await nextBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await nextBtn.click();
    await waitForSpinners(page);
    await page.getByRole('button', { name: 'Save', exact: true }).filter({ visible: true }).last().click();
  }
  await expect(modalHeading).toBeHidden({ timeout: 30_000 });
  await waitForSpinners(page);
  await expect(
    page.getByText(`${d.insurableName} - `).first(),
    'second insurable card did not appear'
  ).toBeVisible({ timeout: 15_000 });
}

// ------------------------------------------------------------- 5. Clauses

/**
 * Save predefined binder clauses the way the doc (and the live run) does:
 * tick ONE row → "Save Predefined Binder Clauses" → handle any follow-up
 * dialog. The shared ClausesFeesPage.savePredefinedClauses ticks ALL 174 rows
 * and the ticks don't bind on this org ("Please Select the Checkbox before
 * Save"). Clauses are NOT a gate for Quote Issued (live-proven), so this
 * step logs failures instead of failing the run.
 */
export async function saveCc2PredefinedClauses(page: Page): Promise<void> {
  await openRecordTab(page, 'Clauses');
  await expect(page.getByText('Predefined Binder Clauses').first()).toBeVisible({ timeout: 60_000 });
  await waitForSpinners(page);
  try {
    const rowChecks = page
      .locator('td input[type="checkbox"], tbody tr input[type="checkbox"]')
      .filter({ visible: true });
    if ((await rowChecks.count()) === 0) {
      console.log('[cc2] no pending predefined clause rows');
      return;
    }
    const first = rowChecks.first();
    await first.scrollIntoViewIfNeeded().catch(() => {});
    await first.check({ force: true }).catch(async () => {
      await first.locator('xpath=..').click();
    });
    await page.waitForTimeout(500);
    const save = page.getByRole('button', { name: 'Save Predefined Binder Clauses' }).first();
    await save.scrollIntoViewIfNeeded();
    await save.click();
    await waitForSpinners(page);
    await page.waitForTimeout(2500);
    // Doc mentions a follow-up "select binder and save" dialog; live it never
    // appeared — handle it if it ever does.
    const dialog = page.getByRole('dialog').filter({ visible: true }).last();
    if (await dialog.isVisible({ timeout: 4000 }).catch(() => false)) {
      const dlgSave = dialog.getByRole('button', { name: /^(Save|OK|Confirm)$/i }).filter({ visible: true }).first();
      if (await dlgSave.isVisible().catch(() => false)) {
        await dlgSave.click();
        await waitForSpinners(page);
      }
    }
  } catch (e) {
    console.log(`[cc2] clause save non-fatal error: ${(e as Error).message.slice(0, 160)}`);
  }
}

// ------------------------------------------------- 6. Quote Issued sequence

/**
 * Mark the quote "Quote Issued" and verify Quote.Status == 'Issued' via REST.
 * Live-proven org behaviour: the FIRST "Mark Status as Complete" advances
 * Status only In Progress → "Ready" (markStage still reports 'ok' — the path
 * chevron registers the click), a SECOND mark advances Ready → "Issued".
 * Escalations (both live-validated) if Status still isn't Issued:
 *   A) bulk "Confirm No Manual RBS Referral Reasons" over all sections;
 *   B) full approveAllRbs (reasons + carrier + Approved).
 */
export async function markCc2QuoteIssued(
  page: Page,
  status: QuoteStatusPage,
  quoteId: string,
  user: string
): Promise<void> {
  const quoteStatus = async (): Promise<string> => {
    const rec = await sfQueryOne(user, `SELECT Status FROM Quote WHERE Id = '${quoteId}'`).catch(() => undefined);
    return String(rec?.Status ?? '?');
  };
  const tryIssue = async (tag: string): Promise<void> => {
    await page.goto(`/lightning/r/Quote/${quoteId}/view`);
    await waitForSpinners(page);
    try {
      const r = await status.markStage('Quote Issued');
      console.log(`[cc2] markStage(Quote Issued) [${tag}] → ${r}; Status now "${await quoteStatus()}"`);
    } catch (e) {
      console.log(`[cc2] markStage(Quote Issued) [${tag}] threw: ${(e as Error).message.slice(0, 300)}`);
    }
  };

  await tryIssue('attempt1');
  if ((await quoteStatus()) !== 'Issued') {
    // Second mark: Ready → Issued (the normal, proven path).
    await tryIssue('attempt2-ready-to-issued');
  }
  if ((await quoteStatus()) !== 'Issued') {
    console.log('[cc2] escalation A: bulk Confirm No Manual RBS Referral Reasons');
    await status.confirmNoManualRbsReferralReasons().catch((e) =>
      console.log(`[cc2] bulk confirm failed: ${(e as Error).message.slice(0, 200)}`)
    );
    await tryIssue('attempt3-after-bulk-confirm');
  }
  if ((await quoteStatus()) !== 'Issued') {
    console.log('[cc2] escalation B: full approveAllRbs (reasons + carrier + Approved)');
    const rbs = new RbsApprovalPage(page);
    await rbs.approveAllRbs(quoteId).catch((e) =>
      console.log(`[cc2] approveAllRbs failed: ${(e as Error).message.slice(0, 200)}`)
    );
    await tryIssue('attempt4-after-full-approval');
  }

  const finalStatus = await quoteStatus();
  if (finalStatus !== 'Issued') {
    throw new Error(`Quote ${quoteId} Status is "${finalStatus}" — expected "Issued"`);
  }
}
