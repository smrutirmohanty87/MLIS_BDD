import { expect, Locator, Page } from '@playwright/test';
import {
  ASSET_PROTECTION,
  ASSET_QUESTIONS,
  COVERS_EXCESSES,
  REVENUE_PROTECTION,
} from '../data/testdata';
import { waitForSpinners } from '../utils/sf';

/**
 * Coverage modal form-fillers (Asset Protection, Revenue Protection, Group
 * Personal Accident). Each method assumes the corresponding coverage modal is
 * ALREADY OPEN (QuotePage.addInsurableCoverage / addProductCoverage waits for
 * the modal heading). No iframes — page locators pierce the LWC shadow DOM.
 */
export class CoverageForms {
  constructor(private page: Page) {}

  /**
   * The radio-question group for `question`. OmniScript renders each radio
   * question as a role="group" whose accessible name contains the question
   * text; value fields (e.g. "Residents Contents") are NOT groups, so scoping
   * to role=group + presence of a radio disambiguates a question like
   * "residents contents" from the like-named declared-value input.
   */
  private questionGroup(question: string): Locator {
    const escaped = question.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(escaped, 'i');
    const byRole = this.page
      .getByRole('group', { name: rx })
      .filter({ has: this.page.getByRole('radio') });
    return byRole.last();
  }

  /** Click the "Yes" radio of the question located by (partial) text. */
  private async answerYes(question: string): Promise<void> {
    const group = this.questionGroup(question);
    await group.scrollIntoViewIfNeeded().catch(() => {});
    const radio = group.getByRole('radio', { name: 'Yes', exact: true }).first();
    await radio.check({ force: true }).catch(async () => {
      await group.locator('label').filter({ hasText: 'Yes' }).first().click();
    });
  }

  /**
   * The EDITABLE input for a label. Some labels appear twice (Declared Value
   * editable + Sum Insured readOnly) — the readonly/disabled ones are excluded.
   */
  private editableByLabel(label: string, exact: boolean): Locator {
    // Required OmniScript fields expose the leading "*" in their accessible
    // name (e.g. editable Declared Value = "*Buildings", readonly Sum Insured =
    // "Buildings"). Match either form, anchored so "Contents" can't leak into
    // "Residents Contents", then keep only the editable control.
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nameMatcher = exact
      ? new RegExp(`^\\*?\\s*${escaped}\\s*$`)
      : label;
    return this.page
      .getByLabel(nameMatcher, { exact: false })
      .and(
        this.page.locator(
          'input:not([readonly]):not([disabled]), textarea:not([readonly]):not([disabled])'
        )
      )
      // OmniScript renders a hidden template copy alongside the live control;
      // keep only the visible one so `.first()` can't grab the template.
      .filter({ visible: true })
      .first();
  }

  /** Wait for the editable input labelled `label`, then fill it. */
  private async fillEditable(
    label: string,
    value: string,
    opts: { exact?: boolean; selectAll?: boolean } = {}
  ): Promise<void> {
    const input = this.editableByLabel(label, opts.exact ?? true);
    await expect(input).toBeVisible({ timeout: 15_000 });
    await input.scrollIntoViewIfNeeded().catch(() => {});
    await input.click({ clickCount: opts.selectAll ? 3 : 1 });
    await input.fill(value);
  }

  /**
   * OmniScript c-combobox: click to open, optionally type to filter, then
   * click the option with the exact text.
   */
  private async pickCombo(
    label: string,
    option: string,
    opts: { typeToFilter?: boolean } = {}
  ): Promise<void> {
    const combo = this.page.getByLabel(label).first();
    await expect(combo).toBeVisible({ timeout: 15_000 });
    await combo.scrollIntoViewIfNeeded().catch(() => {});
    await combo.click();
    if (opts.typeToFilter) {
      await combo.pressSequentially(option, { delay: 40 }).catch(() => {});
    }
    const opt = this.page.getByRole('option', { name: option, exact: true }).first();
    try {
      await opt.click({ timeout: 5_000 });
    } catch {
      await this.page
        .locator(
          '[role="listbox"] [role="option"], [role="listbox"] li, ' +
            '.slds-listbox__option, lightning-base-combobox-item'
        )
        .filter({ hasText: option })
        .first()
        .click();
    }
    await waitForSpinners(this.page);
  }

  /** Visible, empty, editable text inputs — optionally restricted by label regex. */
  private async emptyTextInputs(labelRx?: RegExp): Promise<Locator[]> {
    const base = labelRx
      ? this.page.getByLabel(labelRx)
      : this.page.locator('input[type="text"], input:not([type])');
    const out: Locator[] = [];
    const n = await base.count();
    for (let i = 0; i < n; i++) {
      const el = base.nth(i);
      if (!(await el.isVisible().catch(() => false))) continue;
      const ok = await el
        .evaluate((e) => {
          const input = e as HTMLInputElement;
          return (
            !input.readOnly &&
            !input.disabled &&
            input.value === '' &&
            input.getAttribute('role') !== 'combobox'
          );
        })
        .catch(() => false);
      if (ok) out.push(el);
    }
    return out;
  }

  /**
   * Fill the revealed `If "Yes/No", please provide full details` input that
   * sits on the same row as (nearest to) the question container. XPath axes
   * cannot cross shadow-root boundaries, so proximity is measured with
   * bounding boxes instead.
   */
  private async fillDetailFor(question: string, value: string): Promise<void> {
    const group = this.questionGroup(question);
    await group.scrollIntoViewIfNeeded().catch(() => {});
    const qBox = await group.boundingBox();
    let candidates = await this.emptyTextInputs(/please provide full details/i);
    if (candidates.length === 0) candidates = await this.emptyTextInputs();
    if (candidates.length === 0) {
      throw new Error(`No empty detail input found for question: "${question}"`);
    }
    let best = candidates[0];
    let bestDist = Number.POSITIVE_INFINITY;
    for (const c of candidates) {
      const b = await c.boundingBox();
      if (!b || !qBox) continue;
      const dist = Math.abs(b.y + b.height / 2 - (qBox.y + qBox.height / 2));
      if (dist < bestDist) {
        bestDist = dist;
        best = c;
      }
    }
    await best.click();
    await best.fill(value);
  }

  /** Defensive sweep: fill any still-empty visible REQUIRED text input. */
  private async fillRemainingRequiredDetails(value: string): Promise<void> {
    const inputs = this.page.locator('input[type="text"], input:not([type])');
    const n = await inputs.count();
    for (let i = 0; i < n; i++) {
      const el = inputs.nth(i);
      if (!(await el.isVisible().catch(() => false))) continue;
      const needsFill = await el
        .evaluate((e) => {
          const input = e as HTMLInputElement;
          const required =
            input.required || input.getAttribute('aria-required') === 'true';
          return (
            required &&
            !input.readOnly &&
            !input.disabled &&
            input.value === '' &&
            input.getAttribute('role') !== 'combobox'
          );
        })
        .catch(() => false);
      if (!needsFill) continue;
      await el.click();
      await el.fill(value);
    }
  }

  /** Click the step "Next" button and let spinners settle. */
  private async next(): Promise<void> {
    await this.page.getByRole('button', { name: 'Next', exact: true }).last().click();
    await waitForSpinners(this.page);
  }

  /** Click "Save" and wait for the modal (its coverage heading) to close. */
  private async save(modalHeading: string): Promise<void> {
    await this.page.getByRole('button', { name: 'Save', exact: true }).last().click();
    await expect(
      this.page.getByRole('heading', { name: modalHeading }).first()
    ).toBeHidden({ timeout: 20_000 });
    await waitForSpinners(this.page);
  }

  /**
   * Fill the 4-step "Asset Protection - Property Damage" modal
   * (Asset Protection / Questions Cont. / Questions Cont. / Covers & Excesses)
   * with ASSET_PROTECTION / ASSET_QUESTIONS / COVERS_EXCESSES data, then Save.
   */
  async fillAssetProtection(): Promise<void> {
    // Step 1 — "Is buildings cover..." is already Yes; pick cover type, which
    // reveals the Buildings declared-value row (Sum Insured cols are readOnly).
    await this.pickCombo(
      'Buildings cover or tenants improvement',
      ASSET_PROTECTION.buildingsCoverType
    );
    await this.fillEditable('Buildings', ASSET_PROTECTION.buildings.declared);

    const declaredRows = [
      { question: 'Is contents cover required', label: 'Contents', value: ASSET_PROTECTION.contents.declared },
      { question: 'residents contents', label: 'Residents Contents', value: ASSET_PROTECTION.residentsContents },
      { question: 'stock cover', label: 'Stock', value: ASSET_PROTECTION.stock.declared },
      { question: 'computer', label: 'Computer hardware, including portable equipment', value: ASSET_PROTECTION.computer.declared },
      { question: 'business all risk', label: 'Business All Risks', value: ASSET_PROTECTION.businessAllRisks },
    ] as const;
    for (const row of declaredRows) {
      await this.answerYes(row.question);
      await this.fillEditable(row.label, row.value);
    }
    // Uplift fields stay at their default 15.
    await this.next();
    await expect(
      this.page.getByText('Approx. year of construction').first()
    ).toBeVisible({ timeout: 30_000 });

    // Step 2 "Questions Cont." — radios keep their preselected defaults except
    // the ones below; flipped/defaulted-Yes questions need detail inputs.
    await this.fillEditable(
      'Approx. year of construction of the property',
      ASSET_QUESTIONS.yearOfConstruction,
      { exact: false }
    );
    await this.fillEditable('What % of roof is flat', ASSET_QUESTIONS.percentRoofFlat, {
      exact: false,
    });
    await this.answerYes('Do you or any member of staff live at the business premises');
    await this.page.waitForTimeout(500); // reveal settle
    await this.fillDetailFor(
      'Do you or any member of staff live at the business premises',
      ASSET_QUESTIONS.staffLiveAtPremises.detail
    );
    // "Is the property a listed building" defaults Yes -> Grade combobox.
    await this.pickCombo(
      'If "Yes" is it Grade 1 or Grade 2',
      ASSET_QUESTIONS.listedBuilding.grade
    );
    // "Subsidence, heave, landslip..." defaults Yes -> detail required.
    await this.fillDetailFor(
      'Subsidence, heave, landslip',
      ASSET_QUESTIONS.subsidenceHistory.detail
    );
    await this.fillRemainingRequiredDetails(ASSET_QUESTIONS.defaultDetail);
    await this.next();
    await expect(
      this.page.getByText('Approx. year of construction').first()
    ).toBeHidden({ timeout: 30_000 });

    // Step 3 "Questions Cont." — all 3 questions preselected with valid defaults.
    await this.next();
    await expect(
      this.page.getByText('Risk Location - Property Type').first()
    ).toBeVisible({ timeout: 30_000 });

    // Step 4 "Covers & Excesses" — covers default Yes; override Theft Excess
    // and the property type (type to filter, exact option).
    await this.fillEditable('Theft Excess', COVERS_EXCESSES.excesses.Theft, {
      exact: false,
      selectAll: true,
    });
    await this.pickCombo('Risk Location - Property Type', COVERS_EXCESSES.propertyType, {
      typeToFilter: true,
    });
    await this.save('Asset Protection - Property Damage');
  }

  /**
   * Fill the single-step "Revenue Protection - Business Interruption" modal
   * ("Coverage Questions") with REVENUE_PROTECTION data, then Save.
   */
  async fillRevenueProtection(): Promise<void> {
    await this.pickCombo('Limit Type', REVENUE_PROTECTION.limitType);
    // Revealed by the "Gross Revenue" limit type.
    await this.fillEditable(
      'What is the annual fee income',
      REVENUE_PROTECTION.annualFeeIncome,
      { exact: false }
    );
    await this.pickCombo('Indemnity Period Months', REVENUE_PROTECTION.indemnityPeriodMonths);
    // Defaults 150,000.00 — clear (triple-click) and override.
    await this.fillEditable(
      'Loss Of Registration Sum Insured',
      REVENUE_PROTECTION.lossOfRegistrationSumInsured,
      { exact: false, selectAll: true }
    );
    await this.save('Revenue Protection - Business Interruption');
  }

  /**
   * "Group Personal Accident" modal: all defaults are valid
   * (Worldwide / Standard / Yes / Yes / 10,000) — just Save.
   */
  async fillGroupPersonalAccident(): Promise<void> {
    await this.save('Group Personal Accident');
  }
}
