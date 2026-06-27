import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import settingsReducer from '../../../../../../logic/store/settings/slice';
import uiReducer from '../../../../../../logic/store/ui/slice';
import notificationsReducer from '../../../../../../logic/store/notifications/slice';
import { Settings } from '../../../../../../logic/adapter/models';
import LanguageConfigTab from '../LanguageConfigTab';

jest.mock('../../../../../../logic/adapter', () => ({
    SettingsHandlerAdapter: {
        addLanguage: jest.fn().mockResolvedValue({ data: ['English', 'French', 'Spanish'], error: null }),
        removeLanguage: jest.fn().mockResolvedValue({ data: ['English'], error: null }),
        setDefaultInputLanguage: jest.fn().mockResolvedValue({ data: null, error: null }),
        setDefaultOutputLanguage: jest.fn().mockResolvedValue({ data: null, error: null }),
        getSettings: jest.fn().mockResolvedValue({ data: null, error: null }),
    },
    getLogger: () => ({ logInfo: jest.fn(), logDebug: jest.fn(), logError: jest.fn(), logWarn: jest.fn() }),
    unwrap: (r: { data: unknown; error: { message: string } | null }) => { if (r?.error) throw new Error(r.error.message); return r?.data; },
    fromWireSettings: (v: unknown) => v,
}));

const MOCK_PROVIDER = {
    providerId: 'p1', providerName: 'Test Provider', providerType: 'openai',
    baseUrl: 'http://localhost:1234', modelsEndpoint: '', completionEndpoint: '',
    authType: 'api-key', authToken: '', useAuthTokenFromEnv: true, envVarTokenName: 'TEST_KEY',
    apiVersion: '', selectedModel: 'gpt-4o',
    useCustomHeaders: false, headers: {}, useCustomModels: false, customModels: [],
};

const MOCK_SETTINGS: Settings = {
    availableProviderConfigs: [MOCK_PROVIDER],
    currentProviderConfig: MOCK_PROVIDER,
    inferenceBaseConfig: { timeout: 120, maxRetries: 3, useMarkdownForOutput: true },
    modelConfig: { name: 'gpt-4o', useTemperature: true, temperature: 0.7, useContextWindow: false, contextWindow: 4096, useLegacyMaxTokens: false },
    languageConfig: { languages: ['English', 'French'], defaultInputLanguage: 'English', defaultOutputLanguage: 'English' },
    appBehaviorConfig: { enableTaskLogging: false, logDirectory: '/tmp/logs', historyEnabled: true, historyMaxEntries: 500 },
};

function makeStore() {
    return configureStore({
        reducer: { settings: settingsReducer, ui: uiReducer, notifications: notificationsReducer },
        preloadedState: {
            settings: { allSettings: MOCK_SETTINGS, metadata: null },
            ui: {
                layout: 'side' as const, sidebarCollapsed: false, historyOpen: false,
                inferenceRunning: false, currentView: 'settings' as const, armedActionId: null,
                activeActionsTab: null, buildMode: false, editingStackId: null, activeSettingsTab: 0,
                theme: { mode: 'auto' as const, effective: 'light' as const },
            },
        },
    });
}

describe('LanguageConfigTab', () => {
    it('renders existing languages English and French', () => {
        render(<Provider store={makeStore()}><LanguageConfigTab settings={MOCK_SETTINGS} /></Provider>);
        expect(screen.getByText('English')).toBeInTheDocument();
        expect(screen.getByText('French')).toBeInTheDocument();
    });

    it('shows default input badge for English', () => {
        render(<Provider store={makeStore()}><LanguageConfigTab settings={MOCK_SETTINGS} /></Provider>);
        expect(screen.getByText('default input')).toBeInTheDocument();
    });

    it('Add button is disabled when input is empty', () => {
        render(<Provider store={makeStore()}><LanguageConfigTab settings={MOCK_SETTINGS} /></Provider>);
        expect(screen.getByRole('button', { name: /^add$/i })).toBeDisabled();
    });

    it('enables Add button when user types a language name', async () => {
        render(<Provider store={makeStore()}><LanguageConfigTab settings={MOCK_SETTINGS} /></Provider>);
        await userEvent.type(screen.getByRole('textbox', { name: /new language/i }), 'Spanish');
        expect(screen.getByRole('button', { name: /^add$/i })).toBeEnabled();
    });

    it('renders options menu trigger for each language', () => {
        render(<Provider store={makeStore()}><LanguageConfigTab settings={MOCK_SETTINGS} /></Provider>);
        expect(screen.getByRole('button', { name: /options for english/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /options for french/i })).toBeInTheDocument();
    });
});
