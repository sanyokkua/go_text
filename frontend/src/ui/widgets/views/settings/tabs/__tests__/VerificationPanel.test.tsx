import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { ProviderConfig } from '../../../../../../logic/adapter/models';
import notificationsReducer from '../../../../../../logic/store/notifications/slice';
import settingsReducer from '../../../../../../logic/store/settings/slice';
import uiReducer from '../../../../../../logic/store/ui/slice';
import VerificationPanel from '../components/VerificationPanel';

const DRAFT: ProviderConfig = {
    providerId: 'p1',
    providerName: 'Test',
    providerType: 'openai',
    baseUrl: 'http://localhost:1234/',
    modelsEndpoint: '',
    completionEndpoint: '',
    authType: 'none',
    authToken: '',
    useAuthTokenFromEnv: true,
    envVarTokenName: '',
    apiVersion: '',
    selectedModel: 'gpt-4o',
    useCustomHeaders: false,
    headers: {},
    useCustomModels: false,
    customModels: [],
};

jest.mock('../../../../../../logic/adapter', () => ({
    ActionHandlerAdapter: {
        testConnection: jest.fn().mockResolvedValue({ data: { check: 'connection', ok: true, durationMs: 100 }, error: null }),
        testModels: jest.fn().mockResolvedValue({ data: { check: 'models', ok: true, durationMs: 50, modelCount: 3 }, error: null }),
        testInference: jest.fn().mockResolvedValue({ data: { check: 'inference', ok: true, durationMs: 200, sample: 'Hello' }, error: null }),
        getModels: jest.fn().mockResolvedValue({ data: [], error: null }),
    },
    SettingsHandlerAdapter: { getSettings: jest.fn().mockResolvedValue({ data: null, error: null }) },
    getLogger: () => ({ logInfo: jest.fn(), logDebug: jest.fn(), logError: jest.fn(), logWarn: jest.fn() }),
    unwrap: jest.fn((r: { data: unknown; error: { message: string } | null }) => {
        if (r?.error) throw new Error(r.error.message);
        return r?.data;
    }),
}));

function makeStore(uiOverride = {}) {
    return configureStore({
        reducer: { settings: settingsReducer, ui: uiReducer, notifications: notificationsReducer },
        preloadedState: {
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
                ...uiOverride,
            },
        },
    });
}

describe('VerificationPanel', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('renders three check rows: Test connection, Test models, Test inference', () => {
        render(
            <Provider store={makeStore()}>
                <VerificationPanel providerConfig={DRAFT} />
            </Provider>,
        );
        expect(screen.getByRole('button', { name: /test connection/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /test models/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /test inference/i })).toBeInTheDocument();
    });

    it('all three check buttons are initially enabled', () => {
        render(
            <Provider store={makeStore()}>
                <VerificationPanel providerConfig={DRAFT} />
            </Provider>,
        );
        expect(screen.getByRole('button', { name: /test connection/i })).toBeEnabled();
        expect(screen.getByRole('button', { name: /test models/i })).toBeEnabled();
        expect(screen.getByRole('button', { name: /test inference/i })).toBeEnabled();
    });

    it('Test inference button is disabled when inferenceRunning is true in the store', () => {
        render(
            <Provider store={makeStore({ inferenceRunning: true })}>
                <VerificationPanel providerConfig={DRAFT} />
            </Provider>,
        );
        expect(screen.getByRole('button', { name: /test inference/i })).toBeDisabled();
    });

    it('Test connection and Test models buttons remain enabled when inferenceRunning is true', () => {
        render(
            <Provider store={makeStore({ inferenceRunning: true })}>
                <VerificationPanel providerConfig={DRAFT} />
            </Provider>,
        );
        expect(screen.getByRole('button', { name: /test connection/i })).toBeEnabled();
        expect(screen.getByRole('button', { name: /test models/i })).toBeEnabled();
    });

    it('calls testConnection with the draft provider config when Test connection is clicked', async () => {
        const { ActionHandlerAdapter } = jest.requireMock('../../../../../../logic/adapter');
        render(
            <Provider store={makeStore()}>
                <VerificationPanel providerConfig={DRAFT} />
            </Provider>,
        );
        await userEvent.click(screen.getByRole('button', { name: /test connection/i }));
        await waitFor(() => {
            expect(ActionHandlerAdapter.testConnection).toHaveBeenCalledWith(DRAFT);
        });
    });

    it('shows a success indicator after a successful connection test', async () => {
        render(
            <Provider store={makeStore()}>
                <VerificationPanel providerConfig={DRAFT} />
            </Provider>,
        );
        await userEvent.click(screen.getByRole('button', { name: /test connection/i }));
        await waitFor(() => {
            expect(screen.getByText(/✓ 100ms/)).toBeInTheDocument();
        });
    });

    it('calls onModelsDiscovered with the discovered list after a successful models test', async () => {
        const { ActionHandlerAdapter } = jest.requireMock('../../../../../../logic/adapter');
        ActionHandlerAdapter.testModels.mockResolvedValueOnce({
            data: {
                check: 'models',
                ok: true,
                durationMs: 50,
                modelCount: 2,
                sample: 'gpt-4o',
                models: [
                    { id: 'gpt-4o', label: 'gpt-4o' },
                    { id: 'gpt-4o-mini', label: 'gpt-4o-mini' },
                ],
            },
            error: null,
        });
        const onModelsDiscovered = jest.fn();
        render(
            <Provider store={makeStore()}>
                <VerificationPanel providerConfig={DRAFT} onModelsDiscovered={onModelsDiscovered} />
            </Provider>,
        );

        await userEvent.click(screen.getByRole('button', { name: /test models/i }));

        await waitFor(() => {
            expect(onModelsDiscovered).toHaveBeenCalledWith([
                { id: 'gpt-4o', label: 'gpt-4o' },
                { id: 'gpt-4o-mini', label: 'gpt-4o-mini' },
            ]);
        });
    });

    it('does not call onModelsDiscovered when the models test succeeds without a models list', async () => {
        // Default mock resolves { ok: true, modelCount: 3 } with no `models` field —
        // mirrors a "connection"/"inference" outcome shape, which must not trigger it.
        const onModelsDiscovered = jest.fn();
        render(
            <Provider store={makeStore()}>
                <VerificationPanel providerConfig={DRAFT} onModelsDiscovered={onModelsDiscovered} />
            </Provider>,
        );

        await userEvent.click(screen.getByRole('button', { name: /test models/i }));

        await waitFor(() => {
            expect(screen.getByText(/✓ 50ms/)).toBeInTheDocument();
        });
        expect(onModelsDiscovered).not.toHaveBeenCalled();
    });

    it('does not call onModelsDiscovered when the models test fails', async () => {
        const { ActionHandlerAdapter } = jest.requireMock('../../../../../../logic/adapter');
        ActionHandlerAdapter.testModels.mockResolvedValueOnce({ data: null, error: { code: 'provider_unreachable', message: 'unreachable' } });
        const onModelsDiscovered = jest.fn();
        render(
            <Provider store={makeStore()}>
                <VerificationPanel providerConfig={DRAFT} onModelsDiscovered={onModelsDiscovered} />
            </Provider>,
        );

        await userEvent.click(screen.getByRole('button', { name: /test models/i }));

        await waitFor(() => {
            expect(screen.getByText(/✗/)).toBeInTheDocument();
        });
        expect(onModelsDiscovered).not.toHaveBeenCalled();
    });
});
