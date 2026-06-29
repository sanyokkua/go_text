import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { openPath } from '../../../../../../logic/adapter';
import { AppSettingsMetadata, Settings } from '../../../../../../logic/adapter/models';
import historyReducer from '../../../../../../logic/store/history/slice';
import notificationsReducer from '../../../../../../logic/store/notifications/slice';
import settingsReducer from '../../../../../../logic/store/settings/slice';
import uiReducer from '../../../../../../logic/store/ui/slice';
import AppBehaviorTab from '../AppBehaviorTab';

jest.mock('../../../../../../logic/adapter', () => ({
    SettingsHandlerAdapter: {
        updateAppBehaviorConfig: jest.fn().mockResolvedValue({ data: null, error: null }),
        getSettings: jest.fn().mockResolvedValue({ data: null, error: null }),
    },
    HistoryHandlerAdapter: {
        clearHistory: jest.fn().mockResolvedValue({ data: null, error: null }),
        listHistory: jest.fn().mockResolvedValue({ data: [], error: null }),
        deleteHistoryEntry: jest.fn().mockResolvedValue({ data: null, error: null }),
    },
    getLogger: () => ({ logInfo: jest.fn(), logDebug: jest.fn(), logError: jest.fn(), logWarn: jest.fn() }),
    openExternal: jest.fn(),
    openPath: jest.fn().mockResolvedValue(undefined),
    unwrap: (r: { data: unknown; error: { message: string } | null }) => {
        if (r?.error) throw new Error(r.error.message);
        return r?.data;
    },
    fromWireSettings: (v: unknown) => v,
    fromWireBehavior: (v: unknown) => v,
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
    languageConfig: { languages: ['English'], defaultInputLanguage: 'English', defaultOutputLanguage: 'English' },
    appBehaviorConfig: { enableTaskLogging: false, logDirectory: '/tmp/logs', historyEnabled: true, historyMaxEntries: 500 },
};

const MOCK_METADATA: AppSettingsMetadata = {
    authTypes: ['none', 'bearer', 'api-key'],
    providerTypes: ['openai'],
    settingsFolder: '/Users/test/.config/GoText',
    settingsFile: '/Users/test/.config/GoText/settings.db',
    logsFolder: '/Users/test/.local/share/GoText/logs',
    appVersion: '3.0.0-test',
};

function makeStore() {
    return configureStore({
        reducer: { settings: settingsReducer, ui: uiReducer, notifications: notificationsReducer, history: historyReducer },
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
            history: { entries: [], selectedId: null, loading: false, hasMore: false, total: 0 },
        },
    });
}

describe('AppBehaviorTab', () => {
    it('renders task logging switch in unchecked state', () => {
        render(
            <Provider store={makeStore()}>
                <AppBehaviorTab settings={MOCK_SETTINGS} metadata={MOCK_METADATA} />
            </Provider>,
        );
        expect(screen.getByRole('switch', { name: /enable task logging/i })).not.toBeChecked();
    });

    it('renders log directory path from metadata', () => {
        render(
            <Provider store={makeStore()}>
                <AppBehaviorTab settings={MOCK_SETTINGS} metadata={MOCK_METADATA} />
            </Provider>,
        );
        expect(screen.getByText('/Users/test/.local/share/GoText/logs')).toBeInTheDocument();
    });

    it('renders history enabled switch in checked state', () => {
        render(
            <Provider store={makeStore()}>
                <AppBehaviorTab settings={MOCK_SETTINGS} metadata={MOCK_METADATA} />
            </Provider>,
        );
        expect(screen.getByRole('switch', { name: /enable history/i })).toBeChecked();
    });

    it('renders max history entries input with value 500', () => {
        render(
            <Provider store={makeStore()}>
                <AppBehaviorTab settings={MOCK_SETTINGS} metadata={MOCK_METADATA} />
            </Provider>,
        );
        expect(screen.getByRole('spinbutton', { name: /maximum number of history entries/i })).toHaveValue(500);
    });

    it('renders Clear history button', () => {
        render(
            <Provider store={makeStore()}>
                <AppBehaviorTab settings={MOCK_SETTINGS} metadata={MOCK_METADATA} />
            </Provider>,
        );
        expect(screen.getByRole('button', { name: /clear history/i })).toBeInTheDocument();
    });

    it('renders an Open logs folder button', () => {
        render(
            <Provider store={makeStore()}>
                <AppBehaviorTab settings={MOCK_SETTINGS} metadata={MOCK_METADATA} />
            </Provider>,
        );
        expect(screen.getByRole('button', { name: /open logs folder/i })).toBeInTheDocument();
    });

    it('opens the resolved logs folder path without a file:// prefix when clicked', async () => {
        const openPathMock = openPath as jest.MockedFunction<typeof openPath>;
        openPathMock.mockClear();
        render(
            <Provider store={makeStore()}>
                <AppBehaviorTab settings={MOCK_SETTINGS} metadata={MOCK_METADATA} />
            </Provider>,
        );

        await userEvent.click(screen.getByRole('button', { name: /open logs folder/i }));

        // The side-effect IS the test goal: handleOpenLogs must call openPath with
        // the bare path from metadata.logsFolder — no file:// scheme prefix.
        expect(openPathMock).toHaveBeenCalledWith('/Users/test/.local/share/GoText/logs');
        expect(openPathMock.mock.calls[0][0]).not.toContain('file://');
    });

    it('enqueues a success toast after the task-logging toggle write resolves', async () => {
        const store = makeStore();
        render(
            <Provider store={store}>
                <AppBehaviorTab settings={MOCK_SETTINGS} metadata={MOCK_METADATA} />
            </Provider>,
        );

        await userEvent.click(screen.getByRole('switch', { name: /enable task logging/i }));

        await waitFor(() => {
            expect(store.getState().notifications.queue).toContainEqual(
                expect.objectContaining({ severity: 'success', surface: 'toast', message: 'Task logging enabled' }),
            );
        });
    });
});
