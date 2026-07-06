import type { RootState } from '../../index';
import { selectEffectiveTheme, selectThemeMode } from '../selectors';

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
