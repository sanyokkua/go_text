import { expect, Page, test } from '@playwright/test';

async function loadMainView(page: Page): Promise<void> {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
}

/**
 * Task 8 — text selection is disabled across app chrome and re-enabled only in
 * real inputs and read-only output. Playwright runs Chromium (Blink), which
 * already honors the unprefixed `user-select`, so these specs guard that the
 * rules exist and are correctly scoped. The macOS WKWebView-specific
 * `-webkit-user-select` behavior is confirmed manually with `wails dev`.
 */
test.describe('Text selection', () => {
    test('app chrome (body) is not user-selectable, prefixed for WebKit', async ({ page }) => {
        // Arrange
        await loadMainView(page);

        // Assert – both the standard and WebKit-prefixed properties resolve to none
        const styles = await page.evaluate(() => {
            const cs = getComputedStyle(document.body);
            return { std: cs.userSelect, webkit: cs.getPropertyValue('-webkit-user-select') };
        });
        expect(styles.std).toBe('none');
        expect(styles.webkit).toBe('none');
    });

    test('the input textarea opts back into text selection', async ({ page }) => {
        // Arrange
        await loadMainView(page);
        const textarea = page.locator('textarea').first();
        await expect(textarea).toBeVisible({ timeout: 5000 });

        // Assert – the editor input is selectable, prefixed for WebKit too
        const styles = await textarea.evaluate((el) => {
            const cs = getComputedStyle(el);
            return { std: cs.userSelect, webkit: cs.getPropertyValue('-webkit-user-select') };
        });
        expect(styles.std).toBe('text');
        expect(styles.webkit).toBe('text');
    });

    test('double-clicking a non-input label does not create a text selection', async ({ page }) => {
        // Arrange
        await loadMainView(page);

        // Act – attempt to select the wordmark by double-clicking it
        await page.getByText('GoText', { exact: true }).dblclick();

        // Assert – user-select:none prevents any selection from forming
        const selected = await page.evaluate(() => window.getSelection()?.toString() ?? '');
        expect(selected).toBe('');
    });
});
