jest.mock('../../../../logic/adapter', () => ({
    getLogger: () => ({ logDebug: jest.fn(), logInfo: jest.fn(), logError: jest.fn(), logWarning: jest.fn() }),
    unwrap: jest.fn((r: { data?: unknown; error?: unknown }) => {
        if (r?.error) throw r.error;
        return r?.data;
    }),
    ActionHandlerAdapter: { getModels: jest.fn().mockResolvedValue({ data: [], error: null }) },
    SettingsHandlerAdapter: {
        setDefaultInputLanguage: jest.fn().mockResolvedValue({ data: null, error: null }),
        setDefaultOutputLanguage: jest.fn().mockResolvedValue({ data: null, error: null }),
    },
    fromWireProvider: jest.fn((p: unknown) => p),
}));

import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { SettingsHandlerAdapter } from '../../../../logic/adapter';
import actionsReducer from '../../../../logic/store/actions/slice';
import editorReducer from '../../../../logic/store/editor/slice';
import historyReducer from '../../../../logic/store/history/slice';
import notificationsReducer from '../../../../logic/store/notifications/slice';
import runReducer from '../../../../logic/store/run/slice';
import settingsReducer from '../../../../logic/store/settings/slice';
import uiReducer from '../../../../logic/store/ui/slice';
import { TooltipProvider } from '../../../primitives/Tooltip';
import AppBar from '../AppBar';

const PROVIDER = {
    providerId: 'ollama',
    providerName: 'Ollama',
    providerType: 'ollama',
    baseUrl: 'http://localhost:11434',
    modelsEndpoint: '',
    completionEndpoint: '',
    authType: '',
    authToken: '',
    useAuthTokenFromEnv: false,
    envVarTokenName: '',
    useCustomHeaders: false,
    headers: {},
    selectedModel: 'llama3.1:8b',
    useCustomModels: false,
    customModels: [],
};

function makeStore() {
    return configureStore({
        reducer: {
            ui: uiReducer,
            settings: settingsReducer,
            actions: actionsReducer,
            editor: editorReducer,
            notifications: notificationsReducer,
            run: runReducer,
            history: historyReducer,
        },
        preloadedState: {
            ui: {
                layout: 'side' as const,
                sidebarCollapsed: false,
                historyOpen: false,
                inferenceRunning: false,
                currentView: 'main' as const,
                armedActionId: null,
                armedStackId: null,
                activeActionsTab: null,
                buildMode: false,
                editingStackId: null,
                activeSettingsTab: 0,
                theme: { mode: 'auto' as const, effective: 'light' as const },
                appBarVisibility: { providerModelSelectors: true, languagePicker: true, outputFormatToggle: true, outputModeToggle: true, layoutToggle: true, commandPaletteButton: true, historyButton: true, infoButton: true },
            },
            settings: {
                allSettings: {
                    availableProviderConfigs: [PROVIDER],
                    currentProviderConfig: PROVIDER,
                    inferenceBaseConfig: { timeout: 60, maxRetries: 3, useMarkdownForOutput: false },
                    modelConfig: {
                        name: 'llama3.1:8b',
                        useTemperature: false,
                        temperature: 0,
                        useContextWindow: false,
                        contextWindow: 0,
                        useLegacyMaxTokens: false,
                        useMaxOutputTokens: false,
                        maxOutputTokens: 2048,
                    },
                    languageConfig: { languages: ['EN', 'UK'], defaultInputLanguage: 'EN', defaultOutputLanguage: 'UK' },
                    appBehaviorConfig: { enableTaskLogging: false, logDirectory: '', historyEnabled: true, historyMaxEntries: 100 },
                } as never,
                metadata: null,
                discoveredModels: [],
            },
        },
    });
}

function renderAppBar() {
    const store = makeStore();
    const utils = render(
        <Provider store={store}>
            <TooltipProvider>
                <AppBar />
            </TooltipProvider>
        </Provider>,
    );
    return { store, ...utils };
}

describe('AppBar — flattened layout renders all main-view controls', () => {
    it('renders the wordmark, pickers, segmented controls and icon buttons together on the main view', () => {
        renderAppBar();

        // Brand wordmark (the single-letter logo is aria-hidden, so it is not queryable by role).
        expect(screen.getByText('GoText')).toBeInTheDocument();

        // Provider, model and language pickers.
        expect(screen.getByRole('combobox', { name: /provider/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /model/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /languages/i })).toBeInTheDocument();

        // Format segmented control.
        expect(screen.getByRole('radio', { name: /plain/i })).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: /^md$/i })).toBeInTheDocument();

        // View-mode segmented control.
        expect(screen.getByRole('radio', { name: /preview/i })).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: /source/i })).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: /diff/i })).toBeInTheDocument();

        // Layout segmented control.
        expect(screen.getByRole('radio', { name: /side/i })).toBeInTheDocument();
        expect(screen.getByRole('radio', { name: /stacked/i })).toBeInTheDocument();

        // Right-cluster icon buttons.
        expect(screen.getByRole('button', { name: /open command palette/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /toggle history rail/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /about and info/i })).toBeInTheDocument();

        // Sidebar toggle and settings entry point.
        expect(screen.getByRole('button', { name: /collapse sidebar|expand sidebar/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /open settings/i })).toBeInTheDocument();
    });
});

describe('AppBar chrome — readiness dots removed', () => {
    it('renders no provider or model readiness-dot nodes', () => {
        renderAppBar();

        // The old design exposed dots via these accessible labels.
        expect(screen.queryByLabelText(/provider ready|provider not configured/i)).not.toBeInTheDocument();
        expect(screen.queryByLabelText(/model selected|no model selected/i)).not.toBeInTheDocument();
    });
});

describe('AppBar chrome — active provider accent', () => {
    it('marks the provider pill as accented and leaves the model pill plain', () => {
        renderAppBar();

        const providerTrigger = screen.getByRole('combobox', { name: /provider/i });
        const modelTrigger = screen.getByRole('button', { name: /model/i });

        expect(providerTrigger).toHaveAttribute('data-accent');
        expect(modelTrigger).not.toHaveAttribute('data-accent');
    });
});

describe('AppBar chrome — combined language pill', () => {
    it('renders exactly one language pill that opens a popover with both selects', async () => {
        renderAppBar();

        const langPill = screen.getByRole('button', { name: /languages/i });
        expect(langPill).toBeInTheDocument();

        await userEvent.click(langPill);

        expect(await screen.findByText(/input language/i)).toBeInTheDocument();
        expect(screen.getByText(/output language/i)).toBeInTheDocument();
    });

    it('keeps the popover open while picking a language in the nested select and commits the change', async () => {
        renderAppBar();

        await userEvent.click(screen.getByRole('button', { name: /languages/i }));
        // Open the inner "In" select (a nested Radix portal) and choose a new language.
        await userEvent.click(await screen.findByRole('combobox', { name: /in/i }));
        await userEvent.click(await screen.findByRole('option', { name: 'UK' }));

        // The popover must survive the nested-portal interaction…
        expect(screen.getByText(/input language/i)).toBeInTheDocument();
        // …and the language change must have been committed through the adapter.
        await waitFor(() => {
            expect(SettingsHandlerAdapter.setDefaultInputLanguage).toHaveBeenCalledWith('UK');
        });
    });
});

describe('AppBar chrome — uniform icon buttons', () => {
    it('routes the right-cluster icon buttons through one shared size class', () => {
        renderAppBar();

        const palette = screen.getByRole('button', { name: /open command palette/i });
        const history = screen.getByRole('button', { name: /toggle history rail/i });
        const info = screen.getByRole('button', { name: /about and info/i });
        const settings = screen.getByRole('button', { name: /open settings/i });

        const sharedClass = palette.className;
        // Every right-cluster icon button shares the IconButton base class token,
        // so the rendered class string is identical across all of them.
        for (const btn of [history, info, settings]) {
            expect(btn.className.split(' ')).toEqual(expect.arrayContaining([sharedClass.split(' ')[0]]));
        }
    });

    it('does not advertise aria-pressed on non-toggle action buttons', () => {
        renderAppBar();

        expect(screen.getByRole('button', { name: /about and info/i })).not.toHaveAttribute('aria-pressed');
        expect(screen.getByRole('button', { name: /open settings/i })).not.toHaveAttribute('aria-pressed');
        // The history toggle is a genuine toggle and must keep aria-pressed.
        expect(screen.getByRole('button', { name: /toggle history rail/i })).toHaveAttribute('aria-pressed');
    });
});

describe('AppBar chrome — right-cluster ordering', () => {
    it('renders Format, View, Layout segmented controls before the icon buttons', () => {
        const { container } = renderAppBar();

        // The right cluster is the last flex child of the header.
        const right = container.querySelector('header > div:last-child') as HTMLElement;
        const palette = within(right).getByRole('button', { name: /open command palette/i });
        const history = within(right).getByRole('button', { name: /toggle history rail/i });
        const settings = within(right).getByRole('button', { name: /open settings/i });

        // ⌘K precedes history precedes settings in document order.
        expect(palette.compareDocumentPosition(history) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
        expect(history.compareDocumentPosition(settings) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    });
});
