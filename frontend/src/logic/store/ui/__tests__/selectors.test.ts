import type { AppBarVisibilityConfig } from '../../../adapter/models';
import type { RootState } from '../../index';
import { selectAppBarVisibility, selectEffectiveTheme, selectThemeMode } from '../selectors';

const makeRootState = (ui: Partial<RootState['ui']>): RootState => ({ ui }) as unknown as RootState;

describe('ui slice theme selectors', () => {
    it('selectThemeMode returns the current mode', () => {
        const state = makeRootState({ theme: { mode: 'dark', effective: 'dark' } });
        expect(selectThemeMode(state)).toBe('dark');
    });

    it('selectEffectiveTheme returns the current effective theme', () => {
        const state = makeRootState({ theme: { mode: 'auto', effective: 'dark' } });
        expect(selectEffectiveTheme(state)).toBe('dark');
    });
});

describe('selectAppBarVisibility', () => {
    it('returns the ui.appBarVisibility slice of state', () => {
        const appBarVisibility: AppBarVisibilityConfig = {
            providerModelSelectors: true,
            languagePicker: false,
            outputFormatToggle: true,
            outputModeToggle: false,
            layoutToggle: true,
            commandPaletteButton: false,
            historyButton: true,
            infoButton: false,
        };
        const state = makeRootState({ appBarVisibility });

        expect(selectAppBarVisibility(state)).toBe(appBarVisibility);
    });
});
