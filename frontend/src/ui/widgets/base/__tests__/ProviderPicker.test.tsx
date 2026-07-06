jest.mock('../../../../logic/adapter', () => ({
    getLogger: () => ({ logDebug: jest.fn(), logInfo: jest.fn(), logError: jest.fn(), logWarning: jest.fn() }),
    SettingsHandlerAdapter: {
        // Resolves with a wire-shaped provider matching the requested id so the
        // settings reducer (which syncs modelConfig.name from the payload) has a
        // realistic object to work with, mirroring what the real backend returns.
        setAsCurrentProviderConfig: jest
            .fn()
            .mockImplementation((providerId: string) =>
                Promise.resolve({
                    data: {
                        providerId,
                        providerName: providerId === 'lmstudio' ? 'LM Studio' : 'Ollama',
                        providerType: providerId,
                        baseUrl: 'http://localhost',
                        modelsEndpoint: '/v1/models',
                        completionEndpoint: '/v1/chat/completions',
                        authType: 'none',
                        authToken: '',
                        useAuthTokenFromEnv: false,
                        envVarTokenName: '',
                        apiVersion: '',
                        selectedModel: 'test-model',
                        useCustomHeaders: false,
                        headers: {},
                        useCustomModels: false,
                        customModels: [],
                    },
                    error: null,
                }),
            ),
    },
    fromWireProvider: (p: unknown) => p,
    unwrap: (res: { data?: unknown; error?: unknown }) => {
        if (res?.error) throw res.error;
        return res?.data;
    },
}));

import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';

import { SettingsHandlerAdapter } from '../../../../logic/adapter';
import { ProviderConfig, Settings } from '../../../../logic/adapter/models';
import settingsReducer from '../../../../logic/store/settings/slice';
import ProviderPicker from '../ProviderPicker';

function makeProvider(overrides: Partial<ProviderConfig>): ProviderConfig {
    return {
        providerId: 'ollama',
        providerName: 'Ollama',
        providerType: 'ollama',
        baseUrl: 'http://localhost:11434',
        modelsEndpoint: '/v1/models',
        completionEndpoint: '/v1/chat/completions',
        authType: 'none',
        authToken: '',
        useAuthTokenFromEnv: false,
        envVarTokenName: '',
        apiVersion: '',
        selectedModel: 'gemma3:1b',
        useCustomHeaders: false,
        headers: {},
        useCustomModels: false,
        customModels: [],
        ...overrides,
    };
}

function makeStore(opts: { currentProviderConfig?: ProviderConfig | null; availableProviderConfigs?: ProviderConfig[] } = {}) {
    return configureStore({
        reducer: { settings: settingsReducer },
        preloadedState: {
            settings: {
                allSettings: {
                    currentProviderConfig: opts.currentProviderConfig ?? null,
                    availableProviderConfigs: opts.availableProviderConfigs ?? [],
                    modelConfig: { name: 'initial-model' },
                } as unknown as Settings,
                metadata: null,
            },
        },
    });
}

function renderProviderPicker(opts: Parameters<typeof makeStore>[0] = {}) {
    const store = makeStore(opts);
    render(
        <Provider store={store}>
            <ProviderPicker />
        </Provider>,
    );
    return store;
}

describe('ProviderPicker', () => {
    let mockSetAsCurrentProviderConfig: jest.Mock;

    beforeEach(() => {
        mockSetAsCurrentProviderConfig = SettingsHandlerAdapter.setAsCurrentProviderConfig as jest.Mock;
        mockSetAsCurrentProviderConfig.mockClear();
    });

    it('renders nothing when there are no available provider configs', () => {
        renderProviderPicker({ currentProviderConfig: makeProvider({ providerId: 'ollama' }), availableProviderConfigs: [] });
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('renders nothing when there is no current provider config', () => {
        renderProviderPicker({
            currentProviderConfig: null,
            availableProviderConfigs: [makeProvider({ providerId: 'ollama' }), makeProvider({ providerId: 'lmstudio', providerName: 'LM Studio' })],
        });
        expect(screen.queryByRole('combobox')).not.toBeInTheDocument();
    });

    it('renders a combobox showing the current provider when both are populated', () => {
        const ollama = makeProvider({ providerId: 'ollama', providerName: 'Ollama' });
        const lmstudio = makeProvider({ providerId: 'lmstudio', providerName: 'LM Studio' });
        renderProviderPicker({ currentProviderConfig: ollama, availableProviderConfigs: [ollama, lmstudio] });

        const combobox = screen.getByRole('combobox', { name: 'Provider' });
        expect(combobox).toBeInTheDocument();
        expect(combobox).toHaveTextContent('Ollama');
    });

    it('dispatches setAsCurrentProviderConfig with the selected provider id when a different option is chosen', async () => {
        const ollama = makeProvider({ providerId: 'ollama', providerName: 'Ollama' });
        const lmstudio = makeProvider({ providerId: 'lmstudio', providerName: 'LM Studio' });
        renderProviderPicker({ currentProviderConfig: ollama, availableProviderConfigs: [ollama, lmstudio] });

        await userEvent.click(screen.getByRole('combobox', { name: 'Provider' }));
        await userEvent.click(screen.getByRole('option', { name: 'LM Studio' }));

        expect(mockSetAsCurrentProviderConfig).toHaveBeenCalledWith('lmstudio');
    });
});
