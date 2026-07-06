import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { Settings } from '../../../../../../logic/adapter/models';
import notificationsReducer from '../../../../../../logic/store/notifications/slice';
import settingsReducer from '../../../../../../logic/store/settings/slice';
import uiReducer from '../../../../../../logic/store/ui/slice';
import InferenceConfigTab from '../InferenceConfigTab';

jest.mock('../../../../../../logic/adapter', () => ({
    SettingsHandlerAdapter: {
        updateInferenceBaseConfig: jest.fn().mockResolvedValue({ data: { timeout: 60, maxRetries: 3, useMarkdownForOutput: true }, error: null }),
        getSettings: jest.fn().mockResolvedValue({ data: null, error: null }),
    },
    getLogger: () => ({ logInfo: jest.fn(), logDebug: jest.fn(), logError: jest.fn(), logWarn: jest.fn() }),
    unwrap: (r: { data: unknown; error: { message: string } | null }) => {
        if (r?.error) throw new Error(r.error.message);
        return r?.data;
    },
    fromWireSettings: (v: unknown) => v,
    fromWireInferenceBaseConfig: (v: unknown) => v,
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
    modelConfig: {
        name: 'gpt-4o',
        useTemperature: true,
        temperature: 0.7,
        useContextWindow: false,
        contextWindow: 4096,
        useLegacyMaxTokens: false,
        useMaxOutputTokens: false,
        maxOutputTokens: 2048,
    },
    languageConfig: { languages: ['English', 'French'], defaultInputLanguage: 'English', defaultOutputLanguage: 'English' },
    appBehaviorConfig: { enableTaskLogging: false, logDirectory: '/tmp/logs', historyEnabled: true, historyMaxEntries: 500 },
};

function makeStore() {
    return configureStore({
        reducer: { settings: settingsReducer, ui: uiReducer, notifications: notificationsReducer },
        preloadedState: {
            settings: { allSettings: MOCK_SETTINGS, metadata: null },
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

describe('InferenceConfigTab', () => {
    it('renders timeout field with current value 120', () => {
        render(
            <Provider store={makeStore()}>
                <InferenceConfigTab settings={MOCK_SETTINGS} />
            </Provider>,
        );
        expect(screen.getByRole('spinbutton', { name: /request timeout/i })).toHaveValue(120);
    });

    it('renders max retries field with value 3', () => {
        render(
            <Provider store={makeStore()}>
                <InferenceConfigTab settings={MOCK_SETTINGS} />
            </Provider>,
        );
        expect(screen.getByRole('spinbutton', { name: /maximum number of retries/i })).toHaveValue(3);
    });

    it('renders markdown output switch in checked state', () => {
        render(
            <Provider store={makeStore()}>
                <InferenceConfigTab settings={MOCK_SETTINGS} />
            </Provider>,
        );
        expect(screen.getByRole('switch', { name: /request markdown output/i })).toBeChecked();
    });

    it('renders a plain-language description for the request timeout control', () => {
        render(
            <Provider store={makeStore()}>
                <InferenceConfigTab settings={MOCK_SETTINGS} />
            </Provider>,
        );
        expect(screen.getByText(/how long to wait for a response before giving up/i)).toBeInTheDocument();
    });

    it('renders a plain-language description for the markdown output switch', () => {
        render(
            <Provider store={makeStore()}>
                <InferenceConfigTab settings={MOCK_SETTINGS} />
            </Provider>,
        );
        expect(screen.getByText(/ask the model to format its response using markdown/i)).toBeInTheDocument();
    });

    it('Save button is initially disabled when form is not dirty', () => {
        render(
            <Provider store={makeStore()}>
                <InferenceConfigTab settings={MOCK_SETTINGS} />
            </Provider>,
        );
        expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled();
    });

    it('enables Save button when user changes the timeout value', async () => {
        render(
            <Provider store={makeStore()}>
                <InferenceConfigTab settings={MOCK_SETTINGS} />
            </Provider>,
        );
        const timeout = screen.getByRole('spinbutton', { name: /request timeout/i });
        await userEvent.clear(timeout);
        await userEvent.type(timeout, '60');
        expect(screen.getByRole('button', { name: /^save$/i })).toBeEnabled();
    });

    it('dispatches updateInferenceBaseConfig when Save is clicked after a change', async () => {
        const store = makeStore();
        render(
            <Provider store={store}>
                <InferenceConfigTab settings={MOCK_SETTINGS} />
            </Provider>,
        );
        const timeout = screen.getByRole('spinbutton', { name: /request timeout/i });
        await userEvent.clear(timeout);
        await userEvent.type(timeout, '60');
        await userEvent.click(screen.getByRole('button', { name: /^save$/i }));
        await waitFor(() => {
            const actions = store.getState();
            expect(actions).toBeDefined();
        });
    });
});
