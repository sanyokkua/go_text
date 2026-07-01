import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { Settings } from '../../../../../../logic/adapter/models';
import notificationsReducer from '../../../../../../logic/store/notifications/slice';
import settingsReducer from '../../../../../../logic/store/settings/slice';
import uiReducer from '../../../../../../logic/store/ui/slice';
import ModelConfigTab from '../ModelConfigTab';

jest.mock('../../../../../../logic/adapter', () => ({
    ActionHandlerAdapter: { getModels: jest.fn().mockResolvedValue({ data: [], error: null }) },
    SettingsHandlerAdapter: { updateModelConfig: jest.fn().mockResolvedValue({ data: null, error: null }) },
    getLogger: () => ({ logInfo: jest.fn(), logDebug: jest.fn(), logError: jest.fn(), logWarn: jest.fn() }),
    unwrap: jest.fn((r) => {
        if (r?.error) throw new Error(r.error.message);
        return r?.data;
    }),
}));

const MOCK_PROVIDER = {
    providerId: 'p1',
    providerName: 'Test Provider',
    providerType: 'openai',
    baseUrl: 'http://localhost:1234',
    modelsEndpoint: '',
    completionEndpoint: '',
    authType: 'api-key',
    authToken: '',
    useAuthTokenFromEnv: true,
    envVarTokenName: 'TEST_KEY',
    apiVersion: '',
    selectedModel: 'gpt-4o',
    useCustomHeaders: false,
    headers: {},
    useCustomModels: false,
    customModels: [],
};

const MOCK_SETTINGS: Settings = {
    availableProviderConfigs: [MOCK_PROVIDER],
    currentProviderConfig: MOCK_PROVIDER,
    inferenceBaseConfig: { timeout: 120, maxRetries: 3, useMarkdownForOutput: true },
    modelConfig: { name: 'gpt-4o', useTemperature: true, temperature: 0.7, useContextWindow: false, contextWindow: 4096, useLegacyMaxTokens: false },
    languageConfig: { languages: ['English', 'French'], defaultInputLanguage: 'English', defaultOutputLanguage: 'English' },
    appBehaviorConfig: { enableTaskLogging: false, logDirectory: '/tmp/logs', historyEnabled: true, historyMaxEntries: 500 },
};

// useTemperature is off here so only the context-window slider renders —
// both sliders share the same accessible name ("Value"), which would make
// getByRole('slider') ambiguous if both were shown at once.
const MOCK_SETTINGS_WITH_CONTEXT_WINDOW: Settings = {
    ...MOCK_SETTINGS,
    modelConfig: {
        ...MOCK_SETTINGS.modelConfig,
        useTemperature: false,
        useContextWindow: true,
        contextWindow: 4096,
    },
};

function makeStore(settings: Settings = MOCK_SETTINGS) {
    return configureStore({
        reducer: { settings: settingsReducer, ui: uiReducer, notifications: notificationsReducer },
        preloadedState: {
            settings: { allSettings: settings, metadata: null },
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
            },
        },
    });
}

describe('ModelConfigTab', () => {
    it('renders the Model section header', () => {
        render(
            <Provider store={makeStore()}>
                <ModelConfigTab settings={MOCK_SETTINGS} />
            </Provider>,
        );

        expect(screen.getByText(/Model — searchable/i)).toBeInTheDocument();
    });

    it('renders the Use temperature label', () => {
        render(
            <Provider store={makeStore()}>
                <ModelConfigTab settings={MOCK_SETTINGS} />
            </Provider>,
        );

        expect(screen.getByText('Use temperature')).toBeInTheDocument();
    });

    it('renders the Use context window label', () => {
        render(
            <Provider store={makeStore()}>
                <ModelConfigTab settings={MOCK_SETTINGS} />
            </Provider>,
        );

        expect(screen.getByText('Use context window')).toBeInTheDocument();
    });

    it('renders the Token-limit parameter label', () => {
        render(
            <Provider store={makeStore()}>
                <ModelConfigTab settings={MOCK_SETTINGS} />
            </Provider>,
        );

        expect(screen.getByText('Token-limit parameter')).toBeInTheDocument();
    });

    it('Save button is initially disabled when form is not dirty', () => {
        render(
            <Provider store={makeStore()}>
                <ModelConfigTab settings={MOCK_SETTINGS} />
            </Provider>,
        );

        expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled();
    });

    it('renders Use temperature switch in checked state when useTemperature is true', () => {
        render(
            <Provider store={makeStore()}>
                <ModelConfigTab settings={MOCK_SETTINGS} />
            </Provider>,
        );

        expect(screen.getByRole('switch', { name: /use temperature/i })).toBeChecked();
    });

    it('renders Use context window switch in unchecked state when useContextWindow is false', () => {
        render(
            <Provider store={makeStore()}>
                <ModelConfigTab settings={MOCK_SETTINGS} />
            </Provider>,
        );

        expect(screen.getByRole('switch', { name: /use context window/i })).not.toBeChecked();
    });

    it('context-window slider reaches exactly 1024 when pressed Home, not the old 512 bound', () => {
        render(
            <Provider store={makeStore(MOCK_SETTINGS_WITH_CONTEXT_WINDOW)}>
                <ModelConfigTab settings={MOCK_SETTINGS_WITH_CONTEXT_WINDOW} />
            </Provider>,
        );

        const slider = screen.getByRole('slider', { name: /value/i });
        fireEvent.keyDown(slider, { key: 'Home' });

        expect(slider).toHaveAttribute('aria-valuenow', '1024');
    });

    it('context-window slider reaches exactly 200000 when pressed End, not the old 131072 bound', () => {
        render(
            <Provider store={makeStore(MOCK_SETTINGS_WITH_CONTEXT_WINDOW)}>
                <ModelConfigTab settings={MOCK_SETTINGS_WITH_CONTEXT_WINDOW} />
            </Provider>,
        );

        const slider = screen.getByRole('slider', { name: /value/i });
        fireEvent.keyDown(slider, { key: 'End' });

        expect(slider).toHaveAttribute('aria-valuenow', '200000');
    });
});
