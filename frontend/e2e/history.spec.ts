import { expect, test } from '@playwright/test';

const MOCK_ENTRY = {
    id: 'e2e-entry-1',
    createdAt: Math.floor(Date.now() / 1000) - 300,
    kind: 'single',
    title: 'Proofread run',
    inputText: 'e2e input text',
    outputText: 'e2e output text',
    applied: [{ id: 'proofread', name: 'Proofread', category: 'Writing' }],
    providerName: 'Local',
    model: 'llama',
    inputLang: 'en',
    outputLang: 'en',
    format: 'plain',
    durationMs: 800,
    inferences: 1,
    status: 'success',
    errorCode: '',
    failedIndex: -1,
};

test.describe('History Rail: e2e flows', () => {
    test.beforeEach(async ({ page }) => {
        await page.addInitScript((entry) => {
            const ok = (d: unknown) => Promise.resolve({ data: d, error: undefined });
            const historyHandler = new Proxy({}, {
                get(_, method) {
                    if (method === 'ListHistory') return () => ok([entry]);
                    if (method === 'GetHistoryEntry') return () => ok(entry);
                    if (method === 'DeleteHistoryEntry') return () => ok(null);
                    if (method === 'ClearHistory') return () => ok(null);
                    return () => ok(null);
                },
            });
            (globalThis as unknown as Record<string, unknown>)['go'] = new Proxy({}, {
                get() {
                    return new Proxy({}, { get() { return historyHandler; } });
                },
            });
        }, MOCK_ENTRY);

        await page.goto('/');
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
        await expect(page.getByText('Proofread run')).toBeVisible();
    });

    test('restore button is present for each history entry', async ({ page }) => {
        await page.getByRole('button', { name: /toggle history rail/i }).click();
        await expect(page.getByRole('button', { name: /restore entry proofread run/i })).toBeVisible();
    });

    test('clicking restore does not crash the page', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));

        await page.getByRole('button', { name: /toggle history rail/i }).click();
        await expect(page.getByText('Proofread run')).toBeVisible();
        await page.getByRole('button', { name: /restore entry proofread run/i }).click();

        expect(errors).toHaveLength(0);
    });
});
