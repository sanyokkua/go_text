import { expect, test } from '@playwright/test';

// T00: Placeholder smoke flows — expanded per feature task as views are built
// T21+ will replace these with real interaction flows (action run, stack build, history, etc.)
test.describe('Smoke: App loads without crash', () => {
    test('root route loads and body is non-empty', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        const bodyText = await page.locator('body').innerText();
        expect(bodyText.trim().length).toBeGreaterThan(0);
    });

    test('page has no JavaScript errors on load', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));
        page.on('console', (msg) => {
            if (msg.type() === 'error') errors.push(msg.text());
        });
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        expect(errors, `JS errors on load: ${errors.join('; ')}`).toHaveLength(0);
    });
});
