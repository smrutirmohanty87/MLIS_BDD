import { expect, Page } from '@playwright/test';
import { getSalesforceLightningUrl } from '../config/env';
import { SalesforcePortalPage } from './salesforce-cancellation';

export class SalesforceNotesAttachmentsEwPage {
  constructor(private readonly page: Page) {}

  private async waitForLightningIdle() {
    await this.page.waitForLoadState('domcontentloaded');

    const textSpinner = this.page.getByText('Loading...').first();
    if (await textSpinner.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(textSpinner).toBeHidden({ timeout: 120000 });
    }

    const lightningSpinner = this.page.locator('.slds-spinner_container:visible, lightning-spinner:visible').first();
    if (await lightningSpinner.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(lightningSpinner).toBeHidden({ timeout: 120000 });
    }
  }

  async goto() {
    await this.page.goto(getSalesforceLightningUrl());
  }

  async login(
    username: string,
    password: string,
    options?: { useJwt?: boolean; fast?: boolean; jwtUsername?: string },
  ) {
    const salesforce = new SalesforcePortalPage(this.page);
    await salesforce.login(username, password, options);
    await this.waitForLightningIdle();
  }

  // Step 5-6: Global Search -> Search policy number -> open policy/submission link from grid.
  async searchPolicyAndOpenFromGlobalSearchGrid(policyReference: string) {
    await this.waitForLightningIdle();

    const globalSearchButton = this.page.getByRole('button', { name: /^Search$/ }).first();
    const searchLauncher = this.page.locator('//*[@id="oneHeader"]/div[2]/div[2]/div/div/button').first();

    if (await globalSearchButton.isVisible({ timeout: 3000 }).catch(() => false)) {
      await globalSearchButton.click();
    } else if (await searchLauncher.isVisible({ timeout: 3000 }).catch(() => false)) {
      await searchLauncher.click();
    }

    const dialogSearchInput = this.page
      .locator('[role="dialog"] input[type="search"]:visible, [role="dialog"] input[placeholder*="Search"]:visible')
      .first();
    const headerSearchInput = this.page
      .locator('#oneHeader [role="search"] input:visible, #oneHeader input[type="search"]:visible, #oneHeader input[placeholder="Search..."]:visible')
      .first();

    let activeSearchInput = headerSearchInput;
    if (!(await headerSearchInput.isVisible({ timeout: 5000 }).catch(() => false))) {
      await expect(dialogSearchInput).toBeVisible({ timeout: 120000 });
      activeSearchInput = dialogSearchInput;
    }

    await activeSearchInput.fill(policyReference);
    await this.page.keyboard.press('Enter');

    await this.waitForLightningIdle();

    const policyLinkInResults = this.page
      .locator('a:visible, [role="link"]:visible')
      .filter({ hasText: policyReference })
      .first();

    await expect(policyLinkInResults).toBeVisible({ timeout: 120000 });
    await policyLinkInResults.click();

    await this.waitForLightningIdle();
  }

  // Step 7-8: Related tab -> Notes & Attachments section.
  async openNotesAndAttachmentsFromRelatedTab() {
    const relatedTab = this.page.getByRole('tab', { name: 'Related' }).first();
    await expect(relatedTab).toBeVisible({ timeout: 120000 });
    await relatedTab.click();
    await this.waitForLightningIdle();

    const notesSectionLink = this.page
      .locator('article:visible, section:visible')
      .getByRole('link', { name: /Notes\s*&\s*Attachments/i })
      .first();

    for (let i = 0; i < 20; i += 1) {
      if (await notesSectionLink.isVisible({ timeout: 1000 }).catch(() => false)) {
        break;
      }
      await this.page.mouse.wheel(0, 1200);
    }

    await expect(notesSectionLink).toBeVisible({ timeout: 120000 });
    await notesSectionLink.click();
    await this.waitForLightningIdle();

    await expect(this.page.getByRole('heading', { name: /Notes\s*&\s*Attachments/i }).first()).toBeVisible({ timeout: 120000 });
  }

  // Step 9: Open each document/link and close.
  async openEachNoteAttachmentAndClose() {
    const loadingMarker = this.page.getByText('Loading...').first();
    const refreshButton = this.page.getByRole('button', { name: /^Refresh$/i }).first();
    const documentNameLinksSelector =
      'table tbody tr th[scope="row"] a:visible, table tbody tr td[data-label="Title"] a:visible, table tbody tr td[data-label="Name"] a:visible, [role="row"] [data-label="Title"] a:visible, [role="row"] [data-label="Name"] a:visible';

    let total = 0;
    for (let attempt = 0; attempt < 24; attempt += 1) {
      if (await loadingMarker.isVisible({ timeout: 1500 }).catch(() => false)) {
        await expect(loadingMarker).toBeHidden({ timeout: 180000 });
      }

      await this.waitForLightningIdle();

      const currentLinks = this.page.locator(documentNameLinksSelector);

      total = await currentLinks.count();
      if (total > 0) {
        break;
      }

      if (await refreshButton.isVisible({ timeout: 1500 }).catch(() => false)) {
        await refreshButton.click();
      }
      await this.page.waitForTimeout(3000);
    }

    expect(total).toBeGreaterThan(0);

    for (let i = 0; i < total; i += 1) {
      const documentLinks = this.page.locator(documentNameLinksSelector);
      const link = documentLinks.nth(i);
      await link.scrollIntoViewIfNeeded();

      const popupPromise = this.page.waitForEvent('popup', { timeout: 7000 }).catch(() => null);
      const previousUrl = this.page.url();
      await link.click();

      const popup = await popupPromise;
      if (popup) {
        await popup.waitForLoadState('domcontentloaded');
        await popup.close();
      } else {
        await this.waitForLightningIdle();

        const closeButton = this.page
          .locator('[role="dialog"] button:has-text("Close"), [role="dialog"] button[title*="Close"], [role="dialog"] button.slds-button_icon')
          .first();

        if (await closeButton.isVisible({ timeout: 5000 }).catch(() => false)) {
          await closeButton.click();
        } else {
          if (this.page.url() !== previousUrl) {
            await this.page.goBack();
          }
          await this.page.keyboard.press('Escape').catch(() => undefined);
        }

        await this.waitForLightningIdle();
      }
    }
  }
}
