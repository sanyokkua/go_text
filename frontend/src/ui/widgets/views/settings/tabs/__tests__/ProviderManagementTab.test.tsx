import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { AppSettingsMetadata, Settings } from '../../../../../../logic/adapter/models';
import notificationsReducer from '../../../../../../logic/store/notifications/slice';
import settingsReducer from '../../../../../../logic/store/settings/slice';
import uiReducer from '../../../../../../logic/store/ui/slice';
import ProviderManagementTab from '../ProviderManagementTab';

// ProviderForm is deeply dependent on wailsjs ESM interop (apperr.ModelInfo).
// We stub it so ProviderManagementTab's own behavior (list, new-button, hint)
// is testable without the ESM/CJS interop issue from the nested wailsjs import.
jest.mock('../components/ProviderForm', () => {
    const React = require('react');
    const MockProviderForm = ({ provider }: { provider: unknown }) => {
        if (!provider) {
            return React.createElement('div', null, '(Select a provider to edit or create a new one)');
        }
        return React.createElement('form', null, React.createElement('input', { 'aria-label': 'Provider name', 'type': 'text' }));
    };
    MockProviderForm.displayName = 'MockProviderForm';
    return {
        __esModule: true,
        default: MockProviderForm,
        BLANK_PROVIDER: {
            providerId: '',
            providerName: '',
            providerType: 'openai',
            baseUrl: '',
            modelsEndpoint: '',
            completionEndpoint: '',
            authType: 'api-key',
            authToken: '',
            useAuthTokenFromEnv: true,
            envVarTokenName: '',
            apiVersion: '',
            selectedModel: '',
            useCustomHeaders: false,
            headers: {},
            useCustomModels: false,
            customModels: [],
        },
    };
});

jest.mock('../../../../../../logic/adapter', () => ({
    ActionHandlerAdapter: {
        testConnection: jest.fn().mockResolvedValue({ data: { check: 'connection', ok: true, durationMs: 100 }, error: null }),
        testModels: jest.fn().mockResolvedValue({ data: { check: 'models', ok: true, durationMs: 50, modelCount: 3 }, error: null }),
        testInference: jest.fn().mockResolvedValue({ data: { check: 'inference', ok: true, durationMs: 200, sample: 'Hello' }, error: null }),
        getModels: jest.fn().mockResolvedValue({ data: [], error: null }),
    },
    SettingsHandlerAdapter: {
        getSettings: jest.fn().mockResolvedValue({ data: null, error: null }),
        createProviderConfig: jest.fn().mockResolvedValue({ data: null, error: null }),
        updateProviderConfig: jest.fn().mockResolvedValue({ data: null, error: null }),
        deleteProviderConfig: jest.fn().mockResolvedValue({ data: null, error: null }),
        setAsCurrentProviderConfig: jest.fn().mockResolvedValue({ data: null, error: null }),
    },
    ClipboardServiceAdapter: { setText: jest.fn().mockResolvedValue(undefined) },
    getLogger: () => ({ logInfo: jest.fn(), logDebug: jest.fn(), logError: jest.fn(), logWarn: jest.fn() }),
    unwrap: jest.fn((r) => {
        if (r?.error) throw new Error(r.error.message);
        return r?.data;
    }),
    fromWireSettings: jest.fn((v) => v),
    fromWireProvider: jest.fn((v) => v),
    fromWireBehavior: jest.fn((v) => v),
    fromWireMetadata: jest.fn((v) => v),
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

const MOCK_METADATA: AppSettingsMetadata = {
    authTypes: ['none', 'bearer', 'api-key'],
    providerTypes: ['openai', 'azure', 'anthropic'],
    settingsFolder: '/Users/test/.config/GoText',
    settingsFile: '/Users/test/.config/GoText/settings.db',
    logsFolder: '/Users/test/.local/share/GoText/logs',
    appVersion: '3.0.0-test',
};

function makeStore() {
    return configureStore({
        reducer: { settings: settingsReducer, ui: uiReducer, notifications: notificationsReducer },
        preloadedState: {
            settings: { allSettings: MOCK_SETTINGS, metadata: MOCK_METADATA },
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

describe('ProviderManagementTab', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders the "+ New provider" button', () => {
        render(
            <Provider store={makeStore()}>
                <ProviderManagementTab />
            </Provider>,
        );

        expect(screen.getByRole('button', { name: /new provider/i })).toBeInTheDocument();
    });

    it('renders "Test Provider" in the provider list', () => {
        render(
            <Provider store={makeStore()}>
                <ProviderManagementTab />
            </Provider>,
        );

        expect(screen.getByRole('button', { name: /test provider/i })).toBeInTheDocument();
    });

    it('shows "current" badge next to Test Provider', () => {
        render(
            <Provider store={makeStore()}>
                <ProviderManagementTab />
            </Provider>,
        );

        expect(screen.getByLabelText('current provider')).toBeInTheDocument();
    });

    it('shows hint text when no provider is selected', () => {
        render(
            <Provider store={makeStore()}>
                <ProviderManagementTab />
            </Provider>,
        );

        expect(screen.getByText(/select a provider to edit or create a new one/i)).toBeInTheDocument();
    });

    it('shows the provider form with a name field after clicking "+ New provider"', async () => {
        render(
            <Provider store={makeStore()}>
                <ProviderManagementTab />
            </Provider>,
        );

        await userEvent.click(screen.getByRole('button', { name: /new provider/i }));

        await waitFor(() => {
            expect(screen.getByRole('textbox', { name: /provider name/i })).toBeInTheDocument();
        });
    });

    it('renders the "PROVIDERS" section header above the list', () => {
        render(
            <Provider store={makeStore()}>
                <ProviderManagementTab />
            </Provider>,
        );

        expect(screen.getByRole('heading', { name: /providers/i })).toBeInTheDocument();
    });

    it('places "+ New provider" after the provider items in the list', () => {
        render(
            <Provider store={makeStore()}>
                <ProviderManagementTab />
            </Provider>,
        );

        const providerItem = screen.getByRole('button', { name: /test provider/i });
        const newBtn = screen.getByRole('button', { name: /new provider/i });

        const newBtnFollowsItem =
            providerItem.compareDocumentPosition(newBtn) & Node.DOCUMENT_POSITION_FOLLOWING;
        expect(newBtnFollowsItem).toBeTruthy();
    });
});
