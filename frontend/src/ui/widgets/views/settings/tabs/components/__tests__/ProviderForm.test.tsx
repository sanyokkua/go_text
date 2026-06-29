import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';

import { ProviderConfig } from '../../../../../../../logic/adapter/models';
import uiReducer from '../../../../../../../logic/store/ui/slice';
import ProviderForm from '../ProviderForm';

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
    SettingsHandlerAdapter: {
        getSettings: jest.fn().mockResolvedValue({ data: null, error: null }),
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

function renderForm() {
    // VerificationPanel inside the form reads ui.inferenceRunning from the store.
    const store = configureStore({ reducer: { ui: uiReducer } });
    return render(
        <Provider store={store}>
            <ProviderForm
                provider={AZURE_PROVIDER}
                authTypes={['none', 'bearer', 'api-key']}
                providerTypes={['openai', 'azure', 'anthropic']}
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
        const modelTrigger = screen.getByRole('combobox', { name: 'Model' });
        const baseUrlInput = screen.getByLabelText(/base url/i);

        const grid = apiVersionInput.closest('div')?.parentElement ?? null;
        expect(grid).toContainElement(modelTrigger);
        expect(grid).not.toContainElement(baseUrlInput);
    });
});
