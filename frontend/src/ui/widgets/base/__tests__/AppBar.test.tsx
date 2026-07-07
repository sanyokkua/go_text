jest.mock('../../../../logic/adapter', () => ({
    getLogger: () => ({ logDebug: jest.fn(), logInfo: jest.fn(), logError: jest.fn(), logWarning: jest.fn() }),
    SettingsHandlerAdapter: { updateUIPreferencesConfig: jest.fn().mockResolvedValue({}) },
    unwrap: (res: { data?: unknown; error?: unknown }) => {
        if (res?.error) throw res.error;
        return res?.data;
    },
}));

import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';

import { SettingsHandlerAdapter } from '../../../../logic/adapter';
import type { AppBarVisibilityConfig } from '../../../../logic/adapter/models';
import actionsReducer from '../../../../logic/store/actions/slice';
import editorReducer from '../../../../logic/store/editor/slice';
import historyReducer from '../../../../logic/store/history/slice';
import notificationsReducer from '../../../../logic/store/notifications/slice';
import runReducer from '../../../../logic/store/run/slice';
import settingsReducer from '../../../../logic/store/settings/slice';
import uiReducer from '../../../../logic/store/ui/slice';
import { TooltipProvider } from '../../../primitives/Tooltip';
import AppBar from '../AppBar';

const ALL_VISIBLE: AppBarVisibilityConfig = {
    providerModelSelectors: true,
    languagePicker: true,
    outputFormatToggle: true,
    outputModeToggle: true,
    layoutToggle: true,
    commandPaletteButton: true,
    historyButton: true,
    infoButton: true,
};

// A fully populated settings fixture so ProviderPicker/ModelPicker/LanguagePicker
// (each of which renders null until their backing config is loaded) actually render,
// letting the appBarVisibility gating tests assert on their presence/absence.
const FULL_SETTINGS = {
    availableProviderConfigs: [{ providerId: 'p1', providerName: 'Test Provider' }],
    currentProviderConfig: { providerId: 'p1', providerName: 'Test Provider', selectedModel: 'model-1' },
    modelConfig: { name: 'model-1' },
    languageConfig: { languages: ['English', 'French'], defaultInputLanguage: 'English', defaultOutputLanguage: 'French' },
    inferenceBaseConfig: { useMarkdownForOutput: false },
};

function makeStore(
    opts: {
        historyEnabled?: boolean;
        historyOpen?: boolean;
        currentView?: 'main' | 'settings' | 'info' | 'stacks';
        appBarVisibility?: Partial<AppBarVisibilityConfig>;
        withFullSettings?: boolean;
    } = {},
) {
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
                historyOpen: opts.historyOpen ?? false,
                inferenceRunning: false,
                currentView: opts.currentView ?? 'main',
                armedActionId: null,
                armedStackId: null,
                activeActionsTab: null,
                buildMode: false,
                editingStackId: null,
                activeSettingsTab: 0,
                theme: { mode: 'auto' as const, effective: 'light' as const },
                appBarVisibility: { ...ALL_VISIBLE, ...opts.appBarVisibility },
            },
            settings: {
                allSettings: opts.withFullSettings
                    ? ({ ...FULL_SETTINGS, appBehaviorConfig: { historyEnabled: opts.historyEnabled ?? true, historyMaxEntries: 100 } } as never)
                    : ({ appBehaviorConfig: { historyEnabled: opts.historyEnabled ?? true, historyMaxEntries: 100 } } as never),
                metadata: null,
            },
        },
    });
}

function renderAppBar(opts: Parameters<typeof makeStore>[0] = {}) {
    const store = makeStore(opts);
    render(
        <Provider store={store}>
            <TooltipProvider>
                <AppBar />
            </TooltipProvider>
        </Provider>,
    );
    return store;
}

describe('AppBar — history toggle', () => {
    it('renders history toggle button in main view', () => {
        renderAppBar();
        expect(screen.getByRole('button', { name: /toggle history rail/i })).toBeInTheDocument();
    });

    it('history toggle button is enabled when historyEnabled is true', () => {
        renderAppBar({ historyEnabled: true });
        expect(screen.getByRole('button', { name: /toggle history rail/i })).toBeEnabled();
    });

    it('history toggle button is disabled when historyEnabled is false', () => {
        renderAppBar({ historyEnabled: false });
        expect(screen.getByRole('button', { name: /toggle history rail/i })).toBeDisabled();
    });

    it('toggle button has aria-pressed=false when history is closed', () => {
        renderAppBar({ historyOpen: false });
        expect(screen.getByRole('button', { name: /toggle history rail/i })).toHaveAttribute('aria-pressed', 'false');
    });

    it('toggle button has aria-pressed=true when history is open', () => {
        renderAppBar({ historyOpen: true });
        expect(screen.getByRole('button', { name: /toggle history rail/i })).toHaveAttribute('aria-pressed', 'true');
    });

    it('clicking toggle flips historyOpen in store', async () => {
        const store = renderAppBar({ historyOpen: false });
        await userEvent.click(screen.getByRole('button', { name: /toggle history rail/i }));
        expect(store.getState().ui.historyOpen).toBe(true);
    });

    it('toggle button does not render outside main view', () => {
        renderAppBar({ currentView: 'settings' });
        expect(screen.queryByRole('button', { name: /toggle history rail/i })).not.toBeInTheDocument();
    });
});

describe('AppBar — icon button tooltips', () => {
    it('sidebar toggle button is present with accessible label', () => {
        renderAppBar();
        expect(screen.getByRole('button', { name: /expand sidebar|collapse sidebar/i })).toBeInTheDocument();
    });

    it('about button is present with accessible label', () => {
        renderAppBar();
        expect(screen.getByRole('button', { name: /about and info/i })).toBeInTheDocument();
    });

    it('settings button is present with accessible label', () => {
        renderAppBar();
        expect(screen.getByRole('button', { name: /open settings/i })).toBeInTheDocument();
    });
});

describe('AppBar — UI persistence', () => {
    let mockUpdateUIPreferencesConfig: jest.Mock;

    beforeEach(() => {
        mockUpdateUIPreferencesConfig = SettingsHandlerAdapter.updateUIPreferencesConfig as jest.Mock;
        mockUpdateUIPreferencesConfig.mockClear();
    });

    it('calls updateUIPreferencesConfig after sidebar toggle', async () => {
        renderAppBar();
        await userEvent.click(screen.getByRole('button', { name: /collapse sidebar/i }));
        await waitFor(() => {
            expect(mockUpdateUIPreferencesConfig).toHaveBeenCalledWith(expect.objectContaining({ sidebarCollapsed: true }));
        });
    });

    it('calls updateUIPreferencesConfig after history toggle', async () => {
        renderAppBar({ historyOpen: false });
        await userEvent.click(screen.getByRole('button', { name: /toggle history rail/i }));
        await waitFor(() => {
            expect(mockUpdateUIPreferencesConfig).toHaveBeenCalledWith(expect.objectContaining({ historyOpen: true }));
        });
    });

    it('calls updateUIPreferencesConfig after viewMode change', async () => {
        renderAppBar();
        await userEvent.click(screen.getByRole('radio', { name: /source/i }));
        await waitFor(() => {
            expect(mockUpdateUIPreferencesConfig).toHaveBeenCalledWith(expect.objectContaining({ viewMode: 'source' }));
        });
    });

    it('calls updateUIPreferencesConfig after layout change', async () => {
        renderAppBar();
        await userEvent.click(screen.getByRole('radio', { name: /stacked/i }));
        await waitFor(() => {
            expect(mockUpdateUIPreferencesConfig).toHaveBeenCalledWith(expect.objectContaining({ layout: 'stacked' }));
        });
    });
});

describe('AppBar — appBarVisibility gating', () => {
    it('hides the provider and model pickers when providerModelSelectors is false', () => {
        renderAppBar({ withFullSettings: true, appBarVisibility: { providerModelSelectors: false } });
        expect(screen.queryByRole('combobox', { name: 'Provider' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Model' })).not.toBeInTheDocument();
    });

    it('shows the provider and model pickers when providerModelSelectors is true', () => {
        renderAppBar({ withFullSettings: true });
        expect(screen.getByRole('combobox', { name: 'Provider' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Model' })).toBeInTheDocument();
    });

    it('hides the language picker when languagePicker is false', () => {
        renderAppBar({ withFullSettings: true, appBarVisibility: { languagePicker: false } });
        expect(screen.queryByRole('button', { name: 'Languages' })).not.toBeInTheDocument();
    });

    it('shows the language picker when languagePicker is true', () => {
        renderAppBar({ withFullSettings: true });
        expect(screen.getByRole('button', { name: 'Languages' })).toBeInTheDocument();
    });

    it('hides the output format toggle when outputFormatToggle is false', () => {
        renderAppBar({ appBarVisibility: { outputFormatToggle: false } });
        expect(screen.queryByRole('radio', { name: 'Plain' })).not.toBeInTheDocument();
        expect(screen.queryByRole('radio', { name: 'MD' })).not.toBeInTheDocument();
    });

    it('shows the output format toggle when outputFormatToggle is true', () => {
        renderAppBar();
        expect(screen.getByRole('radio', { name: 'Plain' })).toBeInTheDocument();
    });

    it('hides the output view toggle when outputModeToggle is false', () => {
        renderAppBar({ appBarVisibility: { outputModeToggle: false } });
        expect(screen.queryByRole('radio', { name: /preview/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('radio', { name: /source/i })).not.toBeInTheDocument();
    });

    it('shows the output view toggle when outputModeToggle is true', () => {
        renderAppBar();
        expect(screen.getByRole('radio', { name: /preview/i })).toBeInTheDocument();
    });

    it('hides the layout toggle when layoutToggle is false', () => {
        renderAppBar({ appBarVisibility: { layoutToggle: false } });
        expect(screen.queryByRole('radio', { name: /side/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('radio', { name: /stacked/i })).not.toBeInTheDocument();
    });

    it('shows the layout toggle when layoutToggle is true', () => {
        renderAppBar();
        expect(screen.getByRole('radio', { name: /stacked/i })).toBeInTheDocument();
    });

    it('hides the command palette button when commandPaletteButton is false', () => {
        renderAppBar({ appBarVisibility: { commandPaletteButton: false } });
        expect(screen.queryByRole('button', { name: /open command palette/i })).not.toBeInTheDocument();
    });

    it('shows the command palette button when commandPaletteButton is true', () => {
        renderAppBar();
        expect(screen.getByRole('button', { name: /open command palette/i })).toBeInTheDocument();
    });

    it('hides the history button when historyButton is false', () => {
        renderAppBar({ appBarVisibility: { historyButton: false } });
        expect(screen.queryByRole('button', { name: /toggle history rail/i })).not.toBeInTheDocument();
    });

    it('hides the info button when infoButton is false', () => {
        renderAppBar({ appBarVisibility: { infoButton: false } });
        expect(screen.queryByRole('button', { name: /about and info/i })).not.toBeInTheDocument();
    });

    it('renders only the sidebar-toggle and Settings buttons, plus the logo, when all 8 elements are hidden', () => {
        renderAppBar({
            withFullSettings: true,
            appBarVisibility: {
                providerModelSelectors: false,
                languagePicker: false,
                outputFormatToggle: false,
                outputModeToggle: false,
                layoutToggle: false,
                commandPaletteButton: false,
                historyButton: false,
                infoButton: false,
            },
        });

        // Never-gated controls remain.
        expect(screen.getByRole('button', { name: /collapse sidebar|expand sidebar/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /open settings/i })).toBeInTheDocument();
        expect(screen.getByText('GoText')).toBeInTheDocument();

        // Every gated control is gone.
        expect(screen.queryByRole('combobox', { name: 'Provider' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Model' })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Languages' })).not.toBeInTheDocument();
        expect(screen.queryByRole('radio')).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /open command palette/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /toggle history rail/i })).not.toBeInTheDocument();
        expect(screen.queryByRole('button', { name: /about and info/i })).not.toBeInTheDocument();

        // Exactly the two never-gated buttons remain.
        expect(screen.getAllByRole('button')).toHaveLength(2);
    });
});
