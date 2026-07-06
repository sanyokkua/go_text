import { expect, Page, test } from '@playwright/test';

async function openSettings(page: Page): Promise<void> {
    await page.getByRole('button', { name: /open settings/i }).click();
    // Tabs.tsx (the shared Radix Tabs primitive) renders aria-label="Navigation tabs" —
    // not "Settings sections" as an older sibling spec assumes; that spec's selector
    // predates the T82 Radix Tabs migration and is stale independent of this test.
    await page.waitForSelector('[role="tablist"][aria-label="Navigation tabs"]', { timeout: 8000 });
}

test.describe('Provider deletion resyncs the AppBar picker (T87)', () => {
    test('deleting the current provider resyncs the AppBar without a reload', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await page.goto('/?multi-provider-test');
        await page.waitForLoadState('networkidle');

        // Sanity: AppBar starts on the current provider ("Mock Provider")
        await expect(page.locator('[aria-label="Provider"]')).toContainText('Mock Provider');

        await openSettings(page);
        await page.getByRole('tab', { name: /^providers$/i }).click();

        // Select "Mock Provider" in the provider list. It is already the current
        // provider, so ProviderList renders its accessible name with a "(current)"
        // suffix — use a substring match rather than an exact one.
        await page.getByRole('button', { name: /mock provider/i }).click();

        // No "Set as current" button should be shown for the already-current provider.
        await expect(page.getByRole('button', { name: /set as current/i })).not.toBeVisible();

        // Act — delete it and confirm in the AlertDialog.
        await page.getByRole('button', { name: 'Delete…' }).click();
        await page.getByRole('button', { name: 'Delete', exact: true }).click();

        // The AppBar's provider trigger is only rendered on the main editor screen,
        // not while the Settings panel covers it — close Settings to reveal it again.
        // This does not reload the page, so it doesn't undermine the "no reload" assertion.
        await page.getByRole('button', { name: /^close$/i }).click();

        // Assert — AppBar now shows the remaining provider, WITHOUT a page reload.
        await expect(page.locator('[aria-label="Provider"]')).toContainText('Backup LLM', { timeout: 5000 });
        await expect(page.locator('[aria-label="Provider"]')).not.toContainText('Mock Provider', { timeout: 1000 });

        expect(jsErrors).toHaveLength(0);
    });
});
