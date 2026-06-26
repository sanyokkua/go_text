import themeReducer, { setEffective, setMode } from '../slice';
import { selectEffectiveTheme, selectThemeMode } from '../selectors';
import type { RootState } from '../../index';
import type { ThemeState } from '../types';

const makeRootState = (theme: ThemeState): RootState =>
    ({ theme } as unknown as RootState);

describe('themeReducer', () => {
    const initial: ThemeState = { mode: 'auto', effective: 'light' };

    it('returns initial state for unknown action', () => {
        expect(themeReducer(undefined, { type: '@@INIT' })).toEqual(initial);
    });

    it('setMode updates mode without touching effective', () => {
        const state = themeReducer(initial, setMode('dark'));
        expect(state.mode).toBe('dark');
        expect(state.effective).toBe('light');
    });

    it('setMode accepts all three mode values', () => {
        expect(themeReducer(initial, setMode('auto')).mode).toBe('auto');
        expect(themeReducer(initial, setMode('light')).mode).toBe('light');
        expect(themeReducer(initial, setMode('dark')).mode).toBe('dark');
    });

    it('setEffective updates effective without touching mode', () => {
        const state = themeReducer(initial, setEffective('dark'));
        expect(state.effective).toBe('dark');
        expect(state.mode).toBe('auto');
    });

    it('setEffective accepts both effective values', () => {
        expect(themeReducer(initial, setEffective('light')).effective).toBe('light');
        expect(themeReducer(initial, setEffective('dark')).effective).toBe('dark');
    });
});

describe('theme selectors', () => {
    it('selectThemeMode returns the current mode', () => {
        const state = makeRootState({ mode: 'dark', effective: 'dark' });
        expect(selectThemeMode(state)).toBe('dark');
    });

    it('selectEffectiveTheme returns the current effective theme', () => {
        const state = makeRootState({ mode: 'auto', effective: 'dark' });
        expect(selectEffectiveTheme(state)).toBe('dark');
    });
});
