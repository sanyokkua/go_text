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

        // 5 — output pane: .markdown-body appears after run (absent until output is set)
        await expect(page.locator('.markdown-body')).toContainText('Mock output text.', { timeout: 10_000 });

        await page.screenshot({ path: screenshotPath('e1-run-single') });
        expect(errors).toHaveLength(0);
    });
});

// ── E3: History restore ───────────────────────────────────────────────────────

test.describe('E3: History restore', () => {
    // Bridge mock HistoryHandler returns MOCK_E3_ENTRY when ?history-test is in the URL.
    // addInitScript(globalThis.go) has no effect in Vite dev mode — the bridge mock uses
    // ES module imports, not window.go — so we use a URL parameter instead.
    test.beforeEach(async ({ page }) => {
        await page.goto('/?history-test=1');
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
        // Info view opens on "Guide" tab by default; switch to "Actions & Stacks" tab for the catalog
        await page.getByRole('tab', { name: /actions & stacks/i }).click();
        await expect(page.getByRole('textbox', { name: /filter actions/i })).toBeVisible({ timeout: 5_000 });

        // 2 — click first recognisable action in the catalog (bridge mock: Summarise or Translate)
        const actionItem = page.getByRole('button', { name: /summarise|translate|proofread/i }).first();
        await actionItem.click();

        // 3 — PromptInspector section should appear
        const inspector = page.locator('[class*="inspector"], [class*="prompt"]').first();
        await expect(inspector).toBeVisible({ timeout: 8_000 });

        // 4 — family chip is visible with the mock's title-cased family value
        const familyChip = page.locator('[class*="familyChip"]').first();
        await expect(familyChip).toBeVisible();
        await expect(familyChip).toHaveText('Single');

        // 5 — "Copy all" composes the full prompt and confirms via a success toast
        await page.getByRole('button', { name: 'Copy all' }).click();
        await expect(page.getByText('Copied full prompt to clipboard').first()).toBeVisible({ timeout: 5_000 });

        await page.screenshot({ path: screenshotPath('e5-prompt-inspector') });
        expect(errors).toHaveLength(0);
    });
});

// ── E9: Untrusted output stays inert ─────────────────────────────────────────

test.describe('E9: Untrusted model output is inert', () => {
    // Bridge mock ActionHandler returns an XSS payload when ?xss is in the URL.
    // addInitScript(globalThis.go) has no effect in Vite dev mode — the bridge mock uses
    // ES module imports, not window.go — so we use a URL parameter instead.

    test('script tags injected via ProcessPromptChain response are not executed', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));

        await page.goto('/?xss=1');
        await page.waitForLoadState('networkidle');

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
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));

        await page.goto('/?xss=1');
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

// ── E7: Markdown rendering ────────────────────────────────────────────────────

test.describe('E7: Markdown output renders correctly', () => {
    // Bridge mock ActionHandler returns a GFM payload (table + code + mermaid) when ?markdown is in the URL.
    test.beforeEach(async ({ page }) => {
        await page.goto('/?markdown=1');
        await page.waitForLoadState('networkidle');
    });

    test('table and fenced code block render in the output after running with Markdown payload', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));

        const expandBtn = page.getByRole('button', { name: /expand sidebar/i });
        if (await expandBtn.isVisible()) await expandBtn.click();

        await page.getByRole('textbox', { name: /input text/i }).fill('test');
        await page.getByRole('button', { name: /summarise/i }).click();
        await page.getByRole('button', { name: /^run$/i }).click();

        await expect(page.locator('.markdown-body')).toBeVisible({ timeout: 10_000 });
        await expect(page.locator('.markdown-body table')).toBeVisible();
        await expect(page.locator('.markdown-body pre code')).toBeVisible();

        await page.screenshot({ path: screenshotPath('e7-markdown-render') });
        expect(errors).toHaveLength(0);
    });
});

// ── E8: Markdown theme consistency ────────────────────────────────────────────

test.describe('E8: Markdown output re-themes without breaking layout', () => {
    test('switching OS to dark mode keeps Markdown table and code visible', async ({ page }) => {
        const errors: string[] = [];
        page.on('pageerror', (err) => errors.push(err.message));

        await page.emulateMedia({ colorScheme: 'light' });
        await page.goto('/?markdown=1');
        await page.waitForLoadState('networkidle');

        const expandBtn = page.getByRole('button', { name: /expand sidebar/i });
        if (await expandBtn.isVisible()) await expandBtn.click();

        await page.getByRole('textbox', { name: /input text/i }).fill('test');
        await page.getByRole('button', { name: /summarise/i }).click();
        await page.getByRole('button', { name: /^run$/i }).click();

        await expect(page.locator('.markdown-body table')).toBeVisible({ timeout: 10_000 });

        // Flip OS to dark — auto-mode should follow
        await page.emulateMedia({ colorScheme: 'dark' });
        await page.waitForFunction(() => document.documentElement.classList.contains('dark'), { timeout: 3_000 });

        // Markdown must still be visible with no console errors
        await expect(page.locator('.markdown-body table')).toBeVisible();
        await page.screenshot({ path: screenshotPath('e8-markdown-dark') });
        expect(errors).toHaveLength(0);
    });
});
