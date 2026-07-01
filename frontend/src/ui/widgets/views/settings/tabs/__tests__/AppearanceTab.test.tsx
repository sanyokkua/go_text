jest.mock('../../../../../../logic/adapter', () => ({
    getLogger: () => ({ logInfo: jest.fn(), logDebug: jest.fn(), logError: jest.fn(), logWarn: jest.fn() }),
    unwrap: jest.fn((r) => {
        if (r?.error) throw new Error(r.error.message);
        return r?.data;
    }),
    SettingsHandlerAdapter: {
        updateUIPreferencesConfig: jest.fn().mockResolvedValue({ data: { theme: 'dark' } }),
        getUIPreferencesConfig: jest.fn().mockResolvedValue({ data: { theme: 'auto' } }),
    },
}));

import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';

import { SettingsHandlerAdapter } from '../../../../../../logic/adapter';
import editorReducer from '../../../../../../logic/store/editor/slice';
import notificationsReducer from '../../../../../../logic/store/notifications/slice';
import settingsReducer from '../../../../../../logic/store/settings/slice';
import uiReducer from '../../../../../../logic/store/ui/slice';
import AppearanceTab from '../AppearanceTab';

function makeStore(uiOverride = {}) {
    return configureStore({
        reducer: { editor: editorReducer, settings: settingsReducer, ui: uiReducer, notifications: notificationsReducer },
        preloadedState: {
            editor: { inputContent: '', outputContent: '', viewMode: 'preview' as const, tokenEstimate: null },
            ui: {
                layout: 'side' as const,
                sidebarCollapsed: false,
                historyOpen: false,
                inferenceRunning: false,
                currentView: 'settings' as const,
                armedActionId: null,
                armedStackId: null,
                activeActionsTab: null,
                buildMode: false,
                editingStackId: null,
                activeSettingsTab: 0,
                theme: { mode: 'auto' as const, effective: 'light' as const },
                ...uiOverride,
            },
        },
    });
}

describe('AppearanceTab', () => {
    it('renders three theme options: Auto, Light, Dark', () => {
        render(
            <Provider store={makeStore()}>
                <AppearanceTab />
            </Provider>,
        );

        expect(screen.getByRole('radio', { name: /follow os setting/i })).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: /light theme/i })).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: /dark theme/i })).toBeInTheDocument();
    });

    it('selects Auto when theme mode is "auto"', () => {
        render(
            <Provider store={makeStore({ theme: { mode: 'auto' as const, effective: 'light' as const } })}>
                <AppearanceTab />
            </Provider>,
        );

        expect(screen.getByRole('radio', { name: /follow os setting/i })).toBeChecked();
    });

    it('dispatches setThemeMode with "dark" when Dark option is clicked', async () => {
        const store = makeStore({ theme: { mode: 'auto' as const, effective: 'light' as const } });

        render(
            <Provider store={store}>
                <AppearanceTab />
            </Provider>,
        );

        await userEvent.click(screen.getByRole('radio', { name: /dark theme/i }));

        expect(store.getState().ui.theme.mode).toBe('dark');
    });

    it('dispatches setThemeMode with "light" when Light option is clicked', async () => {
        const store = makeStore({ theme: { mode: 'auto' as const, effective: 'light' as const } });

        render(
            <Provider store={store}>
                <AppearanceTab />
            </Provider>,
        );

        await userEvent.click(screen.getByRole('radio', { name: /light theme/i }));

        expect(store.getState().ui.theme.mode).toBe('light');
    });

    it('renders light and dark preview cards with accent text', () => {
        render(
            <Provider store={makeStore()}>
                <AppearanceTab />
            </Provider>,
        );

        const lightCard = screen.getByLabelText('Light theme preview');
        const darkCard = screen.getByLabelText('Dark theme preview');
        expect(lightCard).toHaveTextContent(/Light · Aa accent/);
        expect(darkCard).toHaveTextContent(/Dark · Aa accent/);
    });
});

describe('AppearanceTab — UI persistence', () => {
    let mockUpdateUIPreferencesConfig: jest.Mock;

    beforeEach(() => {
        mockUpdateUIPreferencesConfig = SettingsHandlerAdapter.updateUIPreferencesConfig as jest.Mock;
        mockUpdateUIPreferencesConfig.mockClear();
    });

    it('calls updateUIPreferencesConfig after theme change to dark', async () => {
        render(
            <Provider store={makeStore({ theme: { mode: 'auto' as const, effective: 'light' as const } })}>
                <AppearanceTab />
            </Provider>,
        );

        await userEvent.click(screen.getByRole('radio', { name: /dark theme/i }));

        await waitFor(() => {
            expect(mockUpdateUIPreferencesConfig).toHaveBeenCalledWith(expect.objectContaining({ theme: 'dark' }));
        });
    });

    it('calls updateUIPreferencesConfig after theme change to light', async () => {
        render(
            <Provider store={makeStore({ theme: { mode: 'auto' as const, effective: 'light' as const } })}>
                <AppearanceTab />
            </Provider>,
        );

        await userEvent.click(screen.getByRole('radio', { name: /light theme/i }));

        await waitFor(() => {
            expect(mockUpdateUIPreferencesConfig).toHaveBeenCalledWith(expect.objectContaining({ theme: 'light' }));
        });
    });
});
