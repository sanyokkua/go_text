import { expect, Page, test } from '@playwright/test';

async function loadMainView(page: Page): Promise<void> {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
}

test.describe('AppBar', () => {
    test('renders the GoText wordmark', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadMainView(page);

        // Assert
        await expect(page.getByText('GoText')).toBeVisible({ timeout: 5000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('AppBar header does not use a hardcoded dark-teal background color', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadMainView(page);

        // Assert – the bar uses var(--surface), not #00796b
        const bg = await page.evaluate(() => {
            const header = document.querySelector('header');
            if (!header) return '';
            return getComputedStyle(header).backgroundColor;
        });
        // #00796b is rgb(0, 121, 107)
        expect(bg).not.toBe('rgb(0, 121, 107)');
        expect(bg.length).toBeGreaterThan(0);

        expect(jsErrors).toHaveLength(0);
    });

    test('sidebar toggle button is visible and starts as expanded (pressed=true)', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadMainView(page);

        // Assert – sidebar starts expanded, so the button label is "Collapse sidebar"
        const toggleBtn = page.getByRole('button', { name: /collapse sidebar/i });
        await expect(toggleBtn).toBeVisible({ timeout: 5000 });
        await expect(toggleBtn).toHaveAttribute('aria-pressed', 'true');

        expect(jsErrors).toHaveLength(0);
    });

    test('clicking sidebar toggle collapses then re-expands the sidebar', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadMainView(page);

        // Act – collapse
        await page.getByRole('button', { name: /collapse sidebar/i }).click();

        // Assert collapsed
        await expect(page.getByRole('button', { name: /expand sidebar/i })).toBeVisible({ timeout: 5000 });
        const collapsedBtn = page.getByRole('button', { name: /expand sidebar/i });
        await expect(collapsedBtn).toHaveAttribute('aria-pressed', 'false');

        // Act – expand again
        await collapsedBtn.click();

        // Assert expanded
        await expect(page.getByRole('button', { name: /collapse sidebar/i })).toBeVisible({ timeout: 5000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('Format segmented control has Plain and MD items', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadMainView(page);

        // Assert – Segmented uses ToggleGroup.Item which renders as role="radio"
        await expect(page.getByRole('radio', { name: 'Plain' })).toBeVisible({ timeout: 5000 });
        await expect(page.getByRole('radio', { name: 'MD' })).toBeVisible({ timeout: 5000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('View Mode segmented control has Preview, Source, and Diff items', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadMainView(page);

        // Assert
        await expect(page.getByRole('radio', { name: 'Preview' })).toBeVisible({ timeout: 5000 });
        await expect(page.getByRole('radio', { name: 'Source' })).toBeVisible({ timeout: 5000 });
        await expect(page.getByRole('radio', { name: 'Diff' })).toBeVisible({ timeout: 5000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('Layout segmented control has Side and Stacked items', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadMainView(page);

        // Assert – labels include symbols but query by partial text
        await expect(page.getByRole('radio', { name: /side/i })).toBeVisible({ timeout: 5000 });
        await expect(page.getByRole('radio', { name: /stacked/i })).toBeVisible({ timeout: 5000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('clicking Layout "Stacked" item updates its aria-checked state', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadMainView(page);

        // Act
        await page.getByRole('radio', { name: /stacked/i }).click();

        // Assert – Radix ToggleGroup sets aria-checked on the active item
        await expect(page.getByRole('radio', { name: /stacked/i })).toHaveAttribute('aria-checked', 'true', { timeout: 3000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('history toggle button is present and toggles aria-pressed', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadMainView(page);

        const historyBtn = page.getByRole('button', { name: /toggle history rail/i });
        await expect(historyBtn).toBeVisible({ timeout: 5000 });

        const initialPressed = await historyBtn.getAttribute('aria-pressed');

        // Act – toggle
        await historyBtn.click();

        // Assert – state changed
        const newPressed = await historyBtn.getAttribute('aria-pressed');
        expect(newPressed).not.toBe(initialPressed);

        expect(jsErrors).toHaveLength(0);
    });

    test('settings button is present and navigates to settings view', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadMainView(page);

        // Act
        await page.getByRole('button', { name: /open settings/i }).click();

        // Assert – settings view is shown (the button label changes to "Close")
        await expect(page.getByRole('button', { name: /^close$/i })).toBeVisible({ timeout: 5000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('About and info button navigates to the info view', async ({ page }) => {
        // Arrange
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));

        await loadMainView(page);

        // Act
        await page.getByRole('button', { name: /about and info/i }).click();

        // Assert – no longer on main view; back button appears
        await expect(page.getByRole('button', { name: /back to editor/i })).toBeVisible({ timeout: 5000 });

        expect(jsErrors).toHaveLength(0);
    });

    // Task 7 — controls wrap individually, not as whole sub-groups.
    test('toolbar group wrappers are dissolved so controls are direct flex items', async ({ page }) => {
        // Arrange
        await loadMainView(page);

        // Assert – the former `.left`/`.right` grouping divs now use display:contents,
        // so their children participate directly in the header's flex/flex-wrap layout
        // and wrap one-by-one instead of dropping as a whole cluster.
        const wrapperDisplays = await page.evaluate(() => {
            const header = document.querySelector('header');
            if (!header) return [] as string[];
            return Array.from(header.children)
                .filter((el) => el.tagName === 'DIV')
                .map((el) => getComputedStyle(el).display);
        });
        expect(wrapperDisplays.length).toBeGreaterThan(0);
        expect(wrapperDisplays.every((d) => d === 'contents')).toBe(true);
    });

    test('toolbar wraps to additional rows when the window is too narrow', async ({ page }) => {
        // Arrange
        await loadMainView(page);

        // Act – measure header height wide vs. narrow
        await page.setViewportSize({ width: 1400, height: 800 });
        await page.waitForTimeout(150);
        const wideHeight = await page.evaluate(() => document.querySelector('header')!.getBoundingClientRect().height);

        await page.setViewportSize({ width: 520, height: 800 });
        await page.waitForTimeout(150);
        const narrowHeight = await page.evaluate(() => document.querySelector('header')!.getBoundingClientRect().height);

        // Assert – narrowing forces items onto more rows, growing the header
        expect(narrowHeight).toBeGreaterThan(wideHeight);
    });
});

test.describe('AppBar element visibility', () => {
    test('hiding providerModelSelectors removes the Provider and Model pickers', async ({ page }) => {
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));
        await page.addInitScript(() => {
            (window as Window & { __bridgeMockAppBarVisibility?: Record<string, unknown> }).__bridgeMockAppBarVisibility = {
                providerModelSelectors: false,
            };
        });
        await loadMainView(page);

        await expect(page.getByRole('combobox', { name: /provider/i })).toHaveCount(0);
        await expect(page.getByRole('combobox', { name: /model/i })).toHaveCount(0);
        await expect(page.getByRole('button', { name: /open settings/i })).toBeVisible({ timeout: 5000 });
        await expect(page.getByText('GoText')).toBeVisible();

        expect(jsErrors).toHaveLength(0);
    });

    test('hiding languagePicker removes the Languages button', async ({ page }) => {
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));
        await page.addInitScript(() => {
            (window as Window & { __bridgeMockAppBarVisibility?: Record<string, unknown> }).__bridgeMockAppBarVisibility = { languagePicker: false };
        });
        await loadMainView(page);

        await expect(page.getByRole('button', { name: 'Languages' })).toHaveCount(0);
        await expect(page.getByRole('combobox', { name: /provider/i })).toBeVisible({ timeout: 5000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('hiding outputFormatToggle removes the Plain/MD segmented control', async ({ page }) => {
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));
        await page.addInitScript(() => {
            (window as Window & { __bridgeMockAppBarVisibility?: Record<string, unknown> }).__bridgeMockAppBarVisibility = {
                outputFormatToggle: false,
            };
        });
        await loadMainView(page);

        await expect(page.getByRole('radio', { name: 'Plain' })).toHaveCount(0);
        await expect(page.getByRole('radio', { name: 'MD' })).toHaveCount(0);
        await expect(page.getByRole('radio', { name: 'Preview' })).toBeVisible({ timeout: 5000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('hiding outputModeToggle removes the Preview/Source/Diff segmented control', async ({ page }) => {
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));
        await page.addInitScript(() => {
            (window as Window & { __bridgeMockAppBarVisibility?: Record<string, unknown> }).__bridgeMockAppBarVisibility = {
                outputModeToggle: false,
            };
        });
        await loadMainView(page);

        await expect(page.getByRole('radio', { name: 'Preview' })).toHaveCount(0);
        await expect(page.getByRole('radio', { name: 'Source' })).toHaveCount(0);
        await expect(page.getByRole('radio', { name: 'Diff' })).toHaveCount(0);
        await expect(page.getByRole('radio', { name: 'Plain' })).toBeVisible({ timeout: 5000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('hiding layoutToggle removes the Side/Stacked segmented control', async ({ page }) => {
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));
        await page.addInitScript(() => {
            (window as Window & { __bridgeMockAppBarVisibility?: Record<string, unknown> }).__bridgeMockAppBarVisibility = { layoutToggle: false };
        });
        await loadMainView(page);

        await expect(page.getByRole('radio', { name: /side/i })).toHaveCount(0);
        await expect(page.getByRole('radio', { name: /stacked/i })).toHaveCount(0);
        await expect(page.getByRole('radio', { name: 'Plain' })).toBeVisible({ timeout: 5000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('hiding commandPaletteButton removes the ⌘K button', async ({ page }) => {
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));
        await page.addInitScript(() => {
            (window as Window & { __bridgeMockAppBarVisibility?: Record<string, unknown> }).__bridgeMockAppBarVisibility = {
                commandPaletteButton: false,
            };
        });
        await loadMainView(page);

        await expect(page.getByRole('button', { name: /open command palette/i })).toHaveCount(0);
        await expect(page.getByRole('button', { name: /toggle history rail/i })).toBeVisible({ timeout: 5000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('hiding historyButton removes the history toggle button', async ({ page }) => {
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));
        await page.addInitScript(() => {
            (window as Window & { __bridgeMockAppBarVisibility?: Record<string, unknown> }).__bridgeMockAppBarVisibility = { historyButton: false };
        });
        await loadMainView(page);

        await expect(page.getByRole('button', { name: /toggle history rail/i })).toHaveCount(0);
        await expect(page.getByRole('button', { name: /open command palette/i })).toBeVisible({ timeout: 5000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('hiding infoButton removes the About and info button', async ({ page }) => {
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));
        await page.addInitScript(() => {
            (window as Window & { __bridgeMockAppBarVisibility?: Record<string, unknown> }).__bridgeMockAppBarVisibility = { infoButton: false };
        });
        await loadMainView(page);

        await expect(page.getByRole('button', { name: /about and info/i })).toHaveCount(0);
        await expect(page.getByRole('button', { name: /open settings/i })).toBeVisible({ timeout: 5000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('hiding all 8 AppBar elements leaves only sidebar toggle, Settings, and wordmark', async ({ page }) => {
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));
        await page.addInitScript(() => {
            (window as Window & { __bridgeMockAppBarVisibility?: Record<string, unknown> }).__bridgeMockAppBarVisibility = {
                providerModelSelectors: false,
                languagePicker: false,
                outputFormatToggle: false,
                outputModeToggle: false,
                layoutToggle: false,
                commandPaletteButton: false,
                historyButton: false,
                infoButton: false,
            };
        });
        await loadMainView(page);

        await expect(page.getByRole('button', { name: /collapse sidebar/i })).toBeVisible({ timeout: 5000 });
        await expect(page.getByRole('button', { name: /open settings/i })).toBeVisible();
        await expect(page.getByText('GoText')).toBeVisible();

        await expect(page.getByRole('combobox', { name: /provider/i })).toHaveCount(0);
        await expect(page.getByRole('combobox', { name: /model/i })).toHaveCount(0);
        await expect(page.getByRole('button', { name: 'Languages' })).toHaveCount(0);
        await expect(page.getByRole('radio', { name: 'Plain' })).toHaveCount(0);
        await expect(page.getByRole('radio', { name: 'Preview' })).toHaveCount(0);
        await expect(page.getByRole('radio', { name: /stacked/i })).toHaveCount(0);
        await expect(page.getByRole('button', { name: /open command palette/i })).toHaveCount(0);
        await expect(page.getByRole('button', { name: /toggle history rail/i })).toHaveCount(0);
        await expect(page.getByRole('button', { name: /about and info/i })).toHaveCount(0);

        expect(jsErrors).toHaveLength(0);
    });

    test('toggling the History button switch in Settings hides it live and persists the change', async ({ page }) => {
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));
        await loadMainView(page);

        await page.getByRole('button', { name: /open settings/i }).click();
        await page.waitForSelector('[role="tablist"][aria-label="Navigation tabs"]', { timeout: 8000 });
        await page.getByRole('tab', { name: /appearance/i }).click();

        await page.getByRole('switch', { name: 'History button' }).click();
        await page.waitForTimeout(300);

        const lastUpdate = await page.evaluate(
            () => (window as Window & { __lastAppBarVisibilityUpdate?: Record<string, unknown> }).__lastAppBarVisibilityUpdate,
        );
        expect(lastUpdate?.historyButton).toBe(false);

        await page.getByRole('button', { name: /^close$/i }).click();
        await expect(page.getByRole('button', { name: /toggle history rail/i })).toHaveCount(0);

        expect(jsErrors).toHaveLength(0);
    });

    test('⌘K still opens the command palette when commandPaletteButton is hidden', async ({ page }) => {
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));
        await page.addInitScript(() => {
            (window as Window & { __bridgeMockAppBarVisibility?: Record<string, unknown> }).__bridgeMockAppBarVisibility = {
                commandPaletteButton: false,
            };
        });
        await loadMainView(page);
        await expect(page.getByRole('button', { name: /open command palette/i })).toHaveCount(0);

        await page.keyboard.press('Control+k');

        await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible({ timeout: 5000 });

        expect(jsErrors).toHaveLength(0);
    });

    test('history panel content stays visible when historyButton is hidden but historyOpen is persisted true', async ({ page }) => {
        const jsErrors: string[] = [];
        page.on('pageerror', (err) => jsErrors.push(err.message));
        await page.addInitScript(() => {
            (window as Window & { __bridgeMockAppBarVisibility?: Record<string, unknown> }).__bridgeMockAppBarVisibility = { historyButton: false };
            (window as Window & { __bridgeMockUIPrefs?: Record<string, unknown> }).__bridgeMockUIPrefs = { historyOpen: true };
        });
        await loadMainView(page);

        await expect(page.getByRole('button', { name: /toggle history rail/i })).toHaveCount(0);
        await expect(page.getByRole('complementary', { name: 'History' })).toBeVisible({ timeout: 5000 });
        await expect(page.getByText('No runs yet.')).toBeVisible();

        expect(jsErrors).toHaveLength(0);
    });
});

test.describe('UI state persistence — load from bridge-mock', () => {
    // Each test injects window.__bridgeMockUIPrefs BEFORE page load so that
    // GetUIPreferencesConfig picks it up when the Redux thunk fires on startup.

    test('restores stacked layout when bridge-mock returns layout=stacked', async ({ page }) => {
        // Arrange — addInitScript runs before any page JS, so the override is present
        // when GetUIPreferencesConfig is called during app startup.
        await page.addInitScript(() => {
            (window as Window & { __bridgeMockUIPrefs?: Record<string, unknown> }).__bridgeMockUIPrefs = { layout: 'stacked' };
        });
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Assert – Stacked radio must be the active selection
        await expect(page.getByRole('radio', { name: /stacked/i })).toHaveAttribute('aria-checked', 'true', { timeout: 5000 });
    });

    test('restores collapsed sidebar when bridge-mock returns sidebarCollapsed=true', async ({ page }) => {
        // Arrange
        await page.addInitScript(() => {
            (window as Window & { __bridgeMockUIPrefs?: Record<string, unknown> }).__bridgeMockUIPrefs = { sidebarCollapsed: true };
        });
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Assert – collapsed sidebar → label is "Expand sidebar", aria-pressed is false
        const expandBtn = page.getByRole('button', { name: /expand sidebar/i });
        await expect(expandBtn).toBeVisible({ timeout: 5000 });
        await expect(expandBtn).toHaveAttribute('aria-pressed', 'false');
    });

    test('restores open history rail when bridge-mock returns historyOpen=true', async ({ page }) => {
        // Arrange
        await page.addInitScript(() => {
            (window as Window & { __bridgeMockUIPrefs?: Record<string, unknown> }).__bridgeMockUIPrefs = { historyOpen: true };
        });
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Assert – history button reflects the persisted open state
        await expect(page.getByRole('button', { name: /toggle history rail/i })).toHaveAttribute('aria-pressed', 'true', { timeout: 5000 });
    });

    test('restores source view mode when bridge-mock returns viewMode=source', async ({ page }) => {
        // Arrange
        await page.addInitScript(() => {
            (window as Window & { __bridgeMockUIPrefs?: Record<string, unknown> }).__bridgeMockUIPrefs = { viewMode: 'source' };
        });
        await page.goto('/');
        await page.waitForLoadState('networkidle');

        // Assert – Source radio must be the active selection
        await expect(page.getByRole('radio', { name: 'Source' })).toHaveAttribute('aria-checked', 'true', { timeout: 5000 });
    });
});

test.describe('UI state persistence — saves on change', () => {
    // Each test verifies that interacting with an AppBar control causes
    // persistUIPreferences to call UpdateUIPreferencesConfig with the updated field.
    // window.__lastUIPrefsUpdate is written by the bridge-mock on every such call.

    test('toggling the sidebar calls UpdateUIPreferencesConfig with sidebarCollapsed=true', async ({ page }) => {
        // Arrange
        await loadMainView(page);

        // Act – sidebar starts expanded (sidebarCollapsed: false), clicking collapses it
        await page.getByRole('button', { name: /collapse sidebar/i }).click();
        await page.waitForTimeout(300);

        // Assert
        const lastUpdate = await page.evaluate(() => {
            return (window as Window & { __lastUIPrefsUpdate?: Record<string, unknown> }).__lastUIPrefsUpdate;
        });
        expect(lastUpdate?.sidebarCollapsed).toBe(true);
    });

    test('switching layout to Stacked calls UpdateUIPreferencesConfig with layout=stacked', async ({ page }) => {
        // Arrange
        await loadMainView(page);

        // Act
        await page.getByRole('radio', { name: /stacked/i }).click();
        await page.waitForTimeout(300);

        // Assert
        const lastUpdate = await page.evaluate(() => {
            return (window as Window & { __lastUIPrefsUpdate?: Record<string, unknown> }).__lastUIPrefsUpdate;
        });
        expect(lastUpdate?.layout).toBe('stacked');
    });

    test('switching view mode to Source calls UpdateUIPreferencesConfig with viewMode=source', async ({ page }) => {
        // Arrange
        await loadMainView(page);

        // Act
        await page.getByRole('radio', { name: 'Source' }).click();
        await page.waitForTimeout(300);

        // Assert
        const lastUpdate = await page.evaluate(() => {
            return (window as Window & { __lastUIPrefsUpdate?: Record<string, unknown> }).__lastUIPrefsUpdate;
        });
        expect(lastUpdate?.viewMode).toBe('source');
    });

    test('opening the history rail calls UpdateUIPreferencesConfig with historyOpen=true', async ({ page }) => {
        // Arrange
        await loadMainView(page);

        // Act – history starts closed (historyOpen: false default)
        await page.getByRole('button', { name: /toggle history rail/i }).click();
        await page.waitForTimeout(300);

        // Assert
        const lastUpdate = await page.evaluate(() => {
            return (window as Window & { __lastUIPrefsUpdate?: Record<string, unknown> }).__lastUIPrefsUpdate;
        });
        expect(lastUpdate?.historyOpen).toBe(true);
    });
});
