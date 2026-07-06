import { expect, test } from '@playwright/test';

test.describe('Theme: no-FOUC and live OS follow', () => {
    test('applies .dark class when OS is dark (no-FOUC — class present immediately after navigation)', async ({ page }) => {
        await page.emulateMedia({ colorScheme: 'dark' });
        // Navigate and check before waiting for networkidle — class must be present at DOMContentLoaded
        const response = await page.goto('/');
        expect(response?.ok()).toBe(true);

        const hasDarkClass = await page.evaluate(() => document.documentElement.classList.contains('dark'));
        expect(hasDarkClass, '.dark class not present after navigation with dark OS').toBe(true);
    });

    test('does not apply .dark class when OS is light and no stored preference', async ({ page }) => {
        await page.emulateMedia({ colorScheme: 'light' });
        await page.addInitScript(() => globalThis.localStorage.removeItem('ui.theme'));
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const hasDarkClass = await page.evaluate(() => document.documentElement.classList.contains('dark'));
        expect(hasDarkClass).toBe(false);
    });

    test('auto mode follows OS flip live (E6 — OS-flip-live)', async ({ page }) => {
        await page.emulateMedia({ colorScheme: 'light' });
        await page.addInitScript(() => globalThis.localStorage.removeItem('ui.theme'));
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const hasDarkInitially = await page.evaluate(() => document.documentElement.classList.contains('dark'));
        expect(hasDarkInitially, 'should start without .dark in light OS').toBe(false);

        await page.emulateMedia({ colorScheme: 'dark' });

        await page.waitForFunction(() => document.documentElement.classList.contains('dark'), { timeout: 3000 });

        const hasDarkAfterFlip = await page.evaluate(() => document.documentElement.classList.contains('dark'));
        expect(hasDarkAfterFlip, '.dark class not applied after OS flip to dark').toBe(true);
    });

    test('stored dark preference (persisted backend setting) overrides a light OS default once loaded', async ({ page }) => {
        // Theme is persisted via the backend UIPreferences (SQLite), not localStorage — see
        // frontend/src/main.tsx and frontend/src/logic/store/settings/thunks.ts:getUIPreferences.
        // Seed the bridge-mock's GetUIPreferencesConfig response the same way appbar.spec.ts does
        // for layout/sidebarCollapsed/etc.
        await page.addInitScript(() => {
            (window as Window & { __bridgeMockUIPrefs?: Record<string, unknown> }).__bridgeMockUIPrefs = { theme: 'dark' };
        });
        await page.emulateMedia({ colorScheme: 'light' });
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const hasDarkClass = await page.evaluate(() => document.documentElement.classList.contains('dark'));
        expect(hasDarkClass, 'stored dark preference should override light OS once the backend value loads').toBe(true);
    });
});
