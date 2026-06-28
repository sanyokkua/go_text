import { test, expect, Page } from '@playwright/test';

async function loadMainView(page: Page): Promise<void> {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
}

test.describe('AppBar', () => {
    test('renders the GoText wordmark', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadMainView(page);

        // Assert
        await expect(page.getByText('GoText')).toBeVisible({ timeout: 5000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('AppBar header does not use a hardcoded dark-teal background color', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadMainView(page);

        // Assert – the bar uses var(--surface), not #00796b
        const bg = await page.evaluate(() => {
            const header = document.querySelector('header');
            if (!header) return '';
            return getComputedStyle(header).backgroundColor;
        });
        // #00796b is rgb(0, 121, 107)
        expect(bg).not.toBe('rgb(0, 121, 107)');
        expect(bg.length).toBeGreaterThan(0);

        expect(jsErrors).toHaveLength(0);
    });

    test('sidebar toggle button is visible and starts as expanded (pressed=true)', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadMainView(page);

        // Assert – sidebar starts expanded, so the button label is "Collapse sidebar"
        const toggleBtn = page.getByRole('button', { name: /collapse sidebar/i });
        await expect(toggleBtn).toBeVisible({ timeout: 5000 });
        await expect(toggleBtn).toHaveAttribute('aria-pressed', 'true');

        expect(jsErrors).toHaveLength(0);
    });

    test('clicking sidebar toggle collapses then re-expands the sidebar', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadMainView(page);

        // Act – collapse
        await page.getByRole('button', { name: /collapse sidebar/i }).click();

        // Assert collapsed
        await expect(page.getByRole('button', { name: /expand sidebar/i })).toBeVisible({ timeout: 5000 });
        const collapsedBtn = page.getByRole('button', { name: /expand sidebar/i });
        await expect(collapsedBtn).toHaveAttribute('aria-pressed', 'false');

        // Act – expand again
        await collapsedBtn.click();

        // Assert expanded
        await expect(page.getByRole('button', { name: /collapse sidebar/i })).toBeVisible({ timeout: 5000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('Format segmented control has Plain and MD items', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadMainView(page);

        // Assert – Segmented uses ToggleGroup.Item which renders as role="radio"
        await expect(page.getByRole('radio', { name: 'Plain' })).toBeVisible({ timeout: 5000 });
        await expect(page.getByRole('radio', { name: 'MD' })).toBeVisible({ timeout: 5000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('View Mode segmented control has Preview, Source, and Diff items', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadMainView(page);

        // Assert
        await expect(page.getByRole('radio', { name: 'Preview' })).toBeVisible({ timeout: 5000 });
        await expect(page.getByRole('radio', { name: 'Source' })).toBeVisible({ timeout: 5000 });
        await expect(page.getByRole('radio', { name: 'Diff' })).toBeVisible({ timeout: 5000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('Layout segmented control has Side and Stacked items', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadMainView(page);

        // Assert – labels include symbols but query by partial text
        await expect(page.getByRole('radio', { name: /side/i })).toBeVisible({ timeout: 5000 });
        await expect(page.getByRole('radio', { name: /stacked/i })).toBeVisible({ timeout: 5000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('clicking Layout "Stacked" item updates its aria-checked state', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadMainView(page);

        // Act
        await page.getByRole('radio', { name: /stacked/i }).click();

        // Assert – Radix ToggleGroup sets aria-checked on the active item
        await expect(page.getByRole('radio', { name: /stacked/i })).toHaveAttribute('aria-checked', 'true', { timeout: 3000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('history toggle button is present and toggles aria-pressed', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadMainView(page);

        const historyBtn = page.getByRole('button', { name: /toggle history rail/i });
        await expect(historyBtn).toBeVisible({ timeout: 5000 });

        const initialPressed = await historyBtn.getAttribute('aria-pressed');

        // Act – toggle
        await historyBtn.click();

        // Assert – state changed
        const newPressed = await historyBtn.getAttribute('aria-pressed');
        expect(newPressed).not.toBe(initialPressed);

        expect(jsErrors).toHaveLength(0);
    });

    test('settings button is present and navigates to settings view', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadMainView(page);

        // Act
        await page.getByRole('button', { name: /open settings/i }).click();

        // Assert – settings view is shown (the button label changes to "Close")
        await expect(page.getByRole('button', { name: /^close$/i })).toBeVisible({ timeout: 5000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('About and info button navigates to the info view', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadMainView(page);

        // Act
        await page.getByRole('button', { name: /about and info/i }).click();

        // Assert – no longer on main view; back button appears
        await expect(page.getByRole('button', { name: /back to editor/i })).toBeVisible({ timeout: 5000 });

        expect(jsErrors).toHaveLength(0);
    });
});
