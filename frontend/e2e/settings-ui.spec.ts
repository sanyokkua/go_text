import { test, expect, Page } from '@playwright/test';

async function openSettings(page: Page): Promise<void> {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.getByRole('button', { name: /open settings/i }).click();
    await page.waitForSelector('[role="tablist"][aria-label="Settings sections"]', { timeout: 8000 });
}

async function openLoggingTab(page: Page): Promise<void> {
    await openSettings(page);
    await page.getByRole('tab', { name: /^logging$/i }).click();
    await page.waitForTimeout(300);
}

test.describe('Settings UI – all tabs accessible', () => {
    test('all seven settings tab buttons are visible', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await openSettings(page);

        // Assert – SettingsTabs renders a left vertical nav of role="tab" items
        for (const label of ['Providers', 'Model', 'Generation', 'Languages', 'Logging', 'About & data', 'Appearance']) {
            await expect(page.getByRole('tab', { name: new RegExp(label, 'i') })).toBeVisible({ timeout: 5000 });
        }

        expect(jsErrors).toHaveLength(0);
    });

    test('clicking the Providers tab shows the provider list', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await openSettings(page);

        // Act
        await page.getByRole('tab', { name: /^providers$/i }).click();

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
        await page.getByRole('tab', { name: /^providers$/i }).click();

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
        await page.getByRole('tab', { name: /^providers$/i }).click();
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
        await page.getByRole('tab', { name: /^languages$/i }).click();

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
        await page.getByRole('tab', { name: /appearance/i }).click();

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
        await page.getByRole('tab', { name: /about & data/i }).click();

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
        await page.getByRole('tab', { name: /about & data/i }).click();

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

        const tabLabels = ['Appearance', 'Logging', 'Providers', 'Model', 'Generation', 'Languages', 'About & data'];

        // Act – visit every tab
        for (const label of tabLabels) {
            await page.getByRole('tab', { name: new RegExp(`^${label}$`, 'i') }).click();
            // Brief pause to let each tab render
            await page.waitForTimeout(300);
        }

        // Assert
        expect(jsErrors).toHaveLength(0);
    });
});

test.describe('App File Logging settings', () => {
    test('shows App File Logging section heading', async ({ page }) => {
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await openLoggingTab(page);

        await expect(page.getByText(/app file logging/i)).toBeVisible({ timeout: 5000 });
        expect(jsErrors).toHaveLength(0);
    });

    test('Enable file logging toggle starts unchecked', async ({ page }) => {
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await openLoggingTab(page);

        const toggle = page.getByRole('switch', { name: /enable file logging/i });
        await expect(toggle).toBeVisible({ timeout: 5000 });
        await expect(toggle).toHaveAttribute('aria-checked', 'false');

        expect(jsErrors).toHaveLength(0);
    });

    test('toggling enable file logging produces no JS errors', async ({ page }) => {
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await openLoggingTab(page);

        await page.getByRole('switch', { name: /enable file logging/i }).click();

        // Allow toast / redux update to settle.
        await page.waitForTimeout(500);
        expect(jsErrors).toHaveLength(0);
    });

    test('max file size stepper is visible with value 10', async ({ page }) => {
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await openLoggingTab(page);

        const stepper = page.getByRole('spinbutton', { name: /max log file size mb/i });
        await expect(stepper).toBeVisible({ timeout: 5000 });
        await expect(stepper).toHaveValue('10');

        expect(jsErrors).toHaveLength(0);
    });
});

test.describe('About & data tab – app folder and open-folder buttons', () => {
    test('About & data tab shows app folder path from bridge mock', async ({ page }) => {
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await openSettings(page);
        await page.getByRole('tab', { name: /about & data/i }).click();

        // Bridge mock returns settingsFolder: '/mock/settings'
        await expect(page.getByText('/mock/settings', { exact: true })).toBeVisible({ timeout: 5000 });
        expect(jsErrors).toHaveLength(0);
    });

    test('About & data tab shows open app folder button', async ({ page }) => {
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await openSettings(page);
        await page.getByRole('tab', { name: /about & data/i }).click();

        await expect(page.getByRole('button', { name: /open app folder/i })).toBeVisible({ timeout: 5000 });
        expect(jsErrors).toHaveLength(0);
    });

    test('About & data tab shows open logs folder button', async ({ page }) => {
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await openSettings(page);
        await page.getByRole('tab', { name: /about & data/i }).click();

        await expect(page.getByRole('button', { name: /open logs folder/i })).toBeVisible({ timeout: 5000 });
        expect(jsErrors).toHaveLength(0);
    });

    test('clicking open app folder button produces no JS errors', async ({ page }) => {
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await openSettings(page);
        await page.getByRole('tab', { name: /about & data/i }).click();
        await page.getByRole('button', { name: /open app folder/i }).click();

        await page.waitForTimeout(400);
        expect(jsErrors).toHaveLength(0);
    });

    test('clicking open logs folder button from About & data produces no JS errors', async ({ page }) => {
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await openSettings(page);
        await page.getByRole('tab', { name: /about & data/i }).click();
        await page.getByRole('button', { name: /open logs folder/i }).click();

        await page.waitForTimeout(400);
        expect(jsErrors).toHaveLength(0);
    });

    test('About & data tab still shows database path and factory reset button', async ({ page }) => {
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await openSettings(page);
        await page.getByRole('tab', { name: /about & data/i }).click();

        // Bridge mock returns databaseFile: '/mock/settings/gotext.db'
        await expect(page.getByText('/mock/settings/gotext.db')).toBeVisible({ timeout: 5000 });
        await expect(page.getByRole('button', { name: /factory reset/i })).toBeVisible({ timeout: 5000 });
        expect(jsErrors).toHaveLength(0);
    });
});
