import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Guards the T56 token-fidelity work: settings-tab CSS modules must drive color/spacing
 * from design tokens (var(--…)) and must not reintroduce undefined tokens (--ink-1, --red,
 * --space-5) or stray hardcoded hex colors. The Appearance preview swatches are the one
 * sanctioned exception — they show fixed light/dark appearance regardless of active theme.
 */

const tabsDir = join(__dirname, '..');

const TOKEN_MODULES = ['ModelConfigTab.module.css', 'InferenceConfigTab.module.css', 'MetadataTab.module.css', 'AppBehaviorTab.module.css'];

const UNDEFINED_TOKENS = ['--ink-1', '--red', '--space-5', '--surface-3', '--text-muted', '--accent', '--primary'];

function read(name: string): string {
    return readFileSync(join(tabsDir, name), 'utf8');
}

describe('settings tab CSS token fidelity', () => {
    it.each(TOKEN_MODULES)('%s drives styling from design tokens', (name) => {
        expect(read(name)).toMatch(/var\(--/);
    });

    it.each(TOKEN_MODULES)('%s contains no hardcoded hex colors', (name) => {
        expect(read(name)).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
    });

    it.each([...TOKEN_MODULES, 'AppearanceTab.module.css', 'LanguageConfigTab.module.css'])('%s references no undefined tokens', (name) => {
        const css = read(name);
        for (const token of UNDEFINED_TOKENS) {
            expect(css).not.toContain(`var(${token})`);
        }
    });

    it('AppearanceTab preview swatches keep fixed (non-token) colors so both themes render side-by-side', () => {
        const css = read('AppearanceTab.module.css');
        // The fixed swatch colors are intentional; the accent text still uses a token.
        expect(css).toMatch(/\.previewLight/);
        expect(css).toMatch(/\.previewDark/);
        expect(css).toContain('var(--teal)');
    });
});
