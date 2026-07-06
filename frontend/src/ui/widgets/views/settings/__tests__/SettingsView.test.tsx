jest.mock('../../../../../logic/adapter', () => ({
    getLogger: () => ({ logInfo: jest.fn(), logDebug: jest.fn(), logError: jest.fn(), logWarn: jest.fn() }),
    unwrap: jest.fn((r: unknown) => (r as { data: unknown } | undefined)?.data),
}));

// Heavier tab panels are mocked to distinctive stand-ins so this suite stays focused on
// SettingsView's own tab-switching behavior rather than each panel's internals — mirrors
// the precedent set by InfoView.test.tsx mocking CatalogList/PromptInspector.
jest.mock('../tabs/AppBehaviorTab', () => ({ __esModule: true, default: () => <div>AppBehaviorTab panel content</div> }));
jest.mock('../tabs/ProviderManagementTab', () => ({ __esModule: true, default: () => <div>ProviderManagementTab panel content</div> }));
jest.mock('../tabs/ModelConfigTab', () => ({ __esModule: true, default: () => <div>ModelConfigTab panel content</div> }));
jest.mock('../tabs/InferenceConfigTab', () => ({ __esModule: true, default: () => <div>InferenceConfigTab panel content</div> }));
jest.mock('../tabs/LanguageConfigTab', () => ({ __esModule: true, default: () => <div>LanguageConfigTab panel content</div> }));
jest.mock('../tabs/MetadataTab', () => ({ __esModule: true, default: () => <div>MetadataTab panel content</div> }));

import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';

import { Settings } from '../../../../../logic/adapter/models';
import settingsReducer from '../../../../../logic/store/settings/slice';
import uiReducer from '../../../../../logic/store/ui/slice';
import { UIState } from '../../../../../logic/store/ui/types';
import SettingsView from '../SettingsView';

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

const BASE_UI_STATE: UIState = {
    layout: 'side',
    sidebarCollapsed: false,
    historyOpen: false,
    paletteOpen: false,
    inferenceRunning: false,
    currentView: 'settings',
    armedActionId: null,
    armedStackId: null,
    activeActionsTab: null,
    activeSettingsTab: 0,
    buildMode: false,
    editingStackId: null,
    theme: { mode: 'auto', effective: 'light' },
};

function makeStore(activeSettingsTab = 0, settings: Settings | null = MOCK_SETTINGS) {
    return configureStore({
        reducer: { settings: settingsReducer, ui: uiReducer },
        preloadedState: {
            settings: { allSettings: settings, metadata: null, discoveredModels: [], providerPresets: [] },
            ui: { ...BASE_UI_STATE, activeSettingsTab },
        },
    });
}

const TAB_NAMES = ['Appearance', 'Logging', 'Providers', 'Model', 'Generation', 'Languages', 'About & data'];

describe('SettingsView', () => {
    it('renders a tab for each of the 7 settings sections with its label text', () => {
        render(
            <Provider store={makeStore()}>
                <SettingsView />
            </Provider>,
        );

        TAB_NAMES.forEach((name) => {
            expect(screen.getByRole('tab', { name })).toBeInTheDocument();
        });
    });

    it('marks the tab matching the current activeSettingsTab Redux state as selected', () => {
        render(
            <Provider store={makeStore(2)}>
                <SettingsView />
            </Provider>,
        );

        expect(screen.getByRole('tab', { name: 'Providers' })).toHaveAttribute('aria-selected', 'true');
        expect(screen.getByRole('tab', { name: 'Providers' })).toHaveAttribute('data-state', 'active');
        expect(screen.getByRole('tab', { name: 'Appearance' })).toHaveAttribute('aria-selected', 'false');
    });

    it('dispatches setActiveSettingsTab with the numeric index of the clicked tab', async () => {
        const store = makeStore(0);
        render(
            <Provider store={store}>
                <SettingsView />
            </Provider>,
        );

        await userEvent.click(screen.getByRole('tab', { name: 'Model' }));

        expect(store.getState().ui.activeSettingsTab).toBe(3);
    });

    it('shows the Appearance panel content by default and hides other panels', () => {
        render(
            <Provider store={makeStore(0)}>
                <SettingsView />
            </Provider>,
        );

        expect(screen.getByText('Theme')).toBeInTheDocument();
        expect(screen.queryByText('ProviderManagementTab panel content')).not.toBeInTheDocument();
    });

    it('swaps to the Providers panel content when the Providers tab is clicked', async () => {
        render(
            <Provider store={makeStore(0)}>
                <SettingsView />
            </Provider>,
        );

        await userEvent.click(screen.getByRole('tab', { name: 'Providers' }));

        expect(screen.getByText('ProviderManagementTab panel content')).toBeInTheDocument();
        expect(screen.queryByText('Theme')).not.toBeInTheDocument();
    });

    it('shows a loading message instead of tabs when settings have not loaded yet', () => {
        render(
            <Provider store={makeStore(0, null)}>
                <SettingsView />
            </Provider>,
        );

        expect(screen.getByText(/Loading settings/i)).toBeInTheDocument();
        expect(screen.queryByRole('tab', { name: 'Appearance' })).not.toBeInTheDocument();
    });
});
