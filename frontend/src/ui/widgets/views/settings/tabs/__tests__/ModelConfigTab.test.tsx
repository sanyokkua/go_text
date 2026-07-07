import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { ActionHandlerAdapter } from '../../../../../../logic/adapter';
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

// Ollama's native chat path always sets its own output-length option, so the
// token-limit-parameter radio group must be disabled (not hidden) for this provider.
const OLLAMA_PROVIDER = { ...MOCK_PROVIDER, providerType: 'ollama' };

const OLLAMA_SETTINGS: Settings = { ...MOCK_SETTINGS, availableProviderConfigs: [OLLAMA_PROVIDER], currentProviderConfig: OLLAMA_PROVIDER };

// useTemperature is off here so only the context-window slider renders —
// both sliders share the same accessible name ("Value"), which would make
// getByRole('slider') ambiguous if both were shown at once.
const MOCK_SETTINGS_WITH_CONTEXT_WINDOW: Settings = {
    ...MOCK_SETTINGS,
    modelConfig: { ...MOCK_SETTINGS.modelConfig, useTemperature: false, useContextWindow: true, contextWindow: 4096 },
};

// Same single-slider isolation as MOCK_SETTINGS_WITH_CONTEXT_WINDOW, but for the
// max-output-tokens slider — only it is on, so getByRole('slider') is unambiguous.
const MOCK_SETTINGS_WITH_MAX_OUTPUT_TOKENS: Settings = {
    ...MOCK_SETTINGS,
    modelConfig: { ...MOCK_SETTINGS.modelConfig, useTemperature: false, useMaxOutputTokens: true, maxOutputTokens: 2048 },
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
                appBarVisibility: { providerModelSelectors: true, languagePicker: true, outputFormatToggle: true, outputModeToggle: true, layoutToggle: true, commandPaletteButton: true, historyButton: true, infoButton: true },
            },
        },
    });
}

describe('ModelConfigTab', () => {
    afterEach(() => {
        // clearMocks (jest.config.cjs) resets call history but not a mock's resolved
        // value, so tests that customize getModels must restore the shared default.
        (ActionHandlerAdapter.getModels as jest.Mock).mockResolvedValue({ data: [], error: null });
    });

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

    it('renders the Use max output tokens label', () => {
        render(
            <Provider store={makeStore()}>
                <ModelConfigTab settings={MOCK_SETTINGS} />
            </Provider>,
        );

        expect(screen.getByText('Use max output tokens')).toBeInTheDocument();
    });

    it('hides the max-output-tokens slider when the toggle is off', () => {
        render(
            <Provider store={makeStore()}>
                <ModelConfigTab settings={MOCK_SETTINGS} />
            </Provider>,
        );

        // MOCK_SETTINGS has useTemperature on (its slider renders); only the
        // max-output-tokens slider must stay hidden while its toggle is off.
        expect(screen.getAllByRole('slider')).toHaveLength(1);
    });

    it('max-output-tokens slider reaches exactly 1 when pressed Home, matching the backend validation floor', () => {
        render(
            <Provider store={makeStore(MOCK_SETTINGS_WITH_MAX_OUTPUT_TOKENS)}>
                <ModelConfigTab settings={MOCK_SETTINGS_WITH_MAX_OUTPUT_TOKENS} />
            </Provider>,
        );

        const slider = screen.getByRole('slider', { name: /value/i });
        fireEvent.keyDown(slider, { key: 'Home' });

        expect(slider).toHaveAttribute('aria-valuenow', '1');
    });

    it('max-output-tokens slider reaches exactly 32000 when pressed End, matching the backend validation ceiling', () => {
        render(
            <Provider store={makeStore(MOCK_SETTINGS_WITH_MAX_OUTPUT_TOKENS)}>
                <ModelConfigTab settings={MOCK_SETTINGS_WITH_MAX_OUTPUT_TOKENS} />
            </Provider>,
        );

        const slider = screen.getByRole('slider', { name: /value/i });
        fireEvent.keyDown(slider, { key: 'End' });

        expect(slider).toHaveAttribute('aria-valuenow', '32000');
    });

    it('narrows the model picker options to those matching typed search text', async () => {
        (ActionHandlerAdapter.getModels as jest.Mock).mockResolvedValue({
            data: [
                { id: 'gpt-4o', label: 'gpt-4o' },
                { id: 'gpt-3.5-turbo', label: 'gpt-3.5-turbo' },
            ],
            error: null,
        });
        render(
            <Provider store={makeStore()}>
                <ModelConfigTab settings={MOCK_SETTINGS} />
            </Provider>,
        );

        await userEvent.click(screen.getByRole('button', { name: 'Search models…' }));
        await userEvent.type(await screen.findByRole('combobox', { name: 'Search models…' }), 'turbo');

        expect(await screen.findByRole('option', { name: 'gpt-3.5-turbo' })).toBeInTheDocument();
        expect(screen.queryByRole('option', { name: 'gpt-4o' })).not.toBeInTheDocument();
    });

    it('toggling Use max output tokens marks the form dirty independently of the context-window toggle', () => {
        render(
            <Provider store={makeStore()}>
                <ModelConfigTab settings={MOCK_SETTINGS} />
            </Provider>,
        );

        expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled();
        fireEvent.click(screen.getByRole('switch', { name: /use max output tokens/i }));

        expect(screen.getByRole('button', { name: /^save$/i })).not.toBeDisabled();
        expect(screen.getByRole('switch', { name: /use context window/i })).not.toBeChecked();
    });
});

describe('ModelConfigTab — token-limit parameter with Ollama provider', () => {
    it('disables both token-limit-parameter radio items when the current provider is Ollama', () => {
        render(
            <Provider store={makeStore(OLLAMA_SETTINGS)}>
                <ModelConfigTab settings={OLLAMA_SETTINGS} />
            </Provider>,
        );

        expect(screen.getByRole('radio', { name: /max_completion_tokens/i })).toBeDisabled();
        expect(screen.getByRole('radio', { name: /max_tokens \(legacy\)/i })).toBeDisabled();
    });

    it('keeps both token-limit-parameter radio items enabled for a non-Ollama provider', () => {
        render(
            <Provider store={makeStore(MOCK_SETTINGS)}>
                <ModelConfigTab settings={MOCK_SETTINGS} />
            </Provider>,
        );

        expect(screen.getByRole('radio', { name: /max_completion_tokens/i })).not.toBeDisabled();
        expect(screen.getByRole('radio', { name: /max_tokens \(legacy\)/i })).not.toBeDisabled();
    });

    it('shows the Ollama-specific explanation when the current provider is Ollama', () => {
        render(
            <Provider store={makeStore(OLLAMA_SETTINGS)}>
                <ModelConfigTab settings={OLLAMA_SETTINGS} />
            </Provider>,
        );

        expect(screen.getByText(/built-in chat protocol/i)).toBeInTheDocument();
    });

    it('hides the Ollama-specific explanation for a non-Ollama provider', () => {
        render(
            <Provider store={makeStore(MOCK_SETTINGS)}>
                <ModelConfigTab settings={MOCK_SETTINGS} />
            </Provider>,
        );

        expect(screen.queryByText(/built-in chat protocol/i)).not.toBeInTheDocument();
    });
});
