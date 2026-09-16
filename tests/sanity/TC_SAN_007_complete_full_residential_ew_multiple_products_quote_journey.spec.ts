// spec: docs/test-plans/sf-quote-journey.plan.md
// seed: tests/seed.spec.ts

import { expect, Locator, Page, test } from '@playwright/test';
import { getQuoteJourneyFieldValues, getSalesforceCredentials } from '../../src/config/env';
import { SalesforcePortalPage } from '../../src/pages/salesforce-cancellation';

async function waitForLightningIdle(page: Page) {
	await page.waitForLoadState('domcontentloaded', { timeout: 15000 }).catch(() => {});
	await page.waitForTimeout(750);

	const knownBusyLocators = [
		page.locator('[role="progressbar"]'),
		page.locator('.slds-spinner:visible'),
		page.locator('text=Loading...'),
		page.locator('text=Processing Request'),
	];

	for (const busy of knownBusyLocators) {
		await busy.first().waitFor({ state: 'hidden', timeout: 15000 }).catch(() => {});
	}
}

async function clickWhenReady(locator: Locator, page: Page) {
	for (let attempt = 1; attempt <= 4; attempt += 1) {
		await waitForLightningIdle(page);
		try {
			await locator.click({ timeout: 15000 });
			return;
		} catch (error) {
			if (attempt === 4) {
				throw error;
			}
			await page.keyboard.press('Escape').catch(() => {});
			await page.waitForTimeout(1000);
		}
	}
}

async function pickFirstVisible(candidates: Locator[], timeoutMs = 15000) {
	const started = Date.now();
	while (Date.now() - started < timeoutMs) {
		for (const candidate of candidates) {
			const target = candidate.first();
			if (await target.isVisible().catch(() => false)) {
				return target;
			}
		}
		await candidates[0].page().waitForTimeout(250);
	}
	throw new Error('Unable to find a visible locator from provided candidates.');
}

async function findLookupInput(page: Page, fieldLabel: string) {
	return pickFirstVisible([
		page.getByRole('combobox', { name: new RegExp(fieldLabel, 'i') }),
		page.getByRole('searchbox', { name: new RegExp(fieldLabel, 'i') }),
		page.locator(`input[aria-label*="${fieldLabel}"]`),
		page.locator(`input[placeholder*="${fieldLabel}"]`),
	]);
}

async function selectLookupOption(page: Page, fieldLabel: string, query: string, optionText: string) {
	const input = await findLookupInput(page, fieldLabel);
	await clickWhenReady(input, page);
	await input.fill(query);

	await page.keyboard.press('Control+A');
	await page.keyboard.press('Backspace');
	await input.fill(query.slice(0, Math.min(4, query.length)) || query);

	const option = await pickFirstVisible([
		page.getByRole('option', { name: new RegExp(optionText, 'i') }),
		page.getByRole('link', { name: new RegExp(optionText, 'i') }),
		page.locator(`li:has-text("${optionText}")`),
	], 30000);
	await clickWhenReady(option, page);
}

async function selectComboboxOption(page: Page, label: string, optionText: string) {
	const combobox = await pickFirstVisible([
		page.getByRole('combobox', { name: new RegExp(label, 'i') }),
		page.locator(`button[aria-label*="${label}"]`),
		page.locator(`[data-target-selection-name*="${label.toLowerCase().replace(/\s+/g, '-')}"]`),
	]);

	await clickWhenReady(combobox, page);

	const option = await pickFirstVisible([
		page.getByRole('option', { name: new RegExp(optionText, 'i') }),
		page.locator(`[role="option"]:has-text("${optionText}")`),
		page.getByText(new RegExp(`^${optionText}$`, 'i')).first(),
	], 20000);

	await clickWhenReady(option, page);
	await waitForLightningIdle(page);
}

test.describe('@sanity | E2E | Salesforce Quote Journey | Residential E&W Multiple Products', () => {
	test('TC_SAN_007 | Complete full residential England & Wales quote journey with multiple products', async ({ page }) => {
		test.setTimeout(900000);
		test.slow();

		const caseRef = `SF-QJ-RES-MULTI-${Date.now()}`;
		const sfCreds = getSalesforceCredentials();
		const qjFields = getQuoteJourneyFieldValues();
		const salesforce = new SalesforcePortalPage(page);

		// 1. Login to Salesforce.
		await salesforce.login(sfCreds.username, sfCreds.password, { useJwt: true, fast: true });
		await expect(page.getByRole('link', { name: 'Quote Journey' })).toBeVisible({ timeout: 120000 });

		// 2. Navigate to Quote Journey and complete Product Selection.
		await clickWhenReady(page.getByRole('link', { name: 'Quote Journey' }), page);
		await expect(page.getByRole('heading', { name: /quote journey/i })).toBeVisible({ timeout: 120000 });
		await expect(page.getByRole('heading', { name: /product selection/i }).first()).toBeVisible({ timeout: 120000 });

		await selectLookupOption(page, 'Broker Account', qjFields.brokerAccountQuery, qjFields.brokerAccountOption);
		await selectLookupOption(page, 'Broker User', qjFields.brokerUserQuery, qjFields.brokerUserOption);
		await selectComboboxOption(page, 'Brand', qjFields.brand);

		await selectComboboxOption(page, 'Quote Type', 'Residential');
		await selectComboboxOption(page, 'Jurisdiction', qjFields.jurisdiction);

		const caseRefInput = await pickFirstVisible([
			page.getByRole('textbox', { name: /my case reference|case reference|file number/i }),
			page.locator('input[placeholder*="case reference" i]'),
		]);
		await caseRefInput.fill(caseRef);

		const loiInput = await pickFirstVisible([
			page.getByRole('spinbutton', { name: /limit of indemnity/i }),
			page.locator('input[type="number"][name*="limit" i]'),
			page.locator('input[aria-label*="Limit of indemnity"]'),
		]);
		await loiInput.fill('500000');

		// Multiple products: ensure at least two products are actually selected in the UI.
		const getSelectedCount = async () => {
			const txt = await page.locator('body').innerText();
			return Number(txt.match(/You have selected\s+(\d+)\s+products?/i)?.[1] ?? '0');
		};

		const clickAndVerifyIncrease = async (button: Locator) => {
			const before = await getSelectedCount();
			await clickWhenReady(button, page);
			await page.waitForTimeout(350);
			const after = await getSelectedCount();
			return after > before;
		};

		const preferredProductNames = [/Adverse Possession/i, /Absence of easement - Access/i];
		for (const productName of preferredProductNames) {
			if ((await getSelectedCount()) >= 2) {
				break;
			}

			const card = page.locator('article, div').filter({ hasText: productName }).first();
			const selectButton = card.getByRole('button', { name: /select/i }).first();
			if (await selectButton.isVisible({ timeout: 5000 }).catch(() => false)) {
				await clickAndVerifyIncrease(selectButton);
			}
		}

		for (let attempts = 0; attempts < 12 && (await getSelectedCount()) < 2; attempts += 1) {
			const selectButtons = page.getByRole('button', { name: /^Select$/i });
			const total = await selectButtons.count();
			if (total === 0) {
				break;
			}

			let changed = false;
			for (let i = 0; i < Math.min(total, 10) && (await getSelectedCount()) < 2; i += 1) {
				const ok = await clickAndVerifyIncrease(selectButtons.nth(i));
				if (ok) {
					changed = true;
				}
			}

			if (!changed) {
				await page.mouse.wheel(0, 1200);
				await page.waitForTimeout(350);
			}
		}

		await expect.poll(getSelectedCount, { timeout: 60000 }).toBeGreaterThanOrEqual(2);
		await clickWhenReady(page.getByRole('button', { name: /^Proceed$/ }).first(), page);

		// 3. Confirm all statements and proceed.
		await expect(page.getByRole('heading', { name: /statements of fact/i })).toBeVisible({ timeout: 120000 });

		const statementsHeading = page.getByRole('heading', { name: /statements of fact to agree/i }).first();
		await expect(statementsHeading).toBeVisible({ timeout: 120000 });

		const headingText = (await statementsHeading.textContent()) ?? '';
		const statementsToConfirm = Number(headingText.match(/(\d+)\s+statements?/i)?.[1] ?? '0');

		const confirmButtonsByXpath = page.locator(
			'xpath=//*[@id="brandBand_2"]//c-mlis-statement-of-fact//button[normalize-space()="Confirm"]'
		);

		if (statementsToConfirm > 0) {
			await expect
				.poll(async () => confirmButtonsByXpath.count(), { timeout: 60000 })
				.toBeGreaterThan(0);
		}

		for (let attempts = 0; attempts < Math.max(100, statementsToConfirm * 10); attempts += 1) {
			const count = await confirmButtonsByXpath.count();
			if (count === 0) {
				break;
			}

			const firstVisibleConfirm = confirmButtonsByXpath.first();
			await firstVisibleConfirm.scrollIntoViewIfNeeded();
			await firstVisibleConfirm.click({ force: true, timeout: 20000 });
			await page.waitForTimeout(250);
		}

		await expect(confirmButtonsByXpath, 'All Statements of Fact must be confirmed before clicking Proceed.').toHaveCount(0, {
			timeout: 15000,
		});

		await clickWhenReady(page.getByRole('button', { name: /^Proceed$/ }).first(), page);

		// 4. Select quote.
		await expect(page.getByRole('heading', { name: /quotes/i })).toBeVisible({ timeout: 120000 });

		const axaCard = page.locator('article, div').filter({ hasText: /AXA XL/i }).first();
		const axaSelect = axaCard.getByRole('button', { name: /Select quote/i }).first();

		if (await axaSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
			await clickWhenReady(axaSelect, page);
		} else {
			await clickWhenReady(page.getByRole('button', { name: /Select quote/i }).first(), page);
		}

		// 5. Fill final policy details.
		await expect(page.getByRole('heading', { name: /final policy details/i })).toBeVisible({ timeout: 120000 });

		let requiredInputs = page.locator('input[required]');
		await expect(requiredInputs.nth(0)).toBeVisible({ timeout: 30000 });
		await requiredInputs.nth(0).fill('John Smith');
		await requiredInputs.nth(1).fill('SW1A 1AA');
		await requiredInputs.nth(1).press('Tab').catch(() => {});

		const enterManually = page
			.getByRole('button', { name: /enter manually/i })
			.or(page.getByRole('link', { name: /enter manually/i }))
			.first();
		if (await enterManually.isVisible({ timeout: 3000 }).catch(() => false)) {
			await clickWhenReady(enterManually, page);
		}

		requiredInputs = page.locator('input[required]');
		await expect(requiredInputs.nth(2)).toBeVisible({ timeout: 30000 });
		await requiredInputs.nth(2).fill('10 Downing Street');
		await requiredInputs.nth(3).fill('London');

		await clickWhenReady(page.getByRole('button', { name: /next|proceed/i }).first(), page);

		// 6. Proceed to order, select date, order now.
		await expect(page.getByRole('heading', { name: /^Summary$/i })).toBeVisible({ timeout: 120000 });
		await clickWhenReady(page.getByRole('button', { name: /Proceed to order/i }), page);

		const commencementDateInput = await pickFirstVisible([
			page.getByRole('textbox', { name: /commencement date/i }),
			page.locator('input[placeholder="DD/MM/YYYY"]'),
		], 30000);

		await commencementDateInput.fill('14/04/2026');
		await clickWhenReady(page.getByRole('heading', { name: /Final policy details/i }).first(), page);

		const orderNow = page.getByRole('button', { name: /Order now/i }).first();
		await expect(orderNow).toBeEnabled({ timeout: 30000 });
		await clickWhenReady(orderNow, page);

		// 7. Verify Policy issued and return to submission.
		await expect(page.getByRole('heading', { name: /Policy issued/i })).toBeVisible({ timeout: 180000 });
		await expect(page.getByText(/Policy documents sent to/i)).toBeVisible({ timeout: 30000 });

		const policyText = await page.locator('body').innerText();
		const policyNumber = policyText.match(/DA-MLI-\d{9}/)?.[0];
		expect(policyNumber, 'Expected policy number format DA-MLI-XXXXXXXXX on Policy issued page.').toBeTruthy();

		await clickWhenReady(page.getByRole('button', { name: /Return to submission/i }), page);
		await expect(page.getByRole('heading', { name: /Quote Journey|Submissions?/i })).toBeVisible({ timeout: 120000 });
	});
});
