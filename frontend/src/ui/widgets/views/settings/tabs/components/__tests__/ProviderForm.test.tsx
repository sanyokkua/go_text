import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';

import { ProviderPresets as fetchBridgeMockPresets } from '../../../../../../../dev/bridge-mock/go/main/SettingsHandler';
import { ActionHandlerAdapter } from '../../../../../../../logic/adapter';
import { ProviderConfig } from '../../../../../../../logic/adapter/models';
import uiReducer from '../../../../../../../logic/store/ui/slice';
import ProviderForm, { BLANK_PROVIDER } from '../ProviderForm';

// ProviderForm reaches out to the backend for model discovery and verification.
// Stub the adapter so the form renders synchronously without live calls. The
// extra exports (getLogger, unwrap, fromWire*) are pulled transitively via the
// VerificationPanel → store thunks import chain.
jest.mock('../../../../../../../logic/adapter', () => ({
    ActionHandlerAdapter: {
        getModels: jest.fn().mockResolvedValue({ data: [], error: null }),
        testConnection: jest.fn().mockResolvedValue({ data: { check: 'connection', ok: true, durationMs: 1 }, error: null }),
        testModels: jest.fn().mockResolvedValue({ data: { check: 'models', ok: true, durationMs: 1, modelCount: 0 }, error: null }),
        testInference: jest.fn().mockResolvedValue({ data: { check: 'inference', ok: true, durationMs: 1, sample: 'hi' }, error: null }),
    },
    SettingsHandlerAdapter: { getSettings: jest.fn().mockResolvedValue({ data: null, error: null }) },
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

const AZURE_PROVIDER: ProviderConfig = {
    providerId: 'p-azure',
    providerName: 'Azure OpenAI',
    providerType: 'azure',
    baseUrl: 'https://my-resource.openai.azure.com/',
    modelsEndpoint: 'openai/deployments?api-version=2024-10-21',
    completionEndpoint: 'openai/deployments/{deployment}/chat/completions',
    authType: 'api-key',
    authToken: '',
    useAuthTokenFromEnv: true,
    envVarTokenName: 'AZURE_OPENAI_API_KEY',
    apiVersion: '2024-10-21',
    selectedModel: 'gpt-4o',
    useCustomHeaders: false,
    headers: {},
    useCustomModels: false,
    customModels: [],
};

const OLLAMA_PROVIDER: ProviderConfig = {
    providerId: 'p-ollama',
    providerName: 'Local Ollama',
    providerType: 'ollama',
    baseUrl: 'http://localhost:11434/',
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
};

function renderForm() {
    return renderFormWithProvider(AZURE_PROVIDER);
}

function renderFormWithProvider(providerConfig: ProviderConfig) {
    // VerificationPanel inside the form reads ui.inferenceRunning from the store.
    const store = configureStore({ reducer: { ui: uiReducer } });
    return render(
        <Provider store={store}>
            <ProviderForm
                provider={providerConfig}
                isNew={false}
                presets={[]}
                authTypes={['none', 'bearer', 'api-key']}
                providerTypes={['openai', 'azure', 'anthropic', 'ollama']}
                existingNames={[]}
                isCurrent={false}
                onSave={jest.fn()}
                onDelete={jest.fn()}
                onSetCurrent={jest.fn()}
                onCancel={jest.fn()}
            />
        </Provider>,
    );
}

describe('ProviderForm two-column layout', () => {
    // CSS-module class names do not resolve in this jsdom harness, so the
    // two-column grouping is asserted structurally: each pair must share a
    // dedicated wrapper that excludes an unrelated single-column field (Base
    // URL). This fails on the old single-column layout where every field
    // shared the form root.
    it('wraps the models and completion endpoint fields in one dedicated container', async () => {
        renderForm();

        const modelsInput = await screen.findByLabelText(/models endpoint/i);
        const completionInput = screen.getByLabelText(/completion endpoint/i);
        const baseUrlInput = screen.getByLabelText(/base url/i);

        // modelsInput → .field div → .grid2 wrapper
        const grid = modelsInput.closest('div')?.parentElement ?? null;
        expect(grid).toContainElement(completionInput);
        expect(grid).not.toContainElement(baseUrlInput);
    });

    it('wraps the API version and model fields in one dedicated container', async () => {
        renderForm();

        const apiVersionInput = await screen.findByLabelText(/api version/i);
        const modelTrigger = screen.getByRole('button', { name: 'Model' });
        const baseUrlInput = screen.getByLabelText(/base url/i);

        const grid = apiVersionInput.closest('div')?.parentElement ?? null;
        expect(grid).toContainElement(modelTrigger);
        expect(grid).not.toContainElement(baseUrlInput);
    });
});

describe('ProviderForm completion endpoint — Ollama no-op guard', () => {
    // Finding #3: Ollama's native chat path never reads the completion-endpoint
    // override, so the field is disabled (not hidden) with an explanation for
    // that provider kind only.
    it('disables the completion endpoint input for an Ollama provider', async () => {
        renderFormWithProvider(OLLAMA_PROVIDER);

        const completionInput = await screen.findByLabelText(/completion endpoint/i);
        expect(completionInput).toBeDisabled();
    });

    it('leaves the completion endpoint input enabled for a non-Ollama provider', async () => {
        renderFormWithProvider(AZURE_PROVIDER);

        const completionInput = await screen.findByLabelText(/completion endpoint/i);
        expect(completionInput).not.toBeDisabled();
    });

    it('shows the Ollama-specific explanation when the provider kind is Ollama', async () => {
        renderFormWithProvider(OLLAMA_PROVIDER);

        expect(await screen.findByText(/built-in chat protocol/i)).toBeInTheDocument();
    });

    it('does not show the Ollama-specific explanation for a non-Ollama provider', async () => {
        renderFormWithProvider(AZURE_PROVIDER);

        await screen.findByLabelText(/completion endpoint/i);
        expect(screen.queryByText(/built-in chat protocol/i)).not.toBeInTheDocument();
    });
});

// Preset fixtures mirror the backend `apperr.ProviderPreset` wire shape (all 8
// string fields). They are passed as plain object literals — the prop type is
// satisfied structurally without importing the wailsjs class.
const LM_STUDIO_PRESET = {
    name: 'LM Studio',
    kind: 'lmstudio',
    baseUrl: 'http://localhost:1234/',
    authScheme: 'none',
    completionPath: '/v1/chat/completions',
    modelsPath: '/v1/models',
    apiKeyEnvVar: '',
    headers: '',
};

const OPENAI_PRESET = {
    name: 'OpenAI',
    kind: 'openai',
    baseUrl: 'https://api.openai.com/',
    authScheme: 'bearer',
    completionPath: '/v1/chat/completions',
    modelsPath: '/v1/models',
    apiKeyEnvVar: 'OPENAI_API_KEY',
    headers: '',
};

const ALL_PRESETS = [
    LM_STUDIO_PRESET,
    { ...OPENAI_PRESET, name: 'Llama.cpp', kind: 'llamacpp', baseUrl: 'http://localhost:8080/', authScheme: 'none', apiKeyEnvVar: '' },
    { ...OPENAI_PRESET, name: 'Ollama', kind: 'ollama', baseUrl: 'http://localhost:11434/', authScheme: 'none', apiKeyEnvVar: '' },
    OPENAI_PRESET,
    { ...OPENAI_PRESET, name: 'OpenRouter', kind: 'openai', baseUrl: 'https://openrouter.ai/api/', apiKeyEnvVar: 'OPENROUTER_API_KEY' },
];

function renderNewForm(presets: typeof ALL_PRESETS) {
    const store = configureStore({ reducer: { ui: uiReducer } });
    return render(
        <Provider store={store}>
            <ProviderForm
                provider={BLANK_PROVIDER}
                isNew={true}
                presets={presets}
                authTypes={['none', 'bearer', 'api-key']}
                providerTypes={['openai', 'lmstudio', 'ollama', 'llamacpp', 'azure']}
                existingNames={[]}
                isCurrent={false}
                onSave={jest.fn()}
                onDelete={jest.fn()}
                onSetCurrent={jest.fn()}
                onCancel={jest.fn()}
            />
        </Provider>,
    );
}

describe('ProviderForm preset quick-fill', () => {
    it('renders a button for every preset when creating a new provider', () => {
        renderNewForm(ALL_PRESETS);

        for (const name of ['LM Studio', 'Llama.cpp', 'Ollama', 'OpenAI', 'OpenRouter']) {
            expect(screen.getByRole('button', { name })).toBeInTheDocument();
        }
    });

    it('fills the Base URL field from the clicked preset', async () => {
        renderNewForm(ALL_PRESETS);

        await userEvent.click(screen.getByRole('button', { name: 'LM Studio' }));

        expect(screen.getByLabelText(/base url/i)).toHaveValue('http://localhost:1234/');
    });

    it('activates the matching auth type and reveals the env-var field for an authenticated preset', async () => {
        renderNewForm(ALL_PRESETS);

        // OpenAI uses a bearer token, so the Bearer auth segment becomes pressed
        // and the (initially hidden) API-key env-var input appears, pre-filled.
        await userEvent.click(screen.getByRole('button', { name: 'OpenAI' }));

        expect(screen.getByRole('button', { name: 'Bearer' })).toHaveAttribute('aria-pressed', 'true');
        expect(screen.getByLabelText(/api key environment variable/i)).toHaveValue('OPENAI_API_KEY');
        expect(screen.getByLabelText(/base url/i)).toHaveValue('https://api.openai.com/');
    });

    // Regression test: hand-built fixtures above (ALL_PRESETS) passed even when
    // the bridge-mock's real preset data used the wrong field casing (`baseURL`
    // instead of `baseUrl`), because a plain object literal in this file can't
    // catch a typo in a completely different file. This test sources presets
    // from the actual bridge-mock function so a field-name regression there
    // fails here too.
    it('applies every real bridge-mock preset without crashing and populates Base URL correctly', async () => {
        const { data: realPresets } = await fetchBridgeMockPresets();
        renderNewForm(realPresets as typeof ALL_PRESETS);

        for (const preset of realPresets as typeof ALL_PRESETS) {
            await userEvent.click(screen.getByRole('button', { name: preset.name }));
            expect(screen.getByLabelText(/base url/i)).toHaveValue(preset.baseUrl);
        }
    });

    it('does not render preset buttons when editing an existing provider (isNew false)', () => {
        const store = configureStore({ reducer: { ui: uiReducer } });
        render(
            <Provider store={store}>
                <ProviderForm
                    provider={AZURE_PROVIDER}
                    isNew={false}
                    presets={ALL_PRESETS}
                    authTypes={['none', 'bearer', 'api-key']}
                    providerTypes={['openai', 'azure']}
                    existingNames={[]}
                    isCurrent={false}
                    onSave={jest.fn()}
                    onDelete={jest.fn()}
                    onSetCurrent={jest.fn()}
                    onCancel={jest.fn()}
                />
            </Provider>,
        );

        expect(screen.queryByRole('button', { name: 'LM Studio' })).not.toBeInTheDocument();
        expect(screen.queryByText(/start from a preset/i)).not.toBeInTheDocument();
    });
});

describe('ProviderForm model picker — populated by Test models', () => {
    afterEach(() => {
        // clearMocks (jest.config.cjs) resets call history but not a mock's resolved
        // value, so a test that customizes testModels must restore the shared default.
        (ActionHandlerAdapter.testModels as jest.Mock).mockResolvedValue({
            data: { check: 'models', ok: true, durationMs: 1, modelCount: 0 },
            error: null,
        });
    });

    // Regression coverage for the "test models before Save" gap: a brand-new,
    // unsaved provider draft (providerId === '') has no persisted ID to discover
    // models by, so this is the ONLY way its picker can list models before Save.
    it('populates the model picker from a successful Test models run, without Save', async () => {
        (ActionHandlerAdapter.testModels as jest.Mock).mockResolvedValue({
            data: {
                check: 'models',
                ok: true,
                durationMs: 5,
                modelCount: 2,
                sample: 'gpt-4o',
                models: [
                    { id: 'gpt-4o', label: 'gpt-4o' },
                    { id: 'gpt-4o-mini', label: 'gpt-4o-mini' },
                ],
            },
            error: null,
        });
        renderNewForm([]);

        await userEvent.click(screen.getByRole('button', { name: 'Test models' }));

        await userEvent.click(await screen.findByRole('button', { name: 'Model' }));
        expect(await screen.findByRole('option', { name: 'gpt-4o' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'gpt-4o-mini' })).toBeInTheDocument();
    });

    it('does not touch the model picker when Test models fails', async () => {
        (ActionHandlerAdapter.testModels as jest.Mock).mockResolvedValue({
            data: null,
            error: { code: 'provider_unreachable', message: 'unreachable' },
        });
        renderNewForm([]);

        await userEvent.click(screen.getByRole('button', { name: 'Test models' }));
        await screen.findByText(/✗/);

        await userEvent.click(screen.getByRole('button', { name: 'Model' }));
        expect(screen.queryByRole('option')).not.toBeInTheDocument();
    });
});
