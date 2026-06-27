import { expect, test } from '@playwright/test';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = path.resolve(__dirname, '../.tmp/playwright-results');

function screenshotPath(name: string) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
    return path.join(SCREENSHOT_DIR, `smoke-${name}.png`);
}

// ── T00: Basic load (preserved) ───────────────────────────────────────────────

test.describe('Smoke: App loads without crash', () => {
    test('root route loads and body is non-empty', async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        const bodyText = await page.locator('body').innerText();
        expect(bodyText.trim().length).toBeGreaterThan(0);
    });

    test('page has no JavaScript errors on load', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));
        page.on('console', (msg) => {
            if (msg.type() === 'error') errors.push(msg.text());
        });
        await page.goto('/');
        await page.waitForLoadState('networkidle');
        expect(errors, `JS errors on load: ${errors.join('; ')}`).toHaveLength(0);
    });
});

// ── E1: Run single action ─────────────────────────────────────────────────────

test.describe('E1: Run a single action end-to-end', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('types input, arms Summarise action, clicks Run, output appears', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));

        // 1 — type input
        const inputArea = page.getByRole('textbox', { name: /input text/i });
        await inputArea.fill('Hello Playwright E1 test');

        // 2 — expand sidebar if collapsed
        const expandBtn = page.getByRole('button', { name: /expand sidebar/i });
        if (await expandBtn.isVisible()) await expandBtn.click();

        // 3 — arm the Summarise action (from bridge mock action catalog)
        const summariseBtn = page.getByRole('button', { name: /summarise/i });
        await summariseBtn.click();
        await expect(summariseBtn).toHaveAttribute('aria-pressed', 'true');

        // 4 — click Run
        await page.getByRole('button', { name: /^run$/i }).click();

        // 5 — output pane should contain the mock output text
        const outputContent = page.locator('.markdown-body, [aria-label="source view"]').first();
        await expect(outputContent).toContainText('Mock output text.', { timeout: 10_000 });

        await page.screenshot({ path: screenshotPath('e1-run-single') });
        expect(errors).toHaveLength(0);
    });
});

// ── E3: History restore ───────────────────────────────────────────────────────

test.describe('E3: History restore', () => {
    const MOCK_ENTRY = {
        id: 'e3-entry-1',
        createdAt: Math.floor(Date.now() / 1000) - 60,
        kind: 'single',
        title: 'E3 Proofread run',
        inputText: 'E3 input text',
        outputText: 'E3 output text',
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

    test.beforeEach(async ({ page }) => {
        await page.addInitScript((entry) => {
            const ok = (d: unknown) => Promise.resolve({ data: d, error: undefined });
            const historyHandler = new Proxy(
                {},
                {
                    get(_: unknown, method: string) {
                        if (method === 'ListHistory') return () => ok([entry]);
                        if (method === 'GetHistoryEntry') return () => ok(entry);
                        if (method === 'DeleteHistoryEntry') return () => ok(null);
                        if (method === 'ClearHistory') return () => ok(null);
                        return () => ok(null);
                    },
                },
            );
            (globalThis as unknown as Record<string, unknown>)['go'] = new Proxy(
                {},
                {
                    get() {
                        return new Proxy(
                            {},
                            {
                                get() {
                                    return historyHandler;
                                },
                            },
                        );
                    },
                },
            );
        }, MOCK_ENTRY);

        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('opening history rail and clicking Restore populates editor panes', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));

        // 1 — open history rail
        await page.getByRole('button', { name: /toggle history rail/i }).click();
        await expect(page.getByRole('complementary', { name: /history/i })).toBeVisible();
        await expect(page.getByText('E3 Proofread run')).toBeVisible();

        // 2 — click Restore
        await page.getByRole('button', { name: /restore entry e3 proofread run/i }).click();

        // 3 — input pane should now show the restored input text
        const inputArea = page.getByRole('textbox', { name: /input text/i });
        await expect(inputArea).toHaveValue('E3 input text', { timeout: 5_000 });

        await page.screenshot({ path: screenshotPath('e3-history-restore') });
        expect(errors).toHaveLength(0);
    });
});

// ── E5: Prompt Inspector ──────────────────────────────────────────────────────

test.describe('E5: Prompt Inspector opens in Info view', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/');
        await page.waitForLoadState('networkidle');
    });

    test('navigating to Info and clicking an action opens the inspector panel', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));

        // 1 — open Info view
        await page.getByRole('button', { name: /about and info/i }).click();
        await expect(page.getByRole('textbox', { name: /filter actions/i })).toBeVisible({ timeout: 5_000 });

        // 2 — click first recognisable action in the catalog (bridge mock: Summarise or Translate)
        const actionItem = page.getByRole('button', { name: /summarise|translate|proofread/i }).first();
        await actionItem.click();

        // 3 — PromptInspector section should appear
        const inspector = page.locator('[class*="inspector"], [class*="prompt"]').first();
        await expect(inspector).toBeVisible({ timeout: 8_000 });

        await page.screenshot({ path: screenshotPath('e5-prompt-inspector') });
        expect(errors).toHaveLength(0);
    });
});

// ── E9: Untrusted output stays inert ─────────────────────────────────────────

test.describe('E9: Untrusted model output is inert', () => {
    test('script tags injected via ProcessPromptChain response are not executed', async ({ page }) => {
        // Inject a mock that returns XSS payload as the chain output
        await page.addInitScript(() => {
            const xssPayload = '<script>window.__xssFired = true;</script> Safe text';
            const ok = (d: unknown) => Promise.resolve({ data: d, error: undefined });
            const actionHandler = new Proxy(
                {},
                {
                    get(_: unknown, method: string) {
                        if (method === 'ProcessPromptChain') {
                            return () => ok({ steps: [], finalText: xssPayload });
                        }
                        return () => ok(null);
                    },
                },
            );
            (globalThis as unknown as Record<string, unknown>)['go'] = new Proxy(
                {},
                {
                    get() {
                        return new Proxy(
                            {},
                            {
                                get() {
                                    return actionHandler;
                                },
                            },
                        );
                    },
                },
            );
        });

        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Arm Summarise and run
        const expandBtn = page.getByRole('button', { name: /expand sidebar/i });
        if (await expandBtn.isVisible()) await expandBtn.click();

        await page.getByRole('textbox', { name: /input text/i }).fill('test');
        await page.getByRole('button', { name: /summarise/i }).click();
        await page.getByRole('button', { name: /^run$/i }).click();

        // Wait for output (bridge mock resolves immediately)
        await page.waitForTimeout(2_000);

        // Verify XSS did not fire
        const xssFired = await page.evaluate(() => !!(globalThis as unknown as Record<string, unknown>)['__xssFired']);
        expect(xssFired).toBe(false);

        await page.screenshot({ path: screenshotPath('e9-xss-inert') });
        expect(errors).toHaveLength(0);
    });

    test('javascript: links from model output do not have an href attribute', async ({ page }) => {
        // Inject markdown with a javascript: link
        await page.addInitScript(() => {
            const markdownOutput = '[evil link](javascript:alert(1))\n\nSafe paragraph.';
            const ok = (d: unknown) => Promise.resolve({ data: d, error: undefined });
            const actionHandler = new Proxy(
                {},
                {
                    get(_: unknown, method: string) {
                        if (method === 'ProcessPromptChain') {
                            return () => ok({ steps: [], finalText: markdownOutput });
                        }
                        return () => ok(null);
                    },
                },
            );
            (globalThis as unknown as Record<string, unknown>)['go'] = new Proxy(
                {},
                {
                    get() {
                        return new Proxy(
                            {},
                            {
                                get() {
                                    return actionHandler;
                                },
                            },
                        );
                    },
                },
            );
        });

        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));

        await page.goto('/');
        await page.waitForLoadState('networkidle');

        const expandBtn = page.getByRole('button', { name: /expand sidebar/i });
        if (await expandBtn.isVisible()) await expandBtn.click();

        await page.getByRole('textbox', { name: /input text/i }).fill('test');
        await page.getByRole('button', { name: /summarise/i }).click();
        await page.getByRole('button', { name: /^run$/i }).click();

        // Wait for rendering
        await page.waitForTimeout(2_000);

        // No link should have a javascript: href
        const badLinks = await page.$$eval('a[href]', (els) => els.filter((el) => el.getAttribute('href')?.startsWith('javascript:')).length);
        expect(badLinks).toBe(0);

        await page.screenshot({ path: screenshotPath('e9-link-inert') });
        expect(errors).toHaveLength(0);
    });
});
