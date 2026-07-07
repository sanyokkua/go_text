import { expect, Page, test } from '@playwright/test';

async function loadMainView(page: Page): Promise<void> {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
}

test.describe('Last selection persistence', () => {
    test('arming an action from the sidebar persists kind=action', async ({ page }) => {
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));
        await loadMainView(page);

        await page.getByRole('button', { name: 'Summarise', exact: true }).click();
        await page.waitForTimeout(300);

        const lastUpdate = await page.evaluate(
            () => (window as Window & { __lastLastSelectionUpdate?: Record<string, unknown> }).__lastLastSelectionUpdate,
        );
        expect(lastUpdate).toEqual({ kind: 'action', actionId: 'mock-summarise', stackId: '' });

        expect(jsErrors).toHaveLength(0);
    });

    test('arming the mock stack from the sidebar persists kind=stack', async ({ page }) => {
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));
        await loadMainView(page);

        await page.getByRole('button', { name: /Mock Stack/i }).click();
        await page.waitForTimeout(300);

        const lastUpdate = await page.evaluate(
            () => (window as Window & { __lastLastSelectionUpdate?: Record<string, unknown> }).__lastLastSelectionUpdate,
        );
        expect(lastUpdate).toEqual({ kind: 'stack', actionId: '', stackId: 'mock-stack-1' });

        expect(jsErrors).toHaveLength(0);
    });

    test('a persisted valid stack selection is armed on load', async ({ page }) => {
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));
        await page.addInitScript(() => {
            (window as Window & { __bridgeMockLastSelection?: Record<string, unknown> }).__bridgeMockLastSelection = {
                kind: 'stack',
                stackId: 'mock-stack-1',
                actionId: '',
            };
        });
        await loadMainView(page);

        await expect(page.getByRole('button', { name: /Mock Stack/i })).toHaveAttribute('aria-pressed', 'true', { timeout: 5000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('a persisted stack selection pointing at a deleted stack self-heals to none', async ({ page }) => {
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));
        await page.addInitScript(() => {
            (window as Window & { __bridgeMockLastSelection?: Record<string, unknown> }).__bridgeMockLastSelection = {
                kind: 'stack',
                stackId: 'deleted-stack-id',
                actionId: '',
            };
        });
        await loadMainView(page);

        await page.waitForFunction(() => (window as Window & { __lastLastSelectionUpdate?: unknown }).__lastLastSelectionUpdate !== undefined);

        await expect(page.getByRole('button', { name: /Mock Stack/i })).toHaveAttribute('aria-pressed', 'false');

        const lastUpdate = await page.evaluate(
            () => (window as Window & { __lastLastSelectionUpdate?: Record<string, unknown> }).__lastLastSelectionUpdate,
        );
        expect(lastUpdate).toEqual({ kind: 'none', actionId: '', stackId: '' });

        expect(jsErrors).toHaveLength(0);
    });

    test('a persisted action selection pointing at a deleted action self-heals to none', async ({ page }) => {
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));
        await page.addInitScript(() => {
            (window as Window & { __bridgeMockLastSelection?: Record<string, unknown> }).__bridgeMockLastSelection = {
                kind: 'action',
                actionId: 'deleted-action-id',
                stackId: '',
            };
        });
        await loadMainView(page);

        await page.waitForFunction(() => (window as Window & { __lastLastSelectionUpdate?: unknown }).__lastLastSelectionUpdate !== undefined);

        await expect(page.getByRole('button', { name: 'Summarise', exact: true })).toHaveAttribute('aria-pressed', 'false');
        await expect(page.getByRole('button', { name: 'Translate', exact: true })).toHaveAttribute('aria-pressed', 'false');

        const lastUpdate = await page.evaluate(
            () => (window as Window & { __lastLastSelectionUpdate?: Record<string, unknown> }).__lastLastSelectionUpdate,
        );
        expect(lastUpdate).toEqual({ kind: 'none', actionId: '', stackId: '' });

        expect(jsErrors).toHaveLength(0);
    });
});
