jest.mock('../../../../logic/adapter', () => ({
    getLogger: () => ({ logDebug: jest.fn(), logInfo: jest.fn(), logError: jest.fn(), logWarning: jest.fn() }),
}));

import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import actionsReducer from '../../../../logic/store/actions/slice';
import editorReducer from '../../../../logic/store/editor/slice';
import historyReducer from '../../../../logic/store/history/slice';
import notificationsReducer from '../../../../logic/store/notifications/slice';
import runReducer from '../../../../logic/store/run/slice';
import settingsReducer from '../../../../logic/store/settings/slice';
import uiReducer from '../../../../logic/store/ui/slice';
import { TooltipProvider } from '../../../primitives/Tooltip';
import AppBar from '../AppBar';

function makeStore(opts: { historyEnabled?: boolean; historyOpen?: boolean; currentView?: 'main' | 'settings' | 'info' | 'stacks' } = {}) {
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
                armedStackId: null,
                activeActionsTab: null,
                buildMode: false,
                editingStackId: null,
                activeSettingsTab: 0,
                theme: { mode: 'auto' as const, effective: 'light' as const },
            },
            settings: {
                allSettings: { appBehaviorConfig: { historyEnabled: opts.historyEnabled ?? true, historyMaxEntries: 100 } } as never,
                metadata: null,
            },
        },
    });
}

function renderAppBar(opts: Parameters<typeof makeStore>[0] = {}) {
    const store = makeStore(opts);
    render(
        <Provider store={store}>
            <TooltipProvider>
                <AppBar />
            </TooltipProvider>
        </Provider>,
    );
    return store;
}

describe('AppBar — history toggle', () => {
    it('renders history toggle button in main view', () => {
        renderAppBar();
        expect(screen.getByRole('button', { name: /toggle history rail/i })).toBeInTheDocument();
    });

    it('history toggle button is enabled when historyEnabled is true', () => {
        renderAppBar({ historyEnabled: true });
        expect(screen.getByRole('button', { name: /toggle history rail/i })).toBeEnabled();
    });

    it('history toggle button is disabled when historyEnabled is false', () => {
        renderAppBar({ historyEnabled: false });
        expect(screen.getByRole('button', { name: /toggle history rail/i })).toBeDisabled();
    });

    it('toggle button has aria-pressed=false when history is closed', () => {
        renderAppBar({ historyOpen: false });
        expect(screen.getByRole('button', { name: /toggle history rail/i })).toHaveAttribute('aria-pressed', 'false');
    });

    it('toggle button has aria-pressed=true when history is open', () => {
        renderAppBar({ historyOpen: true });
        expect(screen.getByRole('button', { name: /toggle history rail/i })).toHaveAttribute('aria-pressed', 'true');
    });

    it('clicking toggle flips historyOpen in store', async () => {
        const store = renderAppBar({ historyOpen: false });
        await userEvent.click(screen.getByRole('button', { name: /toggle history rail/i }));
        expect(store.getState().ui.historyOpen).toBe(true);
    });

    it('toggle button does not render outside main view', () => {
        renderAppBar({ currentView: 'settings' });
        expect(screen.queryByRole('button', { name: /toggle history rail/i })).not.toBeInTheDocument();
    });
});

describe('AppBar — icon button tooltips', () => {
    it('sidebar toggle button is present with accessible label', () => {
        renderAppBar();
        expect(screen.getByRole('button', { name: /expand sidebar|collapse sidebar/i })).toBeInTheDocument();
    });

    it('about button is present with accessible label', () => {
        renderAppBar();
        expect(screen.getByRole('button', { name: /about and info/i })).toBeInTheDocument();
    });

    it('settings button is present with accessible label', () => {
        renderAppBar();
        expect(screen.getByRole('button', { name: /open settings/i })).toBeInTheDocument();
    });
});
