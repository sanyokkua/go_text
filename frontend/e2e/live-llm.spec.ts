import { expect, Page, test } from '@playwright/test';

/**
 * Real-LLM end-to-end matrix — LOCAL ONLY (excluded from CI).
 *
 * Runs against Target B: `wails dev` (real Go backend) at http://localhost:34115
 * with real local providers (LM Studio + Ollama). Run with:
 *   cd frontend && npm run verify:live
 *
 * Model choice: use a reliable small instruction model. Ollama `gemma3:1b-it-q4_K_M`
 * or `qwen3:1.7b` (NOT `qwen3:0.6b`, which emits the `[NO_TEXT_PROVIDED]` empty-input
 * sentinel — a model artifact observed during manual gap-audit testing, not a bug).
 *
 * This suite covers NON-DESTRUCTIVE real-inference journeys. Destructive flows
 * (delete provider, factory reset, header CRUD that persists) mutate the real
 * GoTextApp DB/settings and must be run manually against an isolated config dir
 * (back up/restore ~/Library/Application Support/GoTextApp) per plan T45.
 */

const LIVE = (process.env.BASE_URL ?? '').includes('34115');

const boot = async (page: Page): Promise<void> => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1500);
    const hasBridge = await page.evaluate(() => typeof (window as unknown as { go?: unknown }).go !== 'undefined');
    expect(hasBridge, 'window.go bridge must be present (real wails dev backend)').toBe(true);
};

// The output pane body shows a "generating…" spinner while running and "Run to
// preview →" when empty. Poll until neither transient state is present and the
// output has real content, then return the lowercased body text.
const runAndWaitForOutput = async (page: Page, timeout = 120_000): Promise<string> => {
    await page.getByRole('button', { name: /^Run$/i }).click();
    const outputRegion = page.getByText('Output', { exact: false }).first().locator('xpath=ancestor::*[2]');
    await expect
        .poll(
            async () => {
                const t = (await outputRegion.innerText().catch(() => '')).toLowerCase();
                if (t.includes('generating') || t.includes('run to preview')) return 0;
                // strip the header line "output · rendered ⧉ ↺ ✕"
                const body = t.replace(/output[^\n]*\n?/, '').trim();
                return body.length;
            },
            { timeout, intervals: [2000] },
        )
        .toBeGreaterThan(20);
    const full = (await outputRegion.innerText()).toLowerCase();
    return full.replace(/output[^\n]*\n?/, '').trim();
};

test.describe('real-LLM matrix (Target B, local only)', () => {
    test.skip(!LIVE, 'live suite runs only against wails dev at :34115 (npm run verify:live)');

    test('S0 — smoke: real bridge reachable + editor renders', async ({ page }) => {
        test.setTimeout(60_000);
        await boot(page);
        await expect(page.getByText('INPUT', { exact: false }).first()).toBeVisible();
        await expect(page.getByRole('button', { name: /^Run$/i })).toBeVisible();
    });

    test('S1 — editor: real proofread produces corrected, non-sentinel output', async ({ page }) => {
        test.setTimeout(140_000);
        await boot(page);
        await page.locator('textarea').first().fill('teh qick borwn fox jmps over teh lazy dog. their are erors here.');
        await page.getByText('Basic proofreading', { exact: true }).first().click();
        const body = await runAndWaitForOutput(page);
        expect(body).not.toContain('[no_text_provided]');
        expect(body).toContain('fox'); // content preserved
    });

    test('S2 — settings: provider diagnostics pass before Save (connection/models/inference)', async ({ page }) => {
        test.setTimeout(90_000);
        await boot(page);
        await page.getByRole('button', { name: /Open settings/i }).click();
        await page.waitForTimeout(500);
        // select the current provider in the list so the form + diagnostics panel render
        await page.getByText('LM Studio', { exact: true }).first().click();
        await page.waitForTimeout(800);
        await page.getByRole('button', { name: /^Test connection$/i }).click();
        await page.getByRole('button', { name: /^Test models$/i }).click();
        await page.getByRole('button', { name: /^Test inference$/i }).click();
        const panel = page.getByLabel('Provider diagnostics');
        await expect
            .poll(async () => (await panel.innerText()).match(/✓/g)?.length ?? 0, { timeout: 70_000, intervals: [1500] })
            .toBeGreaterThanOrEqual(3);
        expect(await panel.innerText()).not.toMatch(/✕|✗/);
    });

    test('S3 — build a 2-step stack (steps register) & run (real multi-inference)', async ({ page }) => {
        test.setTimeout(160_000);
        await boot(page);
        await page.locator('textarea').first().fill('hey team the caching thing is more or less done, lmk if u want to review b4 we ship tmrw');
        await page
            .getByRole('button', { name: /Build a stack/i })
            .first()
            .click();
        await expect(page.getByText(/Add step/i)).toBeVisible();
        // action rows are buttons whose name may carry a "+1" inference hint, so match loosely;
        // \b after "Professional" excludes the "Professionalize" intent action.
        await page.getByRole('button', { name: /Basic proofreading/ }).click();
        await page.getByRole('button', { name: /Professional\b/ }).click();
        // assert the builder actually registered 2 steps before running
        await expect(page.getByText(/2\s*\/\s*5 steps/i)).toBeVisible();
        const body = await runAndWaitForOutput(page, 140_000);
        expect(body.length).toBeGreaterThan(10);
    });

    test('S4 — appearance: Light/Dark toggle applies to documentElement', async ({ page }) => {
        test.setTimeout(60_000);
        await boot(page);
        await page.getByRole('button', { name: /Open settings/i }).click();
        await page.getByRole('tab', { name: /Appearance/i }).click();
        // theme control is a Radix ToggleGroup → role=radio, aria-labelled
        await page.getByRole('radio', { name: 'Dark theme' }).click();
        await page.waitForTimeout(300);
        expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(true);
        await page.getByRole('radio', { name: 'Light theme' }).click();
        await page.waitForTimeout(300);
        expect(await page.evaluate(() => document.documentElement.classList.contains('dark'))).toBe(false);
    });

    test('S7 — Ollama + gemma3:1b: real proofread works (both-providers coverage)', async ({ page }) => {
        test.setTimeout(160_000);
        await boot(page);
        // switch provider to Ollama
        await page.getByRole('combobox', { name: /Provider/i }).click();
        await page
            .getByRole('option', { name: /^Ollama$/i })
            .first()
            .click();
        await page.waitForTimeout(2500); // auto model discovery
        // switch model to a reliable instruction model (not qwen3:0.6b)
        await page.getByRole('combobox', { name: /Model/i }).click();
        await page.waitForTimeout(500);
        await page
            .getByRole('option', { name: /gemma3:1b/i })
            .first()
            .click()
            .catch(async () => {
                await page
                    .getByRole('option', { name: /qwen3:1\.7b/i })
                    .first()
                    .click();
            });
        await page.waitForTimeout(500);
        await page.locator('textarea').first().fill('teh qick borwn fox jmps over teh lazy dog. their are erors here.');
        await page.getByText('Basic proofreading', { exact: true }).first().click();
        const body = await runAndWaitForOutput(page, 140_000);
        expect(body).not.toContain('[no_text_provided]');
        expect(body).toContain('fox');
    });

    test('S8 — run a seeded stack from Manage (exercises starter-stack fix end-to-end)', async ({ page }) => {
        test.setTimeout(160_000);
        await boot(page);
        await page
            .locator('textarea')
            .first()
            .fill('hey just letting you know the caching work is more or less done, had some invalidation issues but theyre sorted');
        // open Manage grid and Run the first seeded stack
        await page.getByRole('button', { name: /Manage stacks/i }).click();
        await expect(page.getByText('My Stacks', { exact: false }).first()).toBeVisible();
        // Manage card buttons read "▶ Run" (glyph + text), so match loosely
        await page.getByRole('button', { name: /Run/i }).first().click();
        const outputRegion = page.getByText('Output', { exact: false }).first().locator('xpath=ancestor::*[2]');
        await expect
            .poll(
                async () => {
                    const t = (await outputRegion.innerText().catch(() => '')).toLowerCase();
                    if (t.includes('generating') || t.includes('run to preview')) return 0;
                    return t.replace(/output[^\n]*\n?/, '').trim().length;
                },
                { timeout: 140_000, intervals: [2500] },
            )
            .toBeGreaterThan(10);
    });

    test('S5 — history: a run is recorded and restorable', async ({ page }) => {
        test.setTimeout(120_000);
        await boot(page);
        const originalInput = 'this is a quick test of the history rail.';
        await page.locator('textarea').first().fill(originalInput);
        await page.getByText('Basic proofreading', { exact: true }).first().click();
        const originalOutput = await runAndWaitForOutput(page);

        // clear both editors so Restore's effect is unambiguous — otherwise the
        // assertions below could pass even if Restore did nothing.
        await page.locator('textarea').first().fill('');
        await page.getByRole('button', { name: /Clear output/i }).click();

        // historyOpen is a persisted UI preference shared across runs against the same real
        // backend, so don't assume the rail starts closed — only toggle if it isn't open yet.
        const historyRail = page.getByRole('complementary', { name: /history/i });
        if (!(await historyRail.isVisible().catch(() => false))) {
            await page.getByRole('button', { name: /Toggle history rail/i }).click();
        }
        await expect(historyRail).toBeVisible();
        await page
            .getByRole('button', { name: /^Restore entry/i })
            .first()
            .click();
        await page.waitForTimeout(300);

        await expect(page.locator('textarea').first()).toHaveValue(originalInput);
        const outputRegion = page.getByText('Output', { exact: false }).first().locator('xpath=ancestor::*[2]');
        const restoredOutput = (await outputRegion.innerText())
            .toLowerCase()
            .replace(/output[^\n]*\n?/, '')
            .trim();
        expect(restoredOutput.length).toBeGreaterThan(0);
        expect(restoredOutput).toBe(originalOutput);
    });

    test('S6 — main-screen model switch (N1): MODEL dropdown lists discovered models', async ({ page }) => {
        test.setTimeout(60_000);
        await boot(page);
        // switch to Ollama (many local models) so discovery yields > 1 option
        await page.getByRole('combobox', { name: /Provider/i }).click();
        await page
            .getByRole('option', { name: /^Ollama$/i })
            .first()
            .click();
        await page.waitForTimeout(2500); // allow auto-discovery thunk to resolve
        await page.getByRole('combobox', { name: /Model/i }).click();
        await page.waitForTimeout(800);
        const optionCount = await page.getByRole('option').count();
        expect(optionCount, 'AppBar MODEL dropdown should list discovered Ollama models (N1)').toBeGreaterThan(1);
    });

    test('S9 — ⌘K palette: Enter runs an action, Shift+Enter adds it to the stack (real bridge)', async ({ page }) => {
        test.setTimeout(160_000);
        await boot(page);
        await page.locator('textarea').first().fill('teh qick borwn fox jmps over teh lazy dog. their are erors here.');

        // Enter → handlePaletteRun: real inference triggered from the command palette, not the Run button.
        // cmdk filters/highlights by each item's internal `value` (the action id), not its visible
        // label, so hover the target option (cmdk tracks pointer-hover as the highlighted item) rather
        // than typing the label into the search box.
        await page.getByRole('button', { name: /Open command palette/i }).click();
        await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
        await page.getByRole('option', { name: 'Basic proofreading', exact: true }).hover();
        await page.keyboard.press('Enter');
        await expect(page.getByRole('dialog', { name: 'Command palette' })).not.toBeVisible();

        const outputRegion = page.getByText('Output', { exact: false }).first().locator('xpath=ancestor::*[2]');
        await expect
            .poll(
                async () => {
                    const t = (await outputRegion.innerText().catch(() => '')).toLowerCase();
                    if (t.includes('generating') || t.includes('run to preview')) return 0;
                    return t.replace(/output[^\n]*\n?/, '').trim().length;
                },
                { timeout: 140_000, intervals: [2000] },
            )
            .toBeGreaterThan(20);
        const body = (await outputRegion.innerText()).toLowerCase();
        expect(body).not.toContain('[no_text_provided]');

        // Shift+Enter → handlePaletteAddToStack: builder registers the step (in-memory only, non-persisting)
        await page.getByRole('button', { name: /Open command palette/i }).click();
        await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
        await page.getByRole('option', { name: 'Friendly', exact: true }).hover();
        await page.keyboard.press('Shift+Enter');
        await expect(page.getByRole('dialog', { name: 'Command palette' })).not.toBeVisible();
        await expect(page.getByText(/1\s*\/\s*5 steps/i)).toBeVisible();
    });
});
