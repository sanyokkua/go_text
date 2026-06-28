// Mock the adapter before any imports so module-level getLogger calls succeed.
jest.mock('../../../adapter', () => ({
    getLogger: jest
        .fn()
        .mockReturnValue({
            logPrint: jest.fn(),
            logTrace: jest.fn(),
            logDebug: jest.fn(),
            logInfo: jest.fn(),
            logWarning: jest.fn(),
            logError: jest.fn(),
            logFatal: jest.fn(),
        }),
    unwrap: jest.fn((res: { data?: unknown; error?: unknown }) => {
        if (res.error) throw res.error;
        return res.data;
    }),
    tryUnwrap: jest.fn((res: { data?: unknown; error?: unknown }) => res),
}));

import type { RootState } from '../../index';
import { selectEffectiveTheme, selectThemeMode } from '../../ui/selectors';
import uiReducer, { setThemeEffective, setThemeMode } from '../../ui/slice';
import type { UIState } from '../../ui/types';

const makeRootState = (ui: Partial<UIState>): RootState => ({ ui }) as unknown as RootState;

describe('UI slice — theme functionality', () => {
    const initial: UIState = {
        layout: 'side',
        sidebarCollapsed: false,
        historyOpen: false,
        paletteOpen: false,
        inferenceRunning: false,
        currentView: 'main',
        armedActionId: null,
        activeActionsTab: null,
        buildMode: false,
        editingStackId: null,
        activeSettingsTab: 0,
        theme: { mode: 'auto', effective: 'light' },
    };

    it('returns initial state for unknown action', () => {
        expect(uiReducer(undefined, { type: '@@INIT' })).toEqual(initial);
    });

    it('setThemeMode updates mode without touching effective', () => {
        const state = uiReducer(initial, setThemeMode('dark'));
        expect(state.theme.mode).toBe('dark');
        expect(state.theme.effective).toBe('light');
    });

    it('setThemeMode accepts all three mode values', () => {
        expect(uiReducer(initial, setThemeMode('auto')).theme.mode).toBe('auto');
        expect(uiReducer(initial, setThemeMode('light')).theme.mode).toBe('light');
        expect(uiReducer(initial, setThemeMode('dark')).theme.mode).toBe('dark');
    });

    it('setThemeEffective updates effective without touching mode', () => {
        const state = uiReducer(initial, setThemeEffective('dark'));
        expect(state.theme.effective).toBe('dark');
        expect(state.theme.mode).toBe('auto');
    });

    it('setThemeEffective accepts both effective values', () => {
        expect(uiReducer(initial, setThemeEffective('light')).theme.effective).toBe('light');
        expect(uiReducer(initial, setThemeEffective('dark')).theme.effective).toBe('dark');
    });
});

describe('theme selectors (via ui slice)', () => {
    it('selectThemeMode returns the current mode', () => {
        const state = makeRootState({ theme: { mode: 'dark', effective: 'dark' } });
        expect(selectThemeMode(state)).toBe('dark');
    });

    it('selectEffectiveTheme returns the current effective theme', () => {
        const state = makeRootState({ theme: { mode: 'auto', effective: 'dark' } });
        expect(selectEffectiveTheme(state)).toBe('dark');
    });
});
