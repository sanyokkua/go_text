import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Provider } from 'react-redux';
import { Settings } from '../../../../../logic/adapter/models';
import editorReducer from '../../../../../logic/store/editor/slice';
import notificationsReducer from '../../../../../logic/store/notifications/slice';
import settingsReducer from '../../../../../logic/store/settings/slice';
import uiReducer from '../../../../../logic/store/ui/slice';
import InputPane from '../InputPane';

const mockPreviewPrompt = jest.fn();

jest.mock('../../../../../logic/adapter', () => ({
    ClipboardServiceAdapter: { getText: jest.fn().mockResolvedValue('pasted text') },
    getLogger: () => ({ logInfo: jest.fn(), logDebug: jest.fn(), logError: jest.fn() }),
    ActionHandlerAdapter: { previewPrompt: (req: unknown) => mockPreviewPrompt(req) },
    unwrap: (r: { data: unknown; error: { message: string } | null }) => {
        if (r?.error) throw new Error(r.error.message);
        return r?.data;
    },
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
    inferenceBaseConfig: { timeout: 120, maxRetries: 3, useMarkdownForOutput: false },
    modelConfig: {
        name: 'gpt-4o',
        useTemperature: false,
        temperature: 0,
        useContextWindow: false,
        contextWindow: 100,
        useLegacyMaxTokens: false,
        useMaxOutputTokens: false,
        maxOutputTokens: 0,
    },
    languageConfig: { languages: ['auto'], defaultInputLanguage: 'auto', defaultOutputLanguage: 'auto' },
    appBehaviorConfig: { enableTaskLogging: false, logDirectory: '', historyEnabled: false, historyMaxEntries: 0 },
    loggingConfig: {
        logFileEnabled: false,
        logLevel: 'info',
        logDirectory: '',
        logMaxSizeMB: 10,
        logMaxBackups: 5,
        logMaxAgeDays: 30,
        logCompress: false,
    },
};

function makeStore(options: { editorOverrides?: object; armedActionId?: string | null; useContextWindow?: boolean; contextWindow?: number } = {}) {
    const { editorOverrides = {}, armedActionId = null, useContextWindow = false, contextWindow = 100 } = options;
    return configureStore({
        reducer: { editor: editorReducer, ui: uiReducer, notifications: notificationsReducer, settings: settingsReducer },
        preloadedState: {
            editor: { inputContent: '', outputContent: '', viewMode: 'preview' as const, tokenEstimate: null, ...editorOverrides },
            ui: {
                layout: 'side' as const,
                sidebarCollapsed: false,
                historyOpen: false,
                inferenceRunning: false,
                currentView: 'main' as const,
                armedActionId,
                armedStackId: null,
                activeActionsTab: null,
                buildMode: false,
                editingStackId: null,
                activeSettingsTab: 0,
                theme: { mode: 'auto' as const, effective: 'light' as const },
                appBarVisibility: {
                    providerModelSelectors: true,
                    languagePicker: true,
                    outputFormatToggle: true,
                    outputModeToggle: true,
                    layoutToggle: true,
                    commandPaletteButton: true,
                    historyButton: true,
                    infoButton: true,
                },
            },
            settings: {
                allSettings: { ...MOCK_SETTINGS, modelConfig: { ...MOCK_SETTINGS.modelConfig, useContextWindow, contextWindow } },
                metadata: null,
            },
        },
    });
}

function mockPreviewResolves(estimatedTokens: number) {
    mockPreviewPrompt.mockResolvedValue({ data: { kind: 'single', inferences: 1, groups: [{ estimatedTokens }], summary: '' }, error: null });
}

beforeEach(() => {
    mockPreviewPrompt.mockReset();
    jest.useFakeTimers();
});

afterEach(() => {
    jest.useRealTimers();
});

describe('InputPane', () => {
    it('renders the header label row above the editor body containing the textarea', () => {
        render(
            <Provider store={makeStore()}>
                <InputPane />
            </Provider>,
        );

        // Header label row (label + per-pane icon buttons) sits above the editor body.
        expect(screen.getByText('Input')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /paste from clipboard/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /clear input/i })).toBeInTheDocument();

        // The textarea is the editor surface inside the body card.
        expect(screen.getByRole('textbox', { name: /input text/i })).toBeInTheDocument();
    });

    it('uses only design tokens — no hardcoded hex colors — in its stylesheet', () => {
        const cssPath = join(__dirname, '..', 'InputPane.module.css');
        const css = readFileSync(cssPath, 'utf8');

        // No 3- or 6-digit hex literals; colors must come from var(--…) tokens.
        expect(css).not.toMatch(/#[0-9a-fA-F]{3,6}\b/);
        expect(css).toMatch(/var\(--surface-2\)/);
        expect(css).toMatch(/var\(--line\)/);
    });

    it('debounces the token estimate request instead of firing on every keystroke', async () => {
        mockPreviewResolves(12);
        render(
            <Provider store={makeStore({ armedActionId: 'action-1' })}>
                <InputPane />
            </Provider>,
        );
        const textarea = screen.getByRole('textbox', { name: /input text/i });

        fireEvent.change(textarea, { target: { value: 'h' } });
        await act(async () => {
            await jest.advanceTimersByTimeAsync(100);
        });
        fireEvent.change(textarea, { target: { value: 'he' } });
        await act(async () => {
            await jest.advanceTimersByTimeAsync(100);
        });
        fireEvent.change(textarea, { target: { value: 'hel' } });

        expect(mockPreviewPrompt).not.toHaveBeenCalled();

        await act(async () => {
            await jest.advanceTimersByTimeAsync(400);
        });

        expect(mockPreviewPrompt).toHaveBeenCalledTimes(1);
    });

    it('does not request a token estimate when no action or stack is armed', async () => {
        render(
            <Provider store={makeStore()}>
                <InputPane />
            </Provider>,
        );

        fireEvent.change(screen.getByRole('textbox', { name: /input text/i }), { target: { value: 'hello world' } });
        await act(async () => {
            await jest.advanceTimersByTimeAsync(500);
        });

        expect(mockPreviewPrompt).not.toHaveBeenCalled();
        expect(screen.queryByText(/tokens/)).not.toBeInTheDocument();
    });

    it('shows the estimate with neutral styling when the context window is disabled, regardless of size', async () => {
        mockPreviewResolves(1000);
        render(
            <Provider store={makeStore({ armedActionId: 'action-1', useContextWindow: false, contextWindow: 100 })}>
                <InputPane />
            </Provider>,
        );

        fireEvent.change(screen.getByRole('textbox', { name: /input text/i }), { target: { value: 'hello world' } });
        await act(async () => {
            await jest.advanceTimersByTimeAsync(400);
        });

        const badge = await screen.findByText(/tokens/);
        expect(badge.className).not.toContain('tokenEstimateWarn');
        expect(badge.className).not.toContain('tokenEstimateErr');
    });

    it('shows warn styling at or above 80% of the configured context window', async () => {
        mockPreviewResolves(85);
        render(
            <Provider store={makeStore({ armedActionId: 'action-1', useContextWindow: true, contextWindow: 100 })}>
                <InputPane />
            </Provider>,
        );

        fireEvent.change(screen.getByRole('textbox', { name: /input text/i }), { target: { value: 'hello world' } });
        await act(async () => {
            await jest.advanceTimersByTimeAsync(400);
        });

        const badge = await screen.findByText(/tokens/);
        expect(badge.className).toContain('tokenEstimateWarn');
        expect(badge.className).not.toContain('tokenEstimateErr');
    });

    it('shows err styling at or above 100% of the configured context window', async () => {
        mockPreviewResolves(120);
        render(
            <Provider store={makeStore({ armedActionId: 'action-1', useContextWindow: true, contextWindow: 100 })}>
                <InputPane />
            </Provider>,
        );

        fireEvent.change(screen.getByRole('textbox', { name: /input text/i }), { target: { value: 'hello world' } });
        await act(async () => {
            await jest.advanceTimersByTimeAsync(400);
        });

        const badge = await screen.findByText(/tokens/);
        expect(badge.className).toContain('tokenEstimateErr');
    });

    it('hides the token estimate without throwing or notifying when the preview request fails', async () => {
        mockPreviewPrompt.mockResolvedValue({ data: null, error: { code: 'internal', message: 'no provider configured' } });
        const store = makeStore({ armedActionId: 'action-1' });
        render(
            <Provider store={store}>
                <InputPane />
            </Provider>,
        );

        fireEvent.change(screen.getByRole('textbox', { name: /input text/i }), { target: { value: 'hello world' } });
        await act(async () => {
            await jest.advanceTimersByTimeAsync(400);
        });

        expect(screen.queryByText(/tokens/)).not.toBeInTheDocument();
        expect(store.getState().notifications.queue).toHaveLength(0);
    });
});
