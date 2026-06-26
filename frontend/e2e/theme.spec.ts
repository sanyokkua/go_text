import { expect, test } from '@playwright/test';

test.describe('Theme: no-FOUC and live OS follow', () => {
    test('applies .dark class when OS is dark (no-FOUC — class present immediately after navigation)', async ({ page }) => {
        await page.emulateMedia({ colorScheme: 'dark' });
        // Navigate and check before waiting for networkidle — class must be present at DOMContentLoaded
        const response = await page.goto('/');
        expect(response?.ok()).toBe(true);

        const hasDarkClass = await page.evaluate(
            () => document.documentElement.classList.contains('dark')
        );
        expect(hasDarkClass, '.dark class not present after navigation with dark OS').toBe(true);
    });

    test('does not apply .dark class when OS is light and no stored preference', async ({ page }) => {
        await page.emulateMedia({ colorScheme: 'light' });
        await page.addInitScript(() => globalThis.localStorage.removeItem('ui.theme'));
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const hasDarkClass = await page.evaluate(
            () => document.documentElement.classList.contains('dark')
        );
        expect(hasDarkClass).toBe(false);
    });

    test('auto mode follows OS flip live (E6 — OS-flip-live)', async ({ page }) => {
        await page.emulateMedia({ colorScheme: 'light' });
        await page.addInitScript(() => globalThis.localStorage.removeItem('ui.theme'));
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const hasDarkInitially = await page.evaluate(
            () => document.documentElement.classList.contains('dark')
        );
        expect(hasDarkInitially, 'should start without .dark in light OS').toBe(false);

        await page.emulateMedia({ colorScheme: 'dark' });

        await page.waitForFunction(() => document.documentElement.classList.contains('dark'), { timeout: 3000 });

        const hasDarkAfterFlip = await page.evaluate(
            () => document.documentElement.classList.contains('dark')
        );
        expect(hasDarkAfterFlip, '.dark class not applied after OS flip to dark').toBe(true);
    });

    test('stored dark preference is applied before first paint', async ({ page }) => {
        await page.addInitScript(() => globalThis.localStorage.setItem('ui.theme', 'dark'));
        await page.emulateMedia({ colorScheme: 'light' });
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const hasDarkClass = await page.evaluate(
            () => document.documentElement.classList.contains('dark')
        );
        expect(hasDarkClass, 'stored dark preference should override light OS').toBe(true);
    });
});
