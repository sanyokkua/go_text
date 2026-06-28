import { test, expect, Page } from '@playwright/test';

async function openSettings(page: Page): Promise<void> {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /open settings/i }).click();
    // Wait for the settings view to be visible (first tab content loads).
    await page.waitForSelector('nav[aria-label="Provider list"]', { timeout: 8000 });
}

test.describe('Settings UI – all tabs accessible', () => {
    test('all seven settings tab buttons are visible', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await openSettings(page);

        // Assert – SettingsTabs renders plain <button> elements, NOT role="tab"
        for (const label of ['Providers', 'Model', 'Generation', 'Languages', 'Logging', 'About & data', 'Appearance']) {
            await expect(page.getByRole('button', { name: new RegExp(label, 'i') })).toBeVisible({ timeout: 5000 });
        }

        expect(jsErrors).toHaveLength(0);
    });

    test('clicking the Providers tab shows the provider list', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await openSettings(page);

        // Act
        await page.getByRole('button', { name: /^providers$/i }).click();

        // Assert – ProviderList nav is present
        await expect(page.locator('nav[aria-label="Provider list"]')).toBeVisible({ timeout: 5000 });
        // Mock provider from bridge is named "Mock Provider"
        await expect(page.getByRole('button', { name: /mock provider/i })).toBeVisible({ timeout: 5000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('clicking "New provider" shows the blank provider form', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await openSettings(page);

        // Ensure Providers tab is active
        await page.getByRole('button', { name: /^providers$/i }).click();

        // Act
        await page.getByRole('button', { name: /new provider/i }).click();

        // Assert – provider form with empty Name field appears
        await expect(page.getByLabel('Name')).toBeVisible({ timeout: 5000 });
        await expect(page.getByLabel('Base URL')).toBeVisible({ timeout: 5000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('filling and saving a new provider form completes without errors', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await openSettings(page);
        await page.getByRole('button', { name: /^providers$/i }).click();
        await page.getByRole('button', { name: /new provider/i }).click();
        await expect(page.getByLabel('Name')).toBeVisible({ timeout: 5000 });

        // Act – fill mandatory fields (name must not clash with existing "Mock Provider")
        await page.getByLabel('Name').fill('Test Provider');
        await page.getByLabel('Base URL').fill('http://localhost:9999/');

        const saveBtn = page.getByRole('button', { name: /^save$/i });
        await expect(saveBtn).toBeEnabled({ timeout: 3000 });
        await saveBtn.click();

        // Assert – form interaction completed without JS errors
        // (bridge mock CreateProviderConfig returns a new provider successfully)
        expect(jsErrors).toHaveLength(0);
    });

    test('clicking the Languages tab shows the language list with English', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await openSettings(page);

        // Act
        await page.getByRole('button', { name: /^languages$/i }).click();

        // Assert – "English" is in the language list (bridge mock default)
        await expect(page.getByText('English')).toBeVisible({ timeout: 5000 });
        await expect(page.getByLabel('New language')).toBeVisible({ timeout: 5000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('clicking the Appearance tab shows the theme segmented control', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await openSettings(page);

        // Act
        await page.getByRole('button', { name: /appearance/i }).click();

        // Assert – theme Segmented items are present (role="radio" from Radix ToggleGroup)
        await expect(page.getByRole('radio', { name: 'Follow OS setting' })).toBeVisible({ timeout: 5000 });
        await expect(page.getByRole('radio', { name: 'Light theme' })).toBeVisible({ timeout: 5000 });
        await expect(page.getByRole('radio', { name: 'Dark theme' })).toBeVisible({ timeout: 5000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('About & data tab shows app version from bridge mock', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await openSettings(page);

        // Act
        await page.getByRole('button', { name: /about & data/i }).click();

        // Assert – bridge mock returns appVersion '3.0.0'
        await expect(page.getByText('3.0.0')).toBeVisible({ timeout: 5000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('About & data tab shows "GoText" heading and factory reset button', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await openSettings(page);

        // Act
        await page.getByRole('button', { name: /about & data/i }).click();

        // Assert
        await expect(page.getByRole('heading', { name: /gotext/i })).toBeVisible({ timeout: 5000 });
        await expect(page.getByRole('button', { name: /factory reset/i })).toBeVisible({ timeout: 5000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('settings view renders without JS errors on initial open', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await openSettings(page);

        // Assert – no errors just from opening settings
        expect(jsErrors).toHaveLength(0);
    });

    test('navigating through all tabs in sequence produces no JS errors', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await openSettings(page);

        const tabLabels = ['Providers', 'Model', 'Generation', 'Languages', 'Logging', 'About & data', 'Appearance'];

        // Act – visit every tab
        for (const label of tabLabels) {
            await page.getByRole('button', { name: new RegExp(`^${label}$`, 'i') }).click();
            // Brief pause to let each tab render
            await page.waitForTimeout(300);
        }

        // Assert
        expect(jsErrors).toHaveLength(0);
    });
});
