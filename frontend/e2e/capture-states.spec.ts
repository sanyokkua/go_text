import { test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// Ground-truth capture: drives the running app (Target A bridge-mock at :5173, or
// Target B real backend at :34115 via BASE_URL) through every mockup-relevant state
// and screenshots it at a wide desktop width in light + dark. Not a gate — a capture
// tool for the mockup-gap audit. Run: BASE_URL=http://localhost:34115 npx playwright test e2e/capture-states.spec.ts
const WAILS_RUNTIME_STUB = `(function(){if(window.runtime)return;var n=function(){};var r=function(){return function(){}};window.runtime={LogDebug:n,LogInfo:n,LogWarning:n,LogError:n,LogFatal:n,LogTrace:n,LogPrint:n,EventsOnMultiple:r,EventsOff:n,EventsOffAll:n,EventsEmit:n,WindowReload:n};})();`;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.resolve(__dirname, '../.tmp/capture-states');
const THEMES = ['light', 'dark'] as const;

const LIVE = (process.env.BASE_URL ?? '').includes('34115');

for (const theme of THEMES) {
    test(`capture all states — ${theme}`, async ({ page }) => {
        test.skip(!LIVE, 'capture tool runs only against the live wails dev backend (:34115)');
        test.setTimeout(180_000);
        fs.mkdirSync(OUT, { recursive: true });
        await page.setViewportSize({ width: 1440, height: 900 });
        await page.emulateMedia({ colorScheme: theme });
        await page.addInitScript(WAILS_RUNTIME_STUB);
        page.setDefaultTimeout(4000);
        await page.goto('/', { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1500);

        const shot = async (name: string) => {
            await page.waitForTimeout(350);
            await page.screenshot({ path: path.join(OUT, `${name}-${theme}.png`), fullPage: false });
        };
        const click = async (sel: () => Promise<void>, label: string) => {
            try {
                await sel();
                await page.waitForTimeout(400);
            } catch (e) {
                console.log(`SKIP ${label}: ${(e as Error).message}`);
            }
        };

        // 1. Editor (default, side layout)
        await shot('01-editor');

        // 2. Type input so panes show content + run bar reacts
        await click(async () => {
            await page.locator('textarea').first().fill('we shipped the new caching layer this week. there were a few isues but its handled.');
        }, 'type input');
        await shot('02-editor-input');

        // 3. Stacked layout
        await click(async () => page.getByRole('button', { name: /Stacked/i }).click(), 'stacked');
        await shot('03-stacked');
        await click(async () => page.getByRole('button', { name: /Side/i }).click(), 'side');

        // 4. History rail
        await click(async () => page.getByRole('button', { name: /history rail/i }).click(), 'history');
        await shot('04-history');
        await click(async () => page.getByRole('button', { name: /history rail/i }).click(), 'history-off');

        // 5. Build-stack mode (+ add a couple steps)
        await click(
            async () =>
                page
                    .getByRole('button', { name: /Build a stack/i })
                    .first()
                    .click(),
            'build',
        );
        await shot('05-build-empty');
        // try clicking first two action rows in sidebar
        await click(async () => {
            const rows = page.locator('aside button');
            const n = Math.min(3, await rows.count());
            for (let i = 0; i < n; i++)
                await rows
                    .nth(i)
                    .click()
                    .catch(() => {});
        }, 'add steps');
        await shot('06-build-steps');
        await click(
            async () =>
                page
                    .getByRole('button', { name: /Cancel/i })
                    .first()
                    .click(),
            'cancel build',
        );

        // 6. Sidebar collapsed
        await click(async () => page.getByRole('button', { name: /Collapse sidebar/i }).click(), 'collapse');
        await shot('07-sidebar-collapsed');
        await click(async () => page.getByRole('button', { name: /Expand sidebar/i }).click(), 'expand');

        // 7. Settings — each tab
        await click(async () => page.getByRole('button', { name: /Open settings/i }).click(), 'settings');
        await shot('08-settings-providers');
        for (const tab of ['Model', 'Generation', 'Languages', 'Logging', 'About & data', 'Appearance']) {
            await click(async () => page.getByRole('tab', { name: tab }).click(), `tab ${tab}`);
            await shot(`09-settings-${tab.replace(/[^a-z]/gi, '').toLowerCase()}`);
        }
        // back to editor
        await click(async () => page.getByRole('button', { name: /^Close$/i }).click(), 'close settings');

        // 8. About / Info
        await click(async () => page.getByRole('button', { name: /About and info/i }).click(), 'about');
        await shot('10-about');
        await click(async () => page.getByRole('button', { name: /^Close$/i }).click(), 'close about');

        // 9. Manage stacks
        await click(
            async () =>
                page
                    .getByText(/Manage/i)
                    .first()
                    .click(),
            'manage',
        );
        await shot('11-manage-stacks');
    });
}
