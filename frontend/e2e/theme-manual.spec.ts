import { expect, Page, test } from '@playwright/test';

// Navigates to Settings > Appearance tab and returns once it is ready.
async function openAppearanceTab(page: Page): Promise<void> {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /open settings/i }).click();
    await page.getByRole('tab', { name: /appearance/i }).click();
}

test.describe('Manual theme switching – Appearance tab', () => {
    test('selecting Dark applies the .dark class to <html>', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await openAppearanceTab(page);

        // Act
        await page.getByRole('radio', { name: 'Dark theme' }).click();

        // Assert – DOM reflects the theme change
        await page.waitForFunction(() => document.documentElement.classList.contains('dark'));
        const hasDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
        expect(hasDark).toBe(true);

        expect(jsErrors).toHaveLength(0);
    });

    test('selecting Light removes the .dark class from <html>', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        // Start in dark mode so the transition is testable. Theme is persisted via the backend
        // UIPreferences (SQLite), not localStorage — seed the bridge-mock's GetUIPreferencesConfig
        // response the same way appbar.spec.ts does for layout/sidebarCollapsed/etc.
        await page.addInitScript(() => {
            (window as Window & { __bridgeMockUIPrefs?: Record<string, unknown> }).__bridgeMockUIPrefs = { theme: 'dark' };
        });
        await openAppearanceTab(page);
        await page.waitForFunction(() => document.documentElement.classList.contains('dark'));

        // Act
        await page.getByRole('radio', { name: 'Light theme' }).click();

        // Assert
        await page.waitForFunction(() => !document.documentElement.classList.contains('dark'));
        const hasDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
        expect(hasDark).toBe(false);

        expect(jsErrors).toHaveLength(0);
    });

    test('selecting Auto with a dark OS emulation applies the .dark class', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await page.emulateMedia({ colorScheme: 'dark' });
        await openAppearanceTab(page);

        // Act
        await page.getByRole('radio', { name: 'Follow OS setting' }).click();

        // Assert – auto mode with dark OS should result in the .dark class
        await page.waitForFunction(() => document.documentElement.classList.contains('dark'));
        const hasDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
        expect(hasDark).toBe(true);

        expect(jsErrors).toHaveLength(0);
    });

    test('selecting Auto with a light OS emulation removes the .dark class', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        // Start dark so we can verify the class is removed. Theme is persisted via the backend
        // UIPreferences (SQLite), not localStorage — seed the bridge-mock's GetUIPreferencesConfig
        // response the same way appbar.spec.ts does for layout/sidebarCollapsed/etc.
        await page.addInitScript(() => {
            (window as Window & { __bridgeMockUIPrefs?: Record<string, unknown> }).__bridgeMockUIPrefs = { theme: 'dark' };
        });
        await page.emulateMedia({ colorScheme: 'light' });
        await openAppearanceTab(page);
        await page.waitForFunction(() => document.documentElement.classList.contains('dark'));

        // Act
        await page.getByRole('radio', { name: 'Follow OS setting' }).click();

        // Assert – auto mode with light OS should remove the .dark class
        await page.waitForFunction(() => !document.documentElement.classList.contains('dark'));
        const hasDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
        expect(hasDark).toBe(false);

        expect(jsErrors).toHaveLength(0);
    });

    test('selecting Dark sends the change to be persisted via UpdateUIPreferencesConfig', async ({ page }) => {
        // Theme is persisted via the backend UIPreferences (SQLite), not localStorage — see
        // frontend/src/logic/store/settings/thunks.ts:persistUIPreferences. The bridge-mock records
        // every such call on window.__lastUIPrefsUpdate (see appbar.spec.ts's "saves on change" suite).
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await openAppearanceTab(page);

        // Act
        await page.getByRole('radio', { name: 'Dark theme' }).click();
        await page.waitForFunction(() => document.documentElement.classList.contains('dark'));

        // Assert – the persisted-settings call carried the new theme.
        const lastUpdate = await page.evaluate(() => (window as Window & { __lastUIPrefsUpdate?: Record<string, unknown> }).__lastUIPrefsUpdate);
        expect(lastUpdate?.theme).toBe('dark');

        expect(jsErrors).toHaveLength(0);
    });

    test('Dark mode persists across a reload once the backend has it stored', async ({ page }) => {
        // Simulates the backend already having a persisted theme=dark UIPreferences row (as it would
        // after a prior "selecting Dark" run). addInitScript re-runs on every navigation of this page,
        // including reload, so GetUIPreferencesConfig returns theme=dark both on first load and reload.
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await page.addInitScript(() => {
            (window as Window & { __bridgeMockUIPrefs?: Record<string, unknown> }).__bridgeMockUIPrefs = { theme: 'dark' };
        });
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        await page.waitForFunction(() => document.documentElement.classList.contains('dark'), { timeout: 5000 });

        // Act – reload
        await page.reload();
        await page.waitForLoadState('networkidle');

        // Assert – the persisted theme is restored again on reload
        await page.waitForFunction(() => document.documentElement.classList.contains('dark'), { timeout: 5000 });
        const hasDark = await page.evaluate(() => document.documentElement.classList.contains('dark'));
        expect(hasDark).toBe(true);

        expect(jsErrors).toHaveLength(0);
    });

    test('switching between Dark and Light cycles the .dark class correctly', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await openAppearanceTab(page);

        // Act – Dark
        await page.getByRole('radio', { name: 'Dark theme' }).click();
        await page.waitForFunction(() => document.documentElement.classList.contains('dark'));
        expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);

        // Act – Light
        await page.getByRole('radio', { name: 'Light theme' }).click();
        await page.waitForFunction(() => !document.documentElement.classList.contains('dark'));
        expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(false);

        // Act – Dark again
        await page.getByRole('radio', { name: 'Dark theme' }).click();
        await page.waitForFunction(() => document.documentElement.classList.contains('dark'));
        expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);

        expect(jsErrors).toHaveLength(0);
    });
});
