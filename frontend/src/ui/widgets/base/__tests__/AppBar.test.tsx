jest.mock('../../../../logic/adapter', () => ({
    getLogger: () => ({
        logDebug: jest.fn(), logInfo: jest.fn(), logError: jest.fn(), logWarning: jest.fn(),
    }),
}));

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import actionsReducer from '../../../../logic/store/actions/slice';
import editorReducer from '../../../../logic/store/editor/slice';
import historyReducer from '../../../../logic/store/history/slice';
import notificationsReducer from '../../../../logic/store/notifications/slice';
import runReducer from '../../../../logic/store/run/slice';
import settingsReducer from '../../../../logic/store/settings/slice';
import uiReducer from '../../../../logic/store/ui/slice';
import AppBar from '../AppBar';

function makeStore(opts: {
    historyEnabled?: boolean;
    historyOpen?: boolean;
    currentView?: 'main' | 'settings' | 'info' | 'stacks';
} = {}) {
    return configureStore({
        reducer: {
            ui: uiReducer,
            settings: settingsReducer,
            actions: actionsReducer,
            editor: editorReducer,
            notifications: notificationsReducer,
            run: runReducer,
            history: historyReducer,
        },
        preloadedState: {
            ui: {
                layout: 'side' as const,
                sidebarCollapsed: false,
                historyOpen: opts.historyOpen ?? false,
                inferenceRunning: false,
                currentView: opts.currentView ?? 'main',
                armedActionId: null,
                activeActionsTab: null,
                buildMode: false,
                editingStackId: null,
                theme: { mode: 'auto' as const, effective: 'light' as const },
            },
            settings: {
                allSettings: {
                    appBehaviorConfig: { historyEnabled: opts.historyEnabled ?? true, historyMaxEntries: 100 },
                } as never,
                metadata: null,
            },
        },
    });
}

describe('AppBar — history toggle', () => {
    it('renders history toggle button in main view', () => {
        render(<Provider store={makeStore()}><AppBar /></Provider>);
        expect(screen.getByRole('button', { name: /toggle history rail/i })).toBeInTheDocument();
    });

    it('history toggle button is enabled when historyEnabled is true', () => {
        render(<Provider store={makeStore({ historyEnabled: true })}><AppBar /></Provider>);
        expect(screen.getByRole('button', { name: /toggle history rail/i })).toBeEnabled();
    });

    it('history toggle button is disabled when historyEnabled is false', () => {
        render(<Provider store={makeStore({ historyEnabled: false })}><AppBar /></Provider>);
        expect(screen.getByRole('button', { name: /toggle history rail/i })).toBeDisabled();
    });

    it('toggle button has aria-pressed=false when history is closed', () => {
        render(<Provider store={makeStore({ historyOpen: false })}><AppBar /></Provider>);
        expect(screen.getByRole('button', { name: /toggle history rail/i })).toHaveAttribute('aria-pressed', 'false');
    });

    it('toggle button has aria-pressed=true when history is open', () => {
        render(<Provider store={makeStore({ historyOpen: true })}><AppBar /></Provider>);
        expect(screen.getByRole('button', { name: /toggle history rail/i })).toHaveAttribute('aria-pressed', 'true');
    });

    it('clicking toggle flips historyOpen in store', async () => {
        const store = makeStore({ historyOpen: false });
        render(<Provider store={store}><AppBar /></Provider>);
        await userEvent.click(screen.getByRole('button', { name: /toggle history rail/i }));
        expect(store.getState().ui.historyOpen).toBe(true);
    });

    it('toggle button does not render outside main view', () => {
        render(<Provider store={makeStore({ currentView: 'settings' })}><AppBar /></Provider>);
        expect(screen.queryByRole('button', { name: /toggle history rail/i })).not.toBeInTheDocument();
    });
});
