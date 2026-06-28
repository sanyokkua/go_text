import { test, expect, Page } from '@playwright/test';

async function loadEditor(page: Page): Promise<void> {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
}

test.describe('Editor UI interactions', () => {
    test('sidebar is expanded by default and shows action buttons for the default category', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadEditor(page);

        // Assert – sidebar is expanded and shows the first category's actions (Writing tab by default).
        // Translate is in the Language category tab, so it is not visible until that tab is clicked.
        await expect(page.getByRole('complementary', { name: /actions sidebar$/i })).toBeVisible({ timeout: 5000 });
        await expect(page.getByRole('button', { name: /summarise/i })).toBeVisible({ timeout: 5000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('collapsing the sidebar hides it entirely (no icon strip)', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadEditor(page);

        // Sidebar starts expanded.
        await expect(page.getByRole('complementary', { name: 'Actions sidebar' })).toBeVisible({ timeout: 5000 });

        // Act – collapse
        await page.getByRole('button', { name: /collapse sidebar/i }).click();

        // Assert – the sidebar is fully removed; no collapsed icon strip remains.
        await expect(page.getByRole('complementary', { name: 'Actions sidebar' })).toHaveCount(0);
        await expect(page.getByRole('complementary', { name: /collapsed/i })).toHaveCount(0);

        // Re-expanding restores it.
        await page.getByRole('button', { name: /expand sidebar/i }).click();
        await expect(page.getByRole('complementary', { name: 'Actions sidebar' })).toBeVisible({ timeout: 5000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('expanding the sidebar after collapse restores full sidebar', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadEditor(page);

        // Act
        await page.getByRole('button', { name: /collapse sidebar/i }).click();
        await expect(page.getByRole('button', { name: /expand sidebar/i })).toBeVisible({ timeout: 3000 });
        await page.getByRole('button', { name: /expand sidebar/i }).click();

        // Assert – full sidebar is back
        await expect(page.getByRole('complementary', { name: /actions sidebar$/i })).toBeVisible({ timeout: 5000 });
        await expect(page.getByRole('button', { name: /summarise/i })).toBeVisible({ timeout: 5000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('input pane has a textarea that accepts text', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadEditor(page);

        const input = page.getByLabel('Input text');
        await expect(input).toBeVisible({ timeout: 5000 });

        // Act
        await input.fill('Hello world');

        // Assert
        await expect(input).toHaveValue('Hello world');

        expect(jsErrors).toHaveLength(0);
    });

    test('Clear input button is disabled when textarea is empty', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadEditor(page);

        // Assert
        const clearBtn = page.getByRole('button', { name: /clear input/i });
        await expect(clearBtn).toBeVisible({ timeout: 5000 });
        await expect(clearBtn).toBeDisabled();

        expect(jsErrors).toHaveLength(0);
    });

    test('Clear input button becomes enabled after typing and clears the textarea', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadEditor(page);

        const input = page.getByLabel('Input text');
        await input.fill('Some text');

        const clearBtn = page.getByRole('button', { name: /clear input/i });
        await expect(clearBtn).toBeEnabled({ timeout: 3000 });

        // Act
        await clearBtn.click();

        // Assert
        await expect(input).toHaveValue('');

        expect(jsErrors).toHaveLength(0);
    });

    test('arming an action and running it produces output text', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadEditor(page);

        await page.getByLabel('Input text').fill('Test input');

        // Arm the Summarise action (aria-pressed toggles to true)
        await page.getByRole('button', { name: /summarise/i }).click();

        // Act – run via the Run button in the RunBar
        await page.getByRole('button', { name: /^run$/i }).click();

        // Assert – bridge mock returns "Mock output text."
        await expect(page.getByText('Mock output text.')).toBeVisible({ timeout: 10000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('output pane shows placeholder before any run', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadEditor(page);

        // Assert – OutputPane shows the empty state hint
        await expect(page.getByText(/run to preview/i)).toBeVisible({ timeout: 5000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('Copy output button is disabled before a run', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadEditor(page);

        // Assert
        await expect(page.getByRole('button', { name: /copy output/i })).toBeDisabled({ timeout: 5000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('switching view to Source shows the raw output text after a run', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadEditor(page);
        await page.getByLabel('Input text').fill('Test input');
        await page.getByRole('button', { name: /summarise/i }).click();
        await page.getByRole('button', { name: /^run$/i }).click();
        await expect(page.getByText('Mock output text.')).toBeVisible({ timeout: 10000 });

        // Act – switch view using OutputPane's own view buttons (aria-label based)
        await page.getByRole('button', { name: /source view/i }).click();

        // Assert – output is inside a <pre> element (source mode)
        await expect(page.locator('pre')).toHaveText(/mock output text\./i, { timeout: 5000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('history rail is hidden by default and toggles open', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadEditor(page);

        // History complementary region should not exist yet
        const historyRegion = page.getByRole('complementary', { name: /history/i });
        await expect(historyRegion).not.toBeVisible();

        // Act – open
        await page.getByRole('button', { name: /toggle history rail/i }).click();

        // Assert – rail appears
        await expect(historyRegion).toBeVisible({ timeout: 5000 });

        // Act – close
        await page.getByRole('button', { name: /toggle history rail/i }).click();

        // Assert – rail hidden
        await expect(historyRegion).not.toBeVisible({ timeout: 3000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('history rail shows seeded entry when URL param is set', async ({ page }) => {
        // Arrange — URL param activates the bridge mock with a seeded history entry.
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await page.goto('/?history-test=1');
        await page.waitForLoadState('networkidle');

        // Act – open history rail
        await page.getByRole('button', { name: /toggle history rail/i }).click();

        // Assert – mock entry title is visible
        await expect(page.getByText(/E3 Proofread run/i)).toBeVisible({ timeout: 8000 });

        expect(jsErrors).toHaveLength(0);
    });
});
