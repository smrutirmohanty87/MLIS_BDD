import { Page, expect } from '@playwright/test';
import { POLICY_EXPECTATIONS } from '../data/testdata';

/**
 * InsurancePolicy record page (`/lightning/r/InsurancePolicy/<id>/view`)
 * reached via "Go To Policy" after policy creation.
 */
export class PolicyPage {
  constructor(private page: Page) {}

  /** Visible header/detail item containing a field label. */
  private fieldItem(label: string) {
    return this.page
      .locator(
        'records-highlights-details-item, .slds-page-header__detail-block, ' +
          'records-record-layout-item, force-record-layout-item, .slds-form-element'
      )
      .filter({ hasText: label })
      .filter({ visible: true })
      .first();
  }

  /**
   * Assert the policy was created correctly: entity header, Risk ID pattern
   * (new DOU/…/CAHO/… suffix), New/MTA/Renewal, Product link, DUAL Share GWP
   * equal to the quote's GWP, and current path stage "In Force".
   */
  async assertCreated(
    expected: typeof POLICY_EXPECTATIONS,
    quoteGwp: string
  ): Promise<void> {
    await expect(this.page).toHaveURL(/\/InsurancePolicy\//, { timeout: 90_000 });

    // Header entity label.
    await expect(
      this.page.getByText('Insurance Policy', { exact: true }).first()
    ).toBeVisible({ timeout: 60_000 });

    // Risk ID gets a new suffix, e.g. DOU/00124099/CAHO/00/26.
    await expect(this.fieldItem('Risk ID')).toContainText(
      /DOU\/\d+\/CAHO\/\d+\/\d+/,
      { timeout: 30_000 }
    );

    // Header field New/MTA/Renewal.
    await expect(this.fieldItem('New/MTA/Renewal')).toContainText(
      expected.newMtaRenewal,
      { timeout: 30_000 }
    );

    // Product link "Care Howden".
    await expect(
      this.page.getByRole('link', { name: expected.product }).first()
    ).toBeVisible({ timeout: 30_000 });

    // DUAL Share GWP carried over from the quote.
    await expect(this.fieldItem('DUAL Share GWP')).toContainText(quoteGwp, {
      timeout: 30_000,
    });

    // Path: current stage "In Force" (current/active class OR aria-selected).
    const inForceChevron = this.page
      .locator('.slds-path__item')
      .filter({ hasText: expected.status })
      .filter({ visible: true })
      .first();
    await expect(inForceChevron).toBeVisible({ timeout: 30_000 });
    const isCurrent = await inForceChevron.evaluate((el) => {
      const byClass = /slds-is-(current|active)/.test(el.className);
      const bySelection = !!el.querySelector(
        '[aria-selected="true"], [aria-current]'
      );
      return byClass || bySelection;
    });
    expect(
      isCurrent,
      `Path stage "${expected.status}" should be the current/selected stage`
    ).toBe(true);
  }

  /**
   * Assert a lifecycle policy's state: the "New/MTA/Renewal" header field and
   * the current compliance-path stage. `newMtaRenewal` may be omitted (e.g.
   * Cancellation only checks the path stage). Used by the CNR / MTA / Renewal /
   * Cancellation chain, where each flow yields a distinct classification.
   */
  async assertState(
    status: string,
    newMtaRenewal?: string,
    opts?: { product?: string; riskIdPattern?: RegExp }
  ): Promise<void> {
    await expect(this.page).toHaveURL(/\/InsurancePolicy\//, { timeout: 90_000 });

    if (newMtaRenewal) {
      await expect(this.fieldItem('New/MTA/Renewal')).toContainText(newMtaRenewal, {
        timeout: 30_000,
      });
    }

    if (opts?.riskIdPattern) {
      await expect(this.fieldItem('Risk ID')).toContainText(opts.riskIdPattern, {
        timeout: 30_000,
      });
    }

    if (opts?.product) {
      await expect(
        this.page.getByRole('link', { name: opts.product }).first()
      ).toBeVisible({ timeout: 30_000 });
    }

    const chevron = this.page
      .locator('.slds-path__item')
      .filter({ hasText: status })
      .filter({ visible: true })
      .first();
    await expect(chevron).toBeVisible({ timeout: 30_000 });
    const isCurrent = await chevron.evaluate((el) => {
      const byClass = /slds-is-(current|active)/.test(el.className);
      const bySelection = !!el.querySelector('[aria-selected="true"], [aria-current]');
      return byClass || bySelection;
    });
    expect(
      isCurrent,
      `Path stage "${status}" should be the current/selected stage`
    ).toBe(true);
  }
}
