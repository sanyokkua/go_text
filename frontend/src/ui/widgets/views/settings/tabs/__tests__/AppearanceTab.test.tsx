jest.mock('../../../../../../logic/adapter', () => ({
    getLogger: () => ({ logInfo: jest.fn(), logDebug: jest.fn(), logError: jest.fn(), logWarn: jest.fn() }),
    unwrap: jest.fn((r) => {
        if (r?.error) throw new Error(r.error.message);
        return r?.data;
    }),
    SettingsHandlerAdapter: {
        updateUIPreferencesConfig: jest.fn().mockResolvedValue({ data: { theme: 'dark' } }),
        getUIPreferencesConfig: jest.fn().mockResolvedValue({ data: { theme: 'auto' } }),
        updateAppBarVisibilityConfig: jest.fn().mockResolvedValue({ data: {} }),
    },
}));

import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';

import { SettingsHandlerAdapter } from '../../../../../../logic/adapter';
import type { AppBarVisibilityConfig } from '../../../../../../logic/adapter/models';
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
                appBarVisibility: { providerModelSelectors: true, languagePicker: true, outputFormatToggle: true, outputModeToggle: true, layoutToggle: true, commandPaletteButton: true, historyButton: true, infoButton: true },
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

describe('AppearanceTab — App Bar elements', () => {
    const ROWS: { key: keyof AppBarVisibilityConfig; label: RegExp }[] = [
        { key: 'providerModelSelectors', label: /provider & model pickers/i },
        { key: 'languagePicker', label: /^language picker$/i },
        { key: 'outputFormatToggle', label: /output format toggle/i },
        { key: 'outputModeToggle', label: /output view toggle/i },
        { key: 'layoutToggle', label: /^layout toggle$/i },
        { key: 'commandPaletteButton', label: /command palette button/i },
        { key: 'historyButton', label: /^history button$/i },
        { key: 'infoButton', label: /^info button$/i },
    ];

    let mockUpdateAppBarVisibilityConfig: jest.Mock;

    beforeEach(() => {
        mockUpdateAppBarVisibilityConfig = SettingsHandlerAdapter.updateAppBarVisibilityConfig as jest.Mock;
        mockUpdateAppBarVisibilityConfig.mockClear();
    });

    it.each(ROWS)('renders a switch labeled for $key that is checked when appBarVisibility.$key is true', ({ label }) => {
        render(
            <Provider store={makeStore()}>
                <AppearanceTab />
            </Provider>,
        );

        expect(screen.getByRole('switch', { name: label })).toBeChecked();
    });

    it.each(ROWS)('renders the $key switch unchecked when appBarVisibility.$key is false', ({ key, label }) => {
        render(
            <Provider
                store={makeStore({
                    appBarVisibility: {
                        providerModelSelectors: true,
                        languagePicker: true,
                        outputFormatToggle: true,
                        outputModeToggle: true,
                        layoutToggle: true,
                        commandPaletteButton: true,
                        historyButton: true,
                        infoButton: true,
                        [key]: false,
                    },
                })}
            >
                <AppearanceTab />
            </Provider>,
        );

        expect(screen.getByRole('switch', { name: label })).not.toBeChecked();
    });

    it.each(ROWS)('clicking the $key switch dispatches toggleAppBarElement and persists it', async ({ key, label }) => {
        const store = makeStore();

        render(
            <Provider store={store}>
                <AppearanceTab />
            </Provider>,
        );

        await userEvent.click(screen.getByRole('switch', { name: label }));

        expect(store.getState().ui.appBarVisibility[key]).toBe(false);
        await waitFor(() => {
            expect(mockUpdateAppBarVisibilityConfig).toHaveBeenCalledWith(expect.objectContaining({ [key]: false }));
        });
    });
});
