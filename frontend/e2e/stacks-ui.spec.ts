import { test, expect, Page } from '@playwright/test';

async function loadEditor(page: Page): Promise<void> {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
}

test.describe('Stack building UI', () => {
    test('"My Stacks" section header and Build button are always visible in the sidebar', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadEditor(page);

        // Assert – the "My Stacks" heading is always rendered and the build button is present.
        // Saved stacks are not loaded on startup (no initial fetch), so stack items are not visible yet.
        await expect(page.getByText('My Stacks')).toBeVisible({ timeout: 5000 });
        await expect(page.getByRole('complementary', { name: 'Actions sidebar' }).getByRole('button', { name: /build a stack/i })).toBeVisible({ timeout: 5000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('"Manage ›" button appears after a stack is saved', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadEditor(page);

        // Build and save a stack so the Manage button renders
        await page.getByRole('complementary', { name: 'Actions sidebar' }).getByRole('button', { name: /build a stack/i }).click();
        await page.getByRole('button', { name: /summarise/i }).click();
        await page.getByRole('button', { name: /save stack/i }).click();
        const nameInput = page.getByLabel('Name');
        await expect(nameInput).toBeVisible({ timeout: 5000 });
        await nameInput.fill('My New Stack');
        await page.getByRole('button', { name: /^save$/i }).click();

        // Assert – after saving, the Manage button should now be visible
        await expect(page.getByRole('button', { name: /manage stacks/i })).toBeVisible({ timeout: 8000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('"Build a stack" button enters build mode', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadEditor(page);

        // Act
        await page.getByRole('complementary', { name: 'Actions sidebar' }).getByRole('button', { name: /build a stack/i }).click();

        // Assert – build mode hint appears in sidebar
        await expect(page.getByText(/click to add a step/i)).toBeVisible({ timeout: 5000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('clicking an action in build mode adds it as a step', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadEditor(page);
        await page.getByRole('complementary', { name: 'Actions sidebar' }).getByRole('button', { name: /build a stack/i }).click();
        await expect(page.getByText(/click to add a step/i)).toBeVisible({ timeout: 5000 });

        // Act – click the Summarise action
        await page.getByRole('button', { name: /summarise/i }).click();

        // Assert – StackBuilderBar's Save button becomes enabled (step count > 0)
        const saveBtn = page.getByRole('button', { name: /save stack/i });
        await expect(saveBtn).toBeEnabled({ timeout: 5000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('Save stack button opens the save dialog', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadEditor(page);
        await page.getByRole('complementary', { name: 'Actions sidebar' }).getByRole('button', { name: /build a stack/i }).click();
        await page.getByRole('button', { name: /summarise/i }).click();
        await expect(page.getByRole('button', { name: /save stack/i })).toBeEnabled({ timeout: 5000 });

        // Act
        await page.getByRole('button', { name: /save stack/i }).click();

        // Assert – the save dialog opens with a name input
        await expect(page.getByLabel('Name')).toBeVisible({ timeout: 5000 });
        await expect(page.getByText(/save custom stack/i)).toBeVisible({ timeout: 5000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('Save stack dialog Cancel button closes the dialog without saving', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadEditor(page);
        await page.getByRole('complementary', { name: 'Actions sidebar' }).getByRole('button', { name: /build a stack/i }).click();
        await page.getByRole('button', { name: /summarise/i }).click();
        await page.getByRole('button', { name: /save stack/i }).click();
        await expect(page.getByLabel('Name')).toBeVisible({ timeout: 5000 });

        // Act
        await page.getByRole('button', { name: /^cancel$/i }).click();

        // Assert – dialog is gone; build mode is still active (hint still visible)
        await expect(page.getByLabel('Name')).not.toBeVisible({ timeout: 3000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('completing the save dialog flow exits build mode', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadEditor(page);
        await page.getByRole('complementary', { name: 'Actions sidebar' }).getByRole('button', { name: /build a stack/i }).click();
        await page.getByRole('button', { name: /summarise/i }).click();
        await page.getByRole('button', { name: /save stack/i }).click();

        const nameInput = page.getByLabel('Name');
        await expect(nameInput).toBeVisible({ timeout: 5000 });

        // Act
        await nameInput.fill('My Custom Stack');
        await page.getByRole('button', { name: /^save$/i }).click();

        // Assert – dialog closes and build mode hint disappears
        await expect(nameInput).not.toBeVisible({ timeout: 5000 });
        await expect(page.getByText(/click to add a step/i)).not.toBeVisible({ timeout: 5000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('Cancel build button exits build mode without saving', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadEditor(page);
        await page.getByRole('complementary', { name: 'Actions sidebar' }).getByRole('button', { name: /build a stack/i }).click();
        await expect(page.getByText(/click to add a step/i)).toBeVisible({ timeout: 5000 });

        // Act
        await page.getByRole('button', { name: /cancel build/i }).click();

        // Assert – build mode hint disappears; normal editor state returns
        await expect(page.getByText(/click to add a step/i)).not.toBeVisible({ timeout: 5000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('"Manage ›" button navigates to the stacks view after a stack is saved', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadEditor(page);

        // Save a stack first so the Manage button renders
        await page.getByRole('complementary', { name: 'Actions sidebar' }).getByRole('button', { name: /build a stack/i }).click();
        await page.getByRole('button', { name: /summarise/i }).click();
        await page.getByRole('button', { name: /save stack/i }).click();
        const nameInput = page.getByLabel('Name');
        await expect(nameInput).toBeVisible({ timeout: 5000 });
        await nameInput.fill('Navigate Test Stack');
        await page.getByRole('button', { name: /^save$/i }).click();

        const manageBtn = page.getByRole('button', { name: /manage stacks/i });
        await expect(manageBtn).toBeVisible({ timeout: 8000 });

        // Act
        await manageBtn.click();

        // Assert – the app navigated away from main editor view;
        // The stacks view renders its own "Back to Editor" button alongside the AppBar's
        // "Back to editor" button — use first() to avoid strict-mode violation.
        await expect(page.getByRole('button', { name: /back to editor/i }).first()).toBeVisible({ timeout: 5000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('Save stack button is disabled before any step is added', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadEditor(page);
        await page.getByRole('complementary', { name: 'Actions sidebar' }).getByRole('button', { name: /build a stack/i }).click();
        await expect(page.getByText(/click to add a step/i)).toBeVisible({ timeout: 5000 });

        // Assert – no steps added yet
        await expect(page.getByRole('button', { name: /save stack/i })).toBeDisabled({ timeout: 3000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('two different actions can be added as steps in build mode', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadEditor(page);
        await page.getByRole('complementary', { name: 'Actions sidebar' }).getByRole('button', { name: /build a stack/i }).click();
        await expect(page.getByText(/click to add a step/i)).toBeVisible({ timeout: 5000 });

        // Act – add Summarise then add Translate. All families render as scrollable
        // sections in the sidebar now (no category tabs), so both actions are directly
        // clickable from the sidebar list.
        const sidebar = page.getByRole('complementary', { name: 'Actions sidebar' });
        await sidebar.getByRole('button', { name: /summarise/i }).click();
        await sidebar.getByRole('button', { name: /translate/i }).click();

        // Assert – Save button is still enabled (2 steps, 2 inferences, within caps)
        await expect(page.getByRole('button', { name: /save stack/i })).toBeEnabled({ timeout: 5000 });

        expect(jsErrors).toHaveLength(0);
    });
});
