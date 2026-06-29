jest.mock('../../../../logic/adapter', () => ({
    getLogger: () => ({ logDebug: jest.fn(), logInfo: jest.fn(), logError: jest.fn(), logWarning: jest.fn() }),
    unwrap: jest.fn((r: { data?: unknown; error?: unknown }) => {
        if (r?.error) throw r.error;
        return r?.data;
    }),
    ActionHandlerAdapter: { getModels: jest.fn().mockResolvedValue({ data: [], error: null }) },
    SettingsHandlerAdapter: { updateModelConfig: jest.fn().mockResolvedValue({ data: null, error: null }) },
    fromWireProvider: jest.fn((p: unknown) => p),
}));

import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { ActionHandlerAdapter, SettingsHandlerAdapter } from '../../../../logic/adapter';
import settingsReducer from '../../../../logic/store/settings/slice';
import { TooltipProvider } from '../../../primitives/Tooltip';
import ModelPicker from '../ModelPicker';

const PROVIDER = {
    providerId: 'ollama',
    providerName: 'Ollama',
    providerType: 'ollama',
    baseUrl: '',
    modelsEndpoint: '',
    completionEndpoint: '',
    authType: '',
    authToken: '',
    useAuthTokenFromEnv: false,
    envVarTokenName: '',
    useCustomHeaders: false,
    headers: {},
    selectedModel: 'qwen3:0.6b',
    useCustomModels: false,
    customModels: [],
};

function makeStore(discoveredModels: string[]) {
    return configureStore({
        reducer: { settings: settingsReducer },
        preloadedState: {
            settings: {
                allSettings: {
                    availableProviderConfigs: [PROVIDER],
                    currentProviderConfig: PROVIDER,
                    inferenceBaseConfig: { timeout: 60, maxRetries: 3, useMarkdownForOutput: false },
                    modelConfig: {
                        name: 'qwen3:0.6b',
                        useTemperature: false,
                        temperature: 0,
                        useContextWindow: false,
                        contextWindow: 0,
                        useLegacyMaxTokens: false,
                    },
                    languageConfig: { languages: [], defaultInputLanguage: '', defaultOutputLanguage: '' },
                    appBehaviorConfig: { enableTaskLogging: false, logDirectory: '' },
                } as never,
                metadata: null,
                discoveredModels,
            },
        },
    });
}

function renderPicker(discoveredModels: string[]) {
    const store = makeStore(discoveredModels);
    render(
        <Provider store={store}>
            <TooltipProvider>
                <ModelPicker />
            </TooltipProvider>
        </Provider>,
    );
    return store;
}

describe('ModelPicker', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('auto-discovers the current provider models on first mount', async () => {
        renderPicker(['qwen3:0.6b']);

        await waitFor(() => {
            expect(ActionHandlerAdapter.getModels).toHaveBeenCalledWith('ollama');
        });
    });

    it('exposes every discovered model plus the current model as options', async () => {
        (ActionHandlerAdapter.getModels as jest.Mock).mockResolvedValue({
            data: [{ id: 'qwen3:0.6b', label: 'qwen3:0.6b' }, { id: 'llama3', label: 'llama3' }],
            error: null,
        });
        renderPicker(['qwen3:0.6b', 'llama3']);

        await userEvent.click(screen.getByRole('combobox'));

        expect(await screen.findByRole('option', { name: 'qwen3:0.6b' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'llama3' })).toBeInTheDocument();
    });

    it('persists the chosen model via updateModelConfig when a new option is selected', async () => {
        (ActionHandlerAdapter.getModels as jest.Mock).mockResolvedValue({
            data: [{ id: 'qwen3:0.6b', label: 'qwen3:0.6b' }, { id: 'llama3', label: 'llama3' }],
            error: null,
        });
        renderPicker(['qwen3:0.6b', 'llama3']);

        await userEvent.click(screen.getByRole('combobox'));
        await userEvent.click(await screen.findByRole('option', { name: 'llama3' }));

        await waitFor(() => {
            expect(SettingsHandlerAdapter.updateModelConfig).toHaveBeenCalledWith(expect.objectContaining({ name: 'llama3' }));
        });
    });

    it('dispatches model discovery when the refresh button is clicked', async () => {
        (ActionHandlerAdapter.getModels as jest.Mock).mockClear();
        renderPicker(['qwen3:0.6b']);

        await userEvent.click(screen.getByRole('button', { name: /refresh model list/i }));

        await waitFor(() => {
            expect(ActionHandlerAdapter.getModels).toHaveBeenCalledWith('ollama');
        });
    });
});
