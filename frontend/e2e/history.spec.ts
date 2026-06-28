import { expect, test } from '@playwright/test';

// Bridge mock HistoryHandler returns MOCK_E3_ENTRY when ?history-test is in the URL.
// addInitScript(globalThis.go) has no effect in Vite dev mode — the bridge mock uses
// ES module imports, not window.go — so we use a URL parameter instead.
test.describe('History Rail: e2e flows', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/?history-test=1');
        await page.waitForLoadState('networkidle');
    });

    test('history toggle button is visible in the AppBar', async ({ page }) => {
        await expect(page.getByRole('button', { name: /toggle history rail/i })).toBeVisible();
    });

    test('clicking history toggle opens and closes the history rail', async ({ page }) => {
        const toggleBtn = page.getByRole('button', { name: /toggle history rail/i });

        await toggleBtn.click();
        await expect(page.getByRole('complementary', { name: /history/i })).toBeVisible();

        await toggleBtn.click();
        await expect(page.getByRole('complementary', { name: /history/i })).not.toBeVisible();
    });

    test('history rail shows a loaded entry after toggle', async ({ page }) => {
        await page.getByRole('button', { name: /toggle history rail/i }).click();
        await expect(page.getByRole('complementary', { name: /history/i })).toBeVisible();
        await expect(page.getByText('E3 Proofread run')).toBeVisible();
    });

    test('restore button is present for each history entry', async ({ page }) => {
        await page.getByRole('button', { name: /toggle history rail/i }).click();
        await expect(page.getByRole('button', { name: /restore entry e3 proofread run/i })).toBeVisible();
    });

    test('clicking restore does not crash the page', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));

        await page.getByRole('button', { name: /toggle history rail/i }).click();
        await expect(page.getByText('E3 Proofread run')).toBeVisible();
        await page.getByRole('button', { name: /restore entry e3 proofread run/i }).click();

        expect(errors).toHaveLength(0);
    });
});
