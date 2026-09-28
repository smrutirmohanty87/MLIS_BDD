import { createBdd, test } from 'playwright-bdd';
import { expect } from '@playwright/test';
import { getMlisPortalUrl } from '../../../../src/config/env';

const { Given, Then } = createBdd(test);

async function acceptCookiesIfVisible(page: any) {
  const acceptInDialog = page
    .getByRole('alertdialog')
    .getByRole('button', { name: /accept all/i })
    .first();
  const acceptButton = page.getByRole('button', { name: /accept all/i }).first();

  if (await acceptInDialog.isVisible({ timeout: 2500 }).catch(() => false)) {
    await acceptInDialog.click().catch(() => undefined);
  } else if (await acceptButton.isVisible({ timeout: 2500 }).catch(() => false)) {
    await acceptButton.click().catch(() => undefined);
  }
}

function portalHomeUrl() {
  return getMlisPortalUrl().replace(/\/broker-zone\/?$/i, '/');
}

Given('I open broker portal home page for footer validation', async ({ page }) => {
  const baseUrl = portalHomeUrl();
  await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
  await acceptCookiesIfVisible(page);
});

Then('footer terms privacy and cookies links should open expected destinations', async ({ page, context }) => {
  const baseUrl = portalHomeUrl();

  const openFooterLinkAndAssert = async (linkName: RegExp, urlMustContain: RegExp) => {
    const footer = page.locator('footer').first();
    if (await footer.isVisible({ timeout: 2000 }).catch(() => false)) {
      await footer.scrollIntoViewIfNeeded();
    } else {
      await page.mouse.wheel(0, 5000);
    }

    const link = page.getByRole('link', { name: linkName }).first();
    await expect(link).toBeVisible({ timeout: 30000 });

    const popupPromise = context.waitForEvent('page', { timeout: 4000 }).catch(() => null);
    await link.click();
    const popup = await popupPromise;

    const targetPage = popup ?? page;
    if (!targetPage.isClosed()) {
      await targetPage.waitForLoadState('domcontentloaded').catch(() => undefined);
      await acceptCookiesIfVisible(targetPage);
      await expect(targetPage).toHaveURL(urlMustContain, { timeout: 30000 });
    } else {
      await expect(page).toHaveURL(urlMustContain, { timeout: 30000 });
    }

    if (popup) {
      if (!popup.isClosed()) await popup.close().catch(() => undefined);
    } else {
      await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
      await acceptCookiesIfVisible(page);
      await expect(page).toHaveURL(new RegExp(baseUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), { timeout: 30000 });
    }
  };

  await openFooterLinkAndAssert(/Terms\s*(?:and|&)\s*Conditions?/i, /terms.*conditions|conditions.*terms/i);
  await openFooterLinkAndAssert(/Privacy\s*Policy/i, /privacy.*policy|policy.*privacy/i);
  await openFooterLinkAndAssert(/Cookies?|Cookie\s*Policy/i, /cookies?|cookie-policy/i);
});

Given('I open broker portal home page for menu validation', async ({ page }) => {
  const homeUrl = portalHomeUrl();
  await page.goto(homeUrl, { waitUntil: 'domcontentloaded' });
  await acceptCookiesIfVisible(page);
});

Then('each visible home menu item should navigate to expected URL', async ({ page, context }) => {
  const VIEW_DELAY_MS = 1200;
  const pauseForDemo = async () => page.waitForTimeout(VIEW_DELAY_MS);

  const toUrlKeywordRegex = (value: string): RegExp => {
    const cleaned = value
      .toLowerCase()
      .replace(/[?#].*$/, '')
      .replace(/\.[a-z]{2,6}$/i, '')
      .replace(/^https?:\/\/[^/]+/i, '')
      .replace(/^\/+/, '')
      .trim();

    const candidate = cleaned.split('/').filter(Boolean).pop() ?? cleaned;
    const token = candidate.replace(/[-_\s]+/g, '.*');
    return new RegExp(token || '.+', 'i');
  };

  const getHomeMenuItems = async () => {
    const navigation = page.getByRole('navigation').first();
    const hasNavigation = await navigation.isVisible({ timeout: 5000 }).catch(() => false);
    const links = hasNavigation
      ? navigation.locator('a[href]')
      : page.locator('nav a[href], [role="navigation"] a[href], header a[href]');

    const count = await links.count();
    const items: { name: string; href: string }[] = [];

    for (let i = 0; i < count; i += 1) {
      const link = links.nth(i);
      const name = (await link.innerText().catch(() => '')).replace(/\s+/g, ' ').trim();
      const href = (await link.getAttribute('href'))?.trim() ?? '';

      if (!name || !href || href === '#' || href.toLowerCase().startsWith('javascript:') || href.toLowerCase().startsWith('mailto:') || href.toLowerCase().startsWith('tel:')) {
        continue;
      }

      if (!items.some((item) => item.name === name && item.href === href)) {
        items.push({ name, href });
      }
    }

    return items;
  };

  const openCollapsedMenuIfNeeded = async () => {
    const toggle = page
      .locator('button[aria-label*="menu" i], button:has-text("Menu"), .navbar-toggler, .menu-toggle, .hamburger, [data-testid*="menu-toggle"]')
      .first();

    if (await toggle.isVisible({ timeout: 1000 }).catch(() => false)) {
      await toggle.click().catch(() => undefined);
    }
  };

  const homeUrl = portalHomeUrl();
  await page.goto(homeUrl, { waitUntil: 'domcontentloaded' });
  await acceptCookiesIfVisible(page);
  await pauseForDemo();

  const menuItems = await getHomeMenuItems();
  expect(menuItems.length, 'No visible header/home menu links found').toBeGreaterThan(0);

  for (const menuItem of menuItems) {
    await page.goto(homeUrl, { waitUntil: 'domcontentloaded' });
    await acceptCookiesIfVisible(page);
    await pauseForDemo();

    const navigation = page.getByRole('navigation').first();
    const menuLink = navigation
      .locator('a[href]')
      .filter({ hasText: new RegExp(`^\\s*${menuItem.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i') })
      .first();

    if (!(await menuLink.isVisible({ timeout: 1500 }).catch(() => false))) {
      await openCollapsedMenuIfNeeded();
    }

    await expect(menuLink, `Menu item not visible: ${menuItem.name}`).toBeVisible({ timeout: 30000 });
    const href = (await menuLink.getAttribute('href'))?.trim() ?? menuItem.href;
    const resolvedHref = href.startsWith('http') ? href : new URL(href, page.url()).toString();
    const expectedUrlText = toUrlKeywordRegex(resolvedHref);

    const popupPromise = context.waitForEvent('page', { timeout: 5000 }).catch(() => null);
    const currentUrlBeforeClick = page.url();

    await pauseForDemo();
    await menuLink.click({ timeout: 15000 });
    const popup = await popupPromise;
    await pauseForDemo();

    if (popup) {
      await popup.waitForLoadState('domcontentloaded').catch(() => undefined);
      await acceptCookiesIfVisible(popup);
      await expect(popup, `Popup URL did not contain expected text for menu item: ${menuItem.name}`).toHaveURL(expectedUrlText, { timeout: 30000 });
      await popup.waitForTimeout(VIEW_DELAY_MS);
      await popup.close().catch(() => undefined);
      await pauseForDemo();
    } else {
      await page.waitForLoadState('domcontentloaded').catch(() => undefined);
      await pauseForDemo();

      if (page.url() === currentUrlBeforeClick && href.startsWith('#')) {
        continue;
      }

      await expect(page, `URL did not contain expected text for menu item: ${menuItem.name}`).toHaveURL(expectedUrlText, { timeout: 30000 });

      const onHomeAfterClick = new RegExp(homeUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').test(page.url());
      if (!onHomeAfterClick) {
        await pauseForDemo();
        await page.goBack({ waitUntil: 'domcontentloaded' }).catch(() => undefined);
        await acceptCookiesIfVisible(page);
        await pauseForDemo();
        await expect(page).toHaveURL(new RegExp(homeUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i'), { timeout: 30000 });
      }
    }
  }
});
