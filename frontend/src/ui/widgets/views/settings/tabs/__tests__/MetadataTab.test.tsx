import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { openPath } from '../../../../../../logic/adapter';
import { AppSettingsMetadata, Settings } from '../../../../../../logic/adapter/models';
import notificationsReducer from '../../../../../../logic/store/notifications/slice';
import settingsReducer from '../../../../../../logic/store/settings/slice';
import uiReducer from '../../../../../../logic/store/ui/slice';
import MetadataTab from '../MetadataTab';

jest.mock('../../../../../../logic/adapter', () => ({
    ClipboardServiceAdapter: { setText: jest.fn().mockResolvedValue(undefined) },
    SettingsHandlerAdapter: {
        getSettings: jest.fn().mockResolvedValue({ data: null, error: null }),
        resetSettingsToDefault: jest.fn().mockResolvedValue({ data: null, error: null }),
    },
    openPath: jest.fn().mockResolvedValue({ data: null, error: null }),
    getLogger: () => ({ logInfo: jest.fn(), logDebug: jest.fn(), logError: jest.fn(), logWarn: jest.fn() }),
    unwrap: (r: { data: unknown; error: { message: string } | null }) => {
        if (r?.error) throw new Error(r.error.message);
        return r?.data;
    },
    fromWireSettings: (v: unknown) => v,
    fromWireMetadata: (v: unknown) => v,
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
                appBarVisibility: { providerModelSelectors: true, languagePicker: true, outputFormatToggle: true, outputModeToggle: true, layoutToggle: true, commandPaletteButton: true, historyButton: true, infoButton: true },
            },
        },
    });
}

describe('MetadataTab', () => {
    it('shows app version from metadata', () => {
        render(
            <Provider store={makeStore()}>
                <MetadataTab />
            </Provider>,
        );
        expect(screen.getByText('3.0.0-test')).toBeInTheDocument();
    });

    it('shows GoText heading', () => {
        render(
            <Provider store={makeStore()}>
                <MetadataTab />
            </Provider>,
        );
        expect(screen.getByRole('heading', { name: /gotext/i })).toBeInTheDocument();
    });

    it('shows the technology stack line', () => {
        render(
            <Provider store={makeStore()}>
                <MetadataTab />
            </Provider>,
        );
        expect(screen.getByText(/Wails · Go · React \+ Radix/)).toBeInTheDocument();
    });

    it('shows database path from metadata', () => {
        render(
            <Provider store={makeStore()}>
                <MetadataTab />
            </Provider>,
        );
        expect(screen.getByText('/Users/test/.config/GoText/settings.db')).toBeInTheDocument();
    });

    it('shows logs folder path from metadata', () => {
        render(
            <Provider store={makeStore()}>
                <MetadataTab />
            </Provider>,
        );
        expect(screen.getByText('/Users/test/.local/share/GoText/logs')).toBeInTheDocument();
    });

    it('renders copy buttons for database path and logs folder', () => {
        render(
            <Provider store={makeStore()}>
                <MetadataTab />
            </Provider>,
        );
        expect(screen.getByRole('button', { name: /copy database path/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /copy logs folder path/i })).toBeInTheDocument();
    });

    it('renders Factory reset button that opens a confirmation dialog', async () => {
        render(
            <Provider store={makeStore()}>
                <MetadataTab />
            </Provider>,
        );
        const resetBtn = screen.getByRole('button', { name: /factory reset/i });
        await userEvent.click(resetBtn);
        expect(screen.getByText(/all settings will be wiped/i)).toBeInTheDocument();
    });

    it('confirmation dialog has a Reset everything button', async () => {
        render(
            <Provider store={makeStore()}>
                <MetadataTab />
            </Provider>,
        );
        await userEvent.click(screen.getByRole('button', { name: /factory reset/i }));
        expect(await screen.findByRole('button', { name: /reset everything/i })).toBeInTheDocument();
    });

    it('dialog closes when cancel is clicked', async () => {
        render(
            <Provider store={makeStore()}>
                <MetadataTab />
            </Provider>,
        );
        await userEvent.click(screen.getByRole('button', { name: /factory reset/i }));
        await screen.findByRole('button', { name: /reset everything/i });
        await userEvent.click(screen.getByRole('button', { name: /cancel/i }));
        await waitFor(() => {
            expect(screen.queryByRole('button', { name: /reset everything/i })).not.toBeInTheDocument();
        });
    });

    it('shows app folder path from metadata', () => {
        render(
            <Provider store={makeStore()}>
                <MetadataTab />
            </Provider>,
        );
        expect(screen.getByText('/Users/test/.config/GoText')).toBeInTheDocument();
    });

    it('shows a plain-language description for the app folder path', () => {
        render(
            <Provider store={makeStore()}>
                <MetadataTab />
            </Provider>,
        );
        expect(screen.getByText(/where gotext stores its settings and database on this machine/i)).toBeInTheDocument();
    });

    it('shows a plain-language description for the logs folder path', () => {
        render(
            <Provider store={makeStore()}>
                <MetadataTab />
            </Provider>,
        );
        expect(screen.getByText(/where gotext writes its log files/i)).toBeInTheDocument();
    });

    it('shows a plain-language description for the database path', () => {
        render(
            <Provider store={makeStore()}>
                <MetadataTab />
            </Provider>,
        );
        expect(screen.getByText(/sqlite database file containing your settings, providers, stacks, and history/i)).toBeInTheDocument();
    });

    it('renders a copy button for the app folder path', () => {
        render(
            <Provider store={makeStore()}>
                <MetadataTab />
            </Provider>,
        );
        expect(screen.getByRole('button', { name: /copy app folder path/i })).toBeInTheDocument();
    });

    it('renders an open button for the app folder', () => {
        render(
            <Provider store={makeStore()}>
                <MetadataTab />
            </Provider>,
        );
        expect(screen.getByRole('button', { name: /open app folder/i })).toBeInTheDocument();
    });

    it('renders an open button for the logs folder', () => {
        render(
            <Provider store={makeStore()}>
                <MetadataTab />
            </Provider>,
        );
        expect(screen.getByRole('button', { name: /open logs folder/i })).toBeInTheDocument();
    });

    it('clicking open app folder calls openPath with the settingsFolder path', async () => {
        const openPathMock = openPath as jest.MockedFunction<typeof openPath>;
        openPathMock.mockClear();
        render(
            <Provider store={makeStore()}>
                <MetadataTab />
            </Provider>,
        );
        await userEvent.click(screen.getByRole('button', { name: /open app folder/i }));
        expect(openPathMock).toHaveBeenCalledWith('/Users/test/.config/GoText');
    });

    it('clicking open logs folder calls openPath with the logsFolder path', async () => {
        const openPathMock = openPath as jest.MockedFunction<typeof openPath>;
        openPathMock.mockClear();
        render(
            <Provider store={makeStore()}>
                <MetadataTab />
            </Provider>,
        );
        await userEvent.click(screen.getByRole('button', { name: /open logs folder/i }));
        expect(openPathMock).toHaveBeenCalledWith('/Users/test/.local/share/GoText/logs');
    });

    it('open app folder button is disabled when metadata is null', () => {
        const storeWithoutMeta = configureStore({
            reducer: { settings: settingsReducer, ui: uiReducer, notifications: notificationsReducer },
            preloadedState: {
                settings: { allSettings: MOCK_SETTINGS, metadata: null },
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
        render(
            <Provider store={storeWithoutMeta}>
                <MetadataTab />
            </Provider>,
        );
        expect(screen.getByRole('button', { name: /open app folder/i })).toBeDisabled();
        expect(screen.getByRole('button', { name: /open logs folder/i })).toBeDisabled();
    });

    it('App folder row appears before Logs folder row in the DOM', () => {
        const { container } = render(
            <Provider store={makeStore()}>
                <MetadataTab />
            </Provider>,
        );
        const appFolderCopyBtn = container.querySelector('[aria-label="Copy app folder path"]');
        const logsFolderCopyBtn = container.querySelector('[aria-label="Copy logs folder path"]');
        expect(appFolderCopyBtn).not.toBeNull();
        expect(logsFolderCopyBtn).not.toBeNull();
        expect(appFolderCopyBtn!.compareDocumentPosition(logsFolderCopyBtn!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });

    it('Logs folder row appears before Database row in the DOM', () => {
        const { container } = render(
            <Provider store={makeStore()}>
                <MetadataTab />
            </Provider>,
        );
        const logsFolderCopyBtn = container.querySelector('[aria-label="Copy logs folder path"]');
        const databaseCopyBtn = container.querySelector('[aria-label="Copy database path"]');
        expect(logsFolderCopyBtn).not.toBeNull();
        expect(databaseCopyBtn).not.toBeNull();
        expect(logsFolderCopyBtn!.compareDocumentPosition(databaseCopyBtn!)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);
    });
});
