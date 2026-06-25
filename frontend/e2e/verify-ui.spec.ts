import { expect, test } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const ROUTES = ['/'];

const VIEWPORTS = [
    { name: 'narrow', width: 375, height: 812 },
    { name: 'tablet', width: 768, height: 1024 },
    { name: 'wide', width: 1440, height: 900 },
] as const;

const THEMES = ['light', 'dark'] as const;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCREENSHOT_DIR = path.resolve(__dirname, '../.tmp/verify-screens');

for (const route of ROUTES) {
    for (const vp of VIEWPORTS) {
        for (const theme of THEMES) {
            test(`${route} @ ${vp.name}(${vp.width}px)/${theme} — no overflow, no errors, sans-serif`, async ({ page }) => {
                await page.setViewportSize({ width: vp.width, height: vp.height });
                await page.emulateMedia({ colorScheme: theme === 'dark' ? 'dark' : 'light' });

                const consoleErrors: string[] = [];
                page.on('console', (msg) => {
                    if (msg.type() === 'error') consoleErrors.push(msg.text());
                });
                page.on('pageerror', (err) => consoleErrors.push(err.message));

                await page.goto(route);
                await page.waitForLoadState('networkidle');

                // Gate 1: no horizontal overflow
                const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth + 1);
                expect(hasOverflow, 'horizontal overflow detected').toBe(false);

                // Gate 2: no console/page errors
                expect(consoleErrors, `console errors: ${consoleErrors.join('; ')}`).toHaveLength(0);

                // Gate 3: body font is sans-serif (not fallback serif)
                const fontFamily = await page.evaluate(() => window.getComputedStyle(document.body).fontFamily);
                // Must not match plain 'serif' without 'sans' prefix
                expect(fontFamily, 'body font should be sans-serif').not.toMatch(/^serif$/i);
                expect(fontFamily, 'body font should not be Times New Roman').not.toContain('Times New Roman');

                // Gate 4: page has content (not blank)
                const bodyText = await page.locator('body').innerText();
                expect(bodyText.trim().length, 'page body is empty').toBeGreaterThan(0);

                // Screenshot
                fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
                const slug = route === '/' ? 'root' : route.replace(/\//g, '-').slice(1);
                await page.screenshot({ path: path.join(SCREENSHOT_DIR, `${slug}-${vp.name}-${theme}.png`), fullPage: true });
            });
        }
    }
}
