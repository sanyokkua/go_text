// Mock the adapter before any imports so module-level getLogger calls succeed.
jest.mock('../../../adapter', () => ({
    getLogger: jest.fn().mockReturnValue({
        logDebug: jest.fn(),
        logInfo: jest.fn(),
        logError: jest.fn(),
        logWarning: jest.fn(),
        logTrace: jest.fn(),
        logPrint: jest.fn(),
        logFatal: jest.fn(),
    }),
    unwrap: jest.fn((res: { data?: unknown; error?: unknown }) => {
        if (res.error) throw res.error;
        return res.data;
    }),
    tryUnwrap: jest.fn((res: { data?: unknown; error?: unknown }) => res),
    ActionHandlerAdapter: { processPromptChain: jest.fn(), cancelChain: jest.fn() },
    SettingsHandlerAdapter: {},
}));

import uiReducer, {
    setLayout,
    toggleSidebar,
    setSidebarCollapsed,
    toggleHistory,
    setHistoryOpen,
    setThemeMode,
    setThemeEffective,
    setCurrentView,
    armAction,
    setActiveActionsTab,
} from '../slice';
import { processPromptChain } from '../../run/thunks';
import { testProviderInference } from '../../settings/thunks';
import {
    selectCurrentView,
    selectArmedActionId,
    selectActiveActionsTab,
} from '../selectors';
import type { UIState } from '../types';
import type { RootState } from '../../../index';

const initialState: UIState = {
    layout: 'side',
    sidebarCollapsed: false,
    historyOpen: false,
    inferenceRunning: false,
    currentView: 'main',
    armedActionId: null,
    activeActionsTab: null,
    buildMode: false,
    editingStackId: null,
    activeSettingsTab: 0,
    theme: {
        mode: 'auto',
        effective: 'light',
    },
};

describe('ui slice reducer', () => {
    it('returns initial state for unknown action', () => {
        expect(uiReducer(undefined, { type: '@@INIT' })).toEqual(initialState);
    });

    it('toggleSidebar flips sidebarCollapsed from false to true', () => {
        const state = uiReducer(initialState, toggleSidebar());

        expect(state.sidebarCollapsed).toBe(true);
    });

    it('toggleSidebar twice returns sidebarCollapsed to original false', () => {
        let state = uiReducer(initialState, toggleSidebar());
        state = uiReducer(state, toggleSidebar());

        expect(state.sidebarCollapsed).toBe(false);
    });

    it('setSidebarCollapsed(true) sets sidebarCollapsed to true', () => {
        const state = uiReducer(initialState, setSidebarCollapsed(true));

        expect(state.sidebarCollapsed).toBe(true);
    });

    it('toggleHistory flips historyOpen from false to true', () => {
        const state = uiReducer(initialState, toggleHistory());

        expect(state.historyOpen).toBe(true);
    });

    it('setHistoryOpen(true) sets historyOpen to true', () => {
        const state = uiReducer(initialState, setHistoryOpen(true));

        expect(state.historyOpen).toBe(true);
    });

    it('setLayout("stacked") changes layout to stacked', () => {
        const state = uiReducer(initialState, setLayout('stacked'));

        expect(state.layout).toBe('stacked');
    });

    it('setThemeMode("dark") sets theme mode to dark', () => {
        const state = uiReducer(initialState, setThemeMode('dark'));

        expect(state.theme.mode).toBe('dark');
    });

    it('setThemeEffective("dark") sets theme effective to dark', () => {
        const state = uiReducer(initialState, setThemeEffective('dark'));

        expect(state.theme.effective).toBe('dark');
    });

    it('processPromptChain.pending sets inferenceRunning to true', () => {
        const action = {
            type: processPromptChain.pending.type,
            meta: { requestId: 'x', arg: {} },
            payload: undefined,
        };

        const state = uiReducer(initialState, action);

        expect(state.inferenceRunning).toBe(true);
    });

    it('processPromptChain.fulfilled sets inferenceRunning to false', () => {
        const runningState: UIState = { ...initialState, inferenceRunning: true };
        const action = {
            type: processPromptChain.fulfilled.type,
            payload: { data: null, error: null },
        };

        const state = uiReducer(runningState, action);

        expect(state.inferenceRunning).toBe(false);
    });

    it('processPromptChain.rejected sets inferenceRunning to false', () => {
        const runningState: UIState = { ...initialState, inferenceRunning: true };
        const action = {
            type: processPromptChain.rejected.type,
            payload: 'error',
            error: { message: 'Rejected' },
        };

        const state = uiReducer(runningState, action);

        expect(state.inferenceRunning).toBe(false);
    });

    it('testProviderInference.pending sets inferenceRunning to true', () => {
        const action = {
            type: testProviderInference.pending.type,
            meta: { requestId: 'x', arg: 'provider-1' },
            payload: undefined,
        };

        const state = uiReducer(initialState, action);

        expect(state.inferenceRunning).toBe(true);
    });

    it('testProviderInference.fulfilled sets inferenceRunning to false', () => {
        const runningState: UIState = { ...initialState, inferenceRunning: true };
        const action = {
            type: testProviderInference.fulfilled.type,
            payload: { success: true },
        };

        const state = uiReducer(runningState, action);

        expect(state.inferenceRunning).toBe(false);
    });

    it('testProviderInference.rejected sets inferenceRunning to false', () => {
        const runningState: UIState = { ...initialState, inferenceRunning: true };
        const action = {
            type: testProviderInference.rejected.type,
            payload: 'inference error',
            error: { message: 'Rejected' },
        };

        const state = uiReducer(runningState, action);

        expect(state.inferenceRunning).toBe(false);
    });

    it('setCurrentView("settings") changes currentView to settings', () => {
        const state = uiReducer(initialState, setCurrentView('settings'));

        expect(state.currentView).toBe('settings');
    });

    it('setCurrentView("info") changes currentView to info', () => {
        const state = uiReducer(initialState, setCurrentView('info'));

        expect(state.currentView).toBe('info');
    });

    it('setCurrentView("main") changes currentView to main', () => {
        const changedState: UIState = { ...initialState, currentView: 'settings' };
        const state = uiReducer(changedState, setCurrentView('main'));

        expect(state.currentView).toBe('main');
    });

    it('armAction(action-id-123) sets armedActionId to action-id-123', () => {
        const state = uiReducer(initialState, armAction('action-id-123'));

        expect(state.armedActionId).toBe('action-id-123');
    });

    it('armAction(null) clears armedActionId', () => {
        const armedState: UIState = { ...initialState, armedActionId: 'action-id-123' };
        const state = uiReducer(armedState, armAction(null));

        expect(state.armedActionId).toBeNull();
    });

    it('setActiveActionsTab("tab-1") sets activeActionsTab to tab-1', () => {
        const state = uiReducer(initialState, setActiveActionsTab('tab-1'));

        expect(state.activeActionsTab).toBe('tab-1');
    });

    it('setActiveActionsTab(null) clears activeActionsTab', () => {
        const tabState: UIState = { ...initialState, activeActionsTab: 'tab-1' };
        const state = uiReducer(tabState, setActiveActionsTab(null));

        expect(state.activeActionsTab).toBeNull();
    });
});

describe('ui selectors', () => {
    const mockRootState = {
        ui: initialState,
    } as unknown as RootState;

    it('selectCurrentView returns the currentView from state', () => {
        expect(selectCurrentView(mockRootState)).toBe('main');
    });

    it('selectCurrentView returns updated currentView after state change', () => {
        const changedState = {
            ui: { ...initialState, currentView: 'settings' },
        } as unknown as RootState;

        expect(selectCurrentView(changedState)).toBe('settings');
    });

    it('selectArmedActionId returns the armedActionId from state', () => {
        expect(selectArmedActionId(mockRootState)).toBeNull();
    });

    it('selectArmedActionId returns the action id when armed', () => {
        const armedState = {
            ui: { ...initialState, armedActionId: 'action-id-456' },
        } as unknown as RootState;

        expect(selectArmedActionId(armedState)).toBe('action-id-456');
    });

    it('selectActiveActionsTab returns the activeActionsTab from state', () => {
        expect(selectActiveActionsTab(mockRootState)).toBeNull();
    });

    it('selectActiveActionsTab returns the tab name when set', () => {
        const tabState = {
            ui: { ...initialState, activeActionsTab: 'tab-2' },
        } as unknown as RootState;

        expect(selectActiveActionsTab(tabState)).toBe('tab-2');
    });
});
