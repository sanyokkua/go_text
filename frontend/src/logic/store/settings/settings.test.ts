// Mock the adapter module before any imports so module-level getLogger calls are satisfied.
// We do NOT spread jest.requireActual here — it would pull in services.ts which imports
// wailsjs ESM files that Jest cannot transform.
jest.mock('../../adapter', () => ({
    getLogger: jest
        .fn()
        .mockReturnValue({
            logPrint: jest.fn(),
            logTrace: jest.fn(),
            logDebug: jest.fn(),
            logInfo: jest.fn(),
            logWarning: jest.fn(),
            logError: jest.fn(),
            logFatal: jest.fn(),
        }),
    unwrap: jest.fn((res: { data?: unknown; error?: unknown }) => {
        if (res.error) throw res.error;
        return res.data;
    }),
    // Inline implementation mirrors mappers.ts fromWireBehavior — avoids wailsjs ESM import
    fromWireBehavior: jest.fn((v: { enableTaskLogging: boolean }) => ({ enableTaskLogging: v.enableTaskLogging, logDirectory: '' })),
    // Direct passthrough — wire and frontend types are identical for logging config
    fromWireLogging: jest.fn((v: unknown) => v),
    // Passthrough — wire and frontend UIPreferencesConfig shapes are identical
    fromWireUIPreferences: jest.fn((v: unknown) => v),
    // Passthrough — overridden per-test with mockReturnValue where the mapped shape matters (T87)
    fromWireProvider: jest.fn((v: unknown) => v),
    // Passthrough — overridden per-test where the defaulting behavior itself is under test
    fromWireAppBarVisibility: jest.fn((v: unknown) => v),
    fromWireLastSelection: jest.fn((v: unknown) => v),
    SettingsHandlerAdapter: {
        getAppBehaviorConfig: jest.fn().mockResolvedValue({ data: { enableTaskLogging: false } }),
        updateAppBehaviorConfig: jest.fn().mockResolvedValue({ data: { enableTaskLogging: true } }),
        deleteProviderConfig: jest.fn().mockResolvedValue({ data: undefined }),
        getCurrentProviderConfig: jest.fn().mockResolvedValue({ data: undefined }),
        getAppBarVisibilityConfig: jest.fn().mockResolvedValue({ data: {} }),
        updateAppBarVisibilityConfig: jest.fn().mockResolvedValue({ data: {} }),
        getLastSelectionConfig: jest.fn().mockResolvedValue({ data: { kind: 'none', actionId: '', stackId: '' } }),
        updateLastSelectionConfig: jest.fn().mockResolvedValue({ data: { kind: 'none', actionId: '', stackId: '' } }),
        getModelConfig: jest
            .fn()
            .mockResolvedValue({
                data: {
                    name: '',
                    useTemperature: false,
                    temperature: 0,
                    useContextWindow: false,
                    contextWindow: 0,
                    useLegacyMaxTokens: false,
                    useMaxOutputTokens: false,
                    maxOutputTokens: 2048,
                },
            }),
        getLoggingConfig: jest
            .fn()
            .mockResolvedValue({
                data: {
                    logFileEnabled: false,
                    logLevel: 'info',
                    logDirectory: '',
                    logMaxSizeMB: 10,
                    logMaxBackups: 5,
                    logMaxAgeDays: 30,
                    logCompress: false,
                },
            }),
        updateLoggingConfig: jest
            .fn()
            .mockResolvedValue({
                data: {
                    logFileEnabled: true,
                    logLevel: 'debug',
                    logDirectory: '',
                    logMaxSizeMB: 5,
                    logMaxBackups: 5,
                    logMaxAgeDays: 30,
                    logCompress: false,
                },
            }),
        getUIPreferencesConfig: jest
            .fn()
            .mockResolvedValue({ data: { theme: 'light', layout: 'side', sidebarCollapsed: false, historyOpen: false, viewMode: 'preview' } }),
        updateUIPreferencesConfig: jest.fn().mockResolvedValue({ data: undefined }),
    },
    ActionHandlerAdapter: { getModels: jest.fn().mockResolvedValue({ data: [], error: null }) },
}));

import { configureStore } from '@reduxjs/toolkit';

import { apperr } from '../../../../wailsjs/go/models';
import { SelectItem } from '../../../ui/primitives/Select';
import {
    ActionHandlerAdapter,
    AppBarVisibilityConfig,
    AppBehaviorConfig,
    fromWireAppBarVisibility,
    fromWireLastSelection,
    fromWireProvider,
    fromWireUIPreferences,
    LoggingConfig,
    Settings,
    SettingsHandlerAdapter,
} from '../../adapter';
import { RootState } from '../index';
import { selectAppBehaviorConfig, selectCurrentModelCaps, selectCurrentProviderModelItems, selectLoggingConfig } from './selectors';
import settingsReducer from './slice';
import {
    createProviderConfig,
    deleteProviderConfig,
    discoverCurrentProviderModels,
    getAppBarVisibility,
    getAppBehaviorConfig,
    getCurrentProviderConfig,
    getLoggingConfig,
    getSettings,
    getUIPreferences,
    persistAppBarVisibility,
    persistLastSelection,
    persistUIPreferences,
    restoreLastSelection,
    setAsCurrentProviderConfig,
    updateAppBehaviorConfig,
    updateLoggingConfig,
} from './thunks';
import { SettingsState } from './types';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const fullSettings: Settings = {
    availableProviderConfigs: [],
    currentProviderConfig: {
        providerId: '',
        providerName: '',
        providerType: '',
        baseUrl: '',
        modelsEndpoint: '',
        completionEndpoint: '',
        authType: '',
        authToken: '',
        useAuthTokenFromEnv: false,
        envVarTokenName: '',
        apiVersion: '',
        selectedModel: '',
        useCustomHeaders: false,
        headers: {},
        useCustomModels: false,
        customModels: [],
    },
    inferenceBaseConfig: { timeout: 60, maxRetries: 3, useMarkdownForOutput: false },
    modelConfig: {
        name: '',
        useTemperature: false,
        temperature: 0,
        useContextWindow: false,
        contextWindow: 0,
        useLegacyMaxTokens: false,
        useMaxOutputTokens: false,
        maxOutputTokens: 2048,
    },
    languageConfig: { languages: [], defaultInputLanguage: '', defaultOutputLanguage: '' },
    appBehaviorConfig: { enableTaskLogging: false, logDirectory: '' },
};

type DiscoveredModel = { id: string; label: string };

// Builds a ModelInfo fixture list from bare ids (label defaults to id). The
// production reducer/selector only read id/label/caps, so a plain object cast to
// ModelInfo is sufficient — and avoids depending on the wailsjs class constructor
// (the jest mock for the apperr namespace does not expose ModelInfo).
const models = (...ids: string[]): apperr.ModelInfo[] => ids.map((id) => ({ id, label: id }) as apperr.ModelInfo);

const makeState = (allSettings: Settings | null, discoveredModels: DiscoveredModel[] = []): RootState =>
    ({ settings: { allSettings, metadata: null, discoveredModels } }) as unknown as RootState;

// Extracts the value of each non-separator SelectItem, narrowing away the
// separator member so `.value` is type-safe.
const itemValues = (items: SelectItem[]): string[] => items.flatMap((item) => ('value' in item ? [item.value] : []));

// ---------------------------------------------------------------------------
// Part A: Selectors
// ---------------------------------------------------------------------------

describe('selectAppBehaviorConfig', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns null when allSettings is null', () => {
        const state = makeState(null);

        const result = selectAppBehaviorConfig(state);

        expect(result).toBeNull();
    });

    it('returns config when allSettings is populated', () => {
        const config: AppBehaviorConfig = { enableTaskLogging: true, logDirectory: '/tmp' };
        const state = makeState({ ...fullSettings, appBehaviorConfig: config });

        const result = selectAppBehaviorConfig(state);

        expect(result).toEqual(config);
    });

    it('returns null when appBehaviorConfig is undefined', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const state = makeState({ ...fullSettings, appBehaviorConfig: undefined as any });

        const result = selectAppBehaviorConfig(state);

        expect(result).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Part B: Slice reducers (pure function)
// ---------------------------------------------------------------------------

describe('settingsReducer', () => {
    const emptyState: SettingsState = { allSettings: null, metadata: null };

    beforeEach(() => {
        jest.clearAllMocks();
    });

    describe('getAppBehaviorConfig.fulfilled', () => {
        it('is a no-op when allSettings is null', () => {
            const newCfg: AppBehaviorConfig = { enableTaskLogging: true, logDirectory: '/tmp' };
            const action = getAppBehaviorConfig.fulfilled(newCfg, 'id', undefined);

            const state = settingsReducer(emptyState, action);

            expect(state.allSettings).toBeNull();
        });

        it('updates appBehaviorConfig when allSettings exists', () => {
            const initialState: SettingsState = { allSettings: { ...fullSettings }, metadata: null };
            const newCfg: AppBehaviorConfig = { enableTaskLogging: true, logDirectory: '/tmp' };
            const action = getAppBehaviorConfig.fulfilled(newCfg, 'id', undefined);

            const state = settingsReducer(initialState, action);

            expect(state.allSettings?.appBehaviorConfig).toEqual(newCfg);
        });
    });

    describe('updateAppBehaviorConfig.fulfilled', () => {
        it('is a no-op when allSettings is null', () => {
            const newCfg: AppBehaviorConfig = { enableTaskLogging: true, logDirectory: '/tmp' };
            const action = updateAppBehaviorConfig.fulfilled(newCfg, 'id', newCfg);

            const state = settingsReducer(emptyState, action);

            expect(state.allSettings).toBeNull();
        });

        it('updates appBehaviorConfig when allSettings exists', () => {
            const initialState: SettingsState = { allSettings: { ...fullSettings }, metadata: null };
            const newCfg: AppBehaviorConfig = { enableTaskLogging: true, logDirectory: '/logs' };
            const action = updateAppBehaviorConfig.fulfilled(newCfg, 'id', newCfg);

            const state = settingsReducer(initialState, action);

            expect(state.allSettings?.appBehaviorConfig).toEqual(newCfg);
        });
    });
});

// ---------------------------------------------------------------------------
// Part C: Thunks
// ---------------------------------------------------------------------------

describe('getAppBehaviorConfig thunk', () => {
    const dispatch = jest.fn();
    const getState = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('dispatches fulfilled action with the mapped config on success', async () => {
        (SettingsHandlerAdapter.getAppBehaviorConfig as jest.Mock).mockResolvedValue({ data: { enableTaskLogging: true } });

        const action = await getAppBehaviorConfig()(dispatch, getState, undefined);

        expect(action.type).toBe('settings/getAppBehaviorConfig/fulfilled');
        // fromWireBehavior maps enableTaskLogging and hardcodes logDirectory: ''
        expect(action.payload).toEqual({ enableTaskLogging: true, logDirectory: '' });
    });

    it('dispatches rejected action with parsed error message on failure', async () => {
        (SettingsHandlerAdapter.getAppBehaviorConfig as jest.Mock).mockRejectedValue(new Error('fail'));

        const action = await getAppBehaviorConfig()(dispatch, getState, undefined);

        expect(action.type).toBe('settings/getAppBehaviorConfig/rejected');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((action as any).payload).toBe('fail');
    });
});

describe('updateAppBehaviorConfig thunk', () => {
    const dispatch = jest.fn();
    const getState = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('dispatches fulfilled action with the mapped config on success', async () => {
        const input: AppBehaviorConfig = { enableTaskLogging: false, logDirectory: '' };
        (SettingsHandlerAdapter.updateAppBehaviorConfig as jest.Mock).mockResolvedValue({ data: { enableTaskLogging: false } });

        const action = await updateAppBehaviorConfig(input)(dispatch, getState, undefined);

        expect(action.type).toBe('settings/updateAppBehaviorConfig/fulfilled');
        // fromWireBehavior maps enableTaskLogging and hardcodes logDirectory: ''
        expect(action.payload).toEqual({ enableTaskLogging: false, logDirectory: '' });
    });

    it('dispatches rejected action with parsed error message on failure', async () => {
        const input: AppBehaviorConfig = { enableTaskLogging: false, logDirectory: '' };
        (SettingsHandlerAdapter.updateAppBehaviorConfig as jest.Mock).mockRejectedValue(new Error('bad path'));

        const action = await updateAppBehaviorConfig(input)(dispatch, getState, undefined);

        expect(action.type).toBe('settings/updateAppBehaviorConfig/rejected');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((action as any).payload).toBe('bad path');
    });
});

// ---------------------------------------------------------------------------
// Part C: provider-switch model sync (regression for stale-model run failures)
// ---------------------------------------------------------------------------

describe('settingsReducer — setAsCurrentProviderConfig.fulfilled', () => {
    it("syncs modelConfig.name to the newly current provider's selectedModel", () => {
        const initialState: SettingsState = {
            allSettings: { ...fullSettings, modelConfig: { ...fullSettings.modelConfig, name: 'stale-old-model' } },
            metadata: null,
            discoveredModels: [],
        };

        const newProvider = {
            ...fullSettings.currentProviderConfig,
            providerId: 'ollama',
            providerName: 'Ollama',
            providerType: 'ollama',
            selectedModel: 'qwen3:0.6b',
        };
        const action = setAsCurrentProviderConfig.fulfilled(newProvider, 'req', 'ollama');

        const state = settingsReducer(initialState, action);

        expect(state.allSettings?.currentProviderConfig.providerId).toBe('ollama');
        expect(state.allSettings?.modelConfig.name).toBe('qwen3:0.6b');
    });
});

// ---------------------------------------------------------------------------
// Part C.1: currentProviderConfig resync after provider deletion (T87)
// ---------------------------------------------------------------------------

describe('settingsReducer — getCurrentProviderConfig.fulfilled', () => {
    it('resyncs currentProviderConfig, clears discoveredModels, and leaves modelConfig.name untouched', () => {
        // Arrange — distinctive, divergent values for modelConfig.name and the new
        // provider's selectedModel, so an accidental cross-sync would be caught.
        const initialState: SettingsState = {
            allSettings: { ...fullSettings, modelConfig: { ...fullSettings.modelConfig, name: 'pre-existing-model' } },
            metadata: null,
            discoveredModels: [{ id: 'stale-1', label: 'stale-1' } as apperr.ModelInfo],
        };
        const newProvider = {
            ...fullSettings.currentProviderConfig,
            providerId: 'b',
            providerName: 'Backup LLM',
            selectedModel: 'new-provider-model',
        };
        const action = getCurrentProviderConfig.fulfilled(newProvider, 'req', undefined);

        // Act
        const state = settingsReducer(initialState, action);

        // Assert — currentProviderConfig resynced to the new provider
        expect(state.allSettings?.currentProviderConfig).toEqual(newProvider);
        // Regression guard (T87 "Rejected variant"): unlike setAsCurrentProviderConfig.fulfilled,
        // this handler must NOT sync modelConfig.name from the new provider's selectedModel.
        expect(state.allSettings?.modelConfig.name).toBe('pre-existing-model');
        // The previous provider's discovered models are now stale and must be cleared.
        expect(state.discoveredModels).toEqual([]);
    });
});

// ---------------------------------------------------------------------------
// Part D: model discovery (N1 — switch models from the main screen)
// ---------------------------------------------------------------------------

describe('settingsReducer — discoverCurrentProviderModels.fulfilled', () => {
    const provider = { ...fullSettings.currentProviderConfig, providerId: 'ollama' };

    it('populates discoveredModels for the current provider', () => {
        const initialState: SettingsState = {
            allSettings: { ...fullSettings, currentProviderConfig: provider },
            metadata: null,
            discoveredModels: [],
        };
        const action = discoverCurrentProviderModels.fulfilled(models('a', 'b'), 'req', 'ollama');

        const state = settingsReducer(initialState, action);

        expect(state.discoveredModels).toEqual(models('a', 'b'));
    });

    it('ignores results for a provider that is no longer current', () => {
        const initialState: SettingsState = {
            allSettings: { ...fullSettings, currentProviderConfig: provider },
            metadata: null,
            discoveredModels: models('existing'),
        };
        // arg names a different provider than the one currently active
        const action = discoverCurrentProviderModels.fulfilled(models('stale'), 'req', 'lmstudio');

        const state = settingsReducer(initialState, action);

        expect(state.discoveredModels).toEqual(models('existing'));
    });
});

describe('settingsReducer — discoveredModels reset on provider change', () => {
    it('clears discoveredModels when the current provider changes', () => {
        const initialState: SettingsState = { allSettings: fullSettings, metadata: null, discoveredModels: models('old-1', 'old-2') };
        const newProvider = { ...fullSettings.currentProviderConfig, providerId: 'ollama', selectedModel: 'm1' };
        const action = setAsCurrentProviderConfig.fulfilled(newProvider, 'req', 'ollama');

        const state = settingsReducer(initialState, action);

        expect(state.discoveredModels).toEqual([]);
    });
});

describe('discoverCurrentProviderModels thunk', () => {
    const dispatch = jest.fn();
    const getState = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('dispatches fulfilled with the discovered ModelInfo records on success', async () => {
        const discovered = [
            { id: 'qwen3:0.6b', label: 'Qwen3 0.6B' },
            { id: 'llama3', label: 'Llama 3' },
        ];
        (ActionHandlerAdapter.getModels as jest.Mock).mockResolvedValue({ data: discovered, error: null });

        const action = await discoverCurrentProviderModels('ollama')(dispatch, getState, undefined);

        expect(action.type).toBe('settings/discoverCurrentProviderModels/fulfilled');
        expect(action.payload).toEqual(discovered);
    });

    it('rejects (not throws) with the message when discovery returns an error envelope', async () => {
        (ActionHandlerAdapter.getModels as jest.Mock).mockResolvedValue({ data: null, error: { message: 'unreachable' } });

        const action = await discoverCurrentProviderModels('ollama')(dispatch, getState, undefined);

        expect(action.type).toBe('settings/discoverCurrentProviderModels/rejected');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((action as any).payload).toBe('unreachable');
    });

    it('rejects (not throws) when the adapter rejects', async () => {
        (ActionHandlerAdapter.getModels as jest.Mock).mockRejectedValue(new Error('boom'));

        const action = await discoverCurrentProviderModels('ollama')(dispatch, getState, undefined);

        expect(action.type).toBe('settings/discoverCurrentProviderModels/rejected');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((action as any).payload).toBe('boom');
    });
});

describe('settingsReducer — discoverCurrentProviderModels.rejected', () => {
    it('preserves the existing discoveredModels when a refresh fails', () => {
        const provider = { ...fullSettings.currentProviderConfig, providerId: 'ollama' };
        const initialState: SettingsState = {
            allSettings: { ...fullSettings, currentProviderConfig: provider },
            metadata: null,
            discoveredModels: models('kept-1', 'kept-2'),
        };
        const action = discoverCurrentProviderModels.rejected(new Error('x'), 'req', 'ollama', 'unreachable');

        const state = settingsReducer(initialState, action);

        expect(state.discoveredModels).toEqual(models('kept-1', 'kept-2'));
    });
});

describe('selectCurrentProviderModelItems', () => {
    const provider = { ...fullSettings.currentProviderConfig, providerId: 'ollama', selectedModel: 'qwen3:0.6b' };

    it('returns discovered models unioned with the current model, deduped', () => {
        const state = makeState(
            { ...fullSettings, currentProviderConfig: provider, modelConfig: { ...fullSettings.modelConfig, name: 'qwen3:0.6b' } },
            models('qwen3:0.6b', 'llama3'),
        );

        const items = selectCurrentProviderModelItems(state);

        expect(itemValues(items)).toEqual(['qwen3:0.6b', 'llama3']);
    });

    it('always includes the current model even when it is not among discovered models', () => {
        const state = makeState(
            { ...fullSettings, currentProviderConfig: provider, modelConfig: { ...fullSettings.modelConfig, name: 'custom-local' } },
            models('llama3'),
        );

        const items = selectCurrentProviderModelItems(state);

        expect(itemValues(items)).toContain('custom-local');
        expect(itemValues(items)).toContain('llama3');
    });

    it('falls back to the current model when no models are discovered', () => {
        const state = makeState(
            { ...fullSettings, currentProviderConfig: provider, modelConfig: { ...fullSettings.modelConfig, name: 'qwen3:0.6b' } },
            [],
        );

        const items = selectCurrentProviderModelItems(state);

        expect(itemValues(items)).toEqual(['qwen3:0.6b']);
    });

    it('uses custom models when useCustomModels is enabled', () => {
        const customProvider = { ...provider, useCustomModels: true, customModels: ['c1', 'c2'] };
        const state = makeState(
            { ...fullSettings, currentProviderConfig: customProvider, modelConfig: { ...fullSettings.modelConfig, name: 'c1' } },
            models('discovered-ignored'),
        );

        const items = selectCurrentProviderModelItems(state);

        expect(itemValues(items)).toEqual(['c1', 'c2']);
    });

    it('preserves discovered labels distinct from ids', () => {
        const state = makeState(
            { ...fullSettings, currentProviderConfig: provider, modelConfig: { ...fullSettings.modelConfig, name: 'qwen3:0.6b' } },
            [{ id: 'qwen3:0.6b', label: 'Qwen3 0.6B' }],
        );

        const items = selectCurrentProviderModelItems(state);

        expect(items[0]).toEqual({ value: 'qwen3:0.6b', label: 'Qwen3 0.6B' });
    });
});

describe('selectCurrentModelCaps', () => {
    const provider = { ...fullSettings.currentProviderConfig, providerId: 'ollama', selectedModel: 'm1' };

    it('returns the caps of the currently-selected model when discovered', () => {
        const state = makeState({ ...fullSettings, currentProviderConfig: provider, modelConfig: { ...fullSettings.modelConfig, name: 'm1' } }, [
            { id: 'm1', label: 'm1', caps: { supportsTemperature: false } },
        ] as never);

        const caps = selectCurrentModelCaps(state);

        expect(caps).toEqual({ supportsTemperature: false });
    });

    it('returns null when the current model has not been discovered', () => {
        const state = makeState({ ...fullSettings, currentProviderConfig: provider, modelConfig: { ...fullSettings.modelConfig, name: 'unknown' } }, [
            { id: 'm1', label: 'm1' },
        ]);

        const caps = selectCurrentModelCaps(state);

        expect(caps).toBeNull();
    });
});

// ---------------------------------------------------------------------------
// Part E: Logging config — selector, slice, thunks
// ---------------------------------------------------------------------------

const defaultLogging: LoggingConfig = {
    logFileEnabled: false,
    logLevel: 'info',
    logDirectory: '',
    logMaxSizeMB: 10,
    logMaxBackups: 5,
    logMaxAgeDays: 30,
    logCompress: false,
};

describe('selectLoggingConfig', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('returns null when allSettings is null', () => {
        const state = makeState(null);
        expect(selectLoggingConfig(state)).toBeNull();
    });

    it('returns null when loggingConfig is absent', () => {
        const state = makeState({ ...fullSettings });
        expect(selectLoggingConfig(state)).toBeNull();
    });

    it('returns config when loggingConfig is set', () => {
        const state = makeState({ ...fullSettings, loggingConfig: defaultLogging });
        expect(selectLoggingConfig(state)).toEqual(defaultLogging);
    });
});

describe('settingsReducer — getLoggingConfig.fulfilled', () => {
    const emptyState: SettingsState = { allSettings: null, metadata: null };

    it('is a no-op when allSettings is null', () => {
        const action = getLoggingConfig.fulfilled(defaultLogging, 'id', undefined);
        const state = settingsReducer(emptyState, action);
        expect(state.allSettings).toBeNull();
    });

    it('sets loggingConfig when allSettings exists', () => {
        const initialState: SettingsState = { allSettings: { ...fullSettings }, metadata: null };
        const action = getLoggingConfig.fulfilled(defaultLogging, 'id', undefined);
        const state = settingsReducer(initialState, action);
        expect(state.allSettings?.loggingConfig).toEqual(defaultLogging);
    });
});

describe('settingsReducer — updateLoggingConfig.fulfilled', () => {
    const emptyState: SettingsState = { allSettings: null, metadata: null };

    it('is a no-op when allSettings is null', () => {
        const action = updateLoggingConfig.fulfilled(defaultLogging, 'id', defaultLogging);
        const state = settingsReducer(emptyState, action);
        expect(state.allSettings).toBeNull();
    });

    it('updates loggingConfig when allSettings exists', () => {
        const initialState: SettingsState = { allSettings: { ...fullSettings, loggingConfig: defaultLogging }, metadata: null };
        const updated: LoggingConfig = { ...defaultLogging, logFileEnabled: true, logLevel: 'debug' };
        const action = updateLoggingConfig.fulfilled(updated, 'id', updated);
        const state = settingsReducer(initialState, action);
        expect(state.allSettings?.loggingConfig).toEqual(updated);
    });
});

describe('getLoggingConfig thunk', () => {
    const dispatch = jest.fn();
    const getState = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('dispatches fulfilled with the mapped config on success', async () => {
        (SettingsHandlerAdapter.getLoggingConfig as jest.Mock).mockResolvedValue({ data: defaultLogging });

        const action = await getLoggingConfig()(dispatch, getState, undefined);

        expect(action.type).toBe('settings/getLoggingConfig/fulfilled');
        expect(action.payload).toEqual(defaultLogging);
    });

    it('dispatches rejected with error message on failure', async () => {
        (SettingsHandlerAdapter.getLoggingConfig as jest.Mock).mockRejectedValue(new Error('network'));

        const action = await getLoggingConfig()(dispatch, getState, undefined);

        expect(action.type).toBe('settings/getLoggingConfig/rejected');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((action as any).payload).toBe('network');
    });
});

describe('updateLoggingConfig thunk', () => {
    const dispatch = jest.fn();
    const getState = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('dispatches fulfilled with the updated config on success', async () => {
        const updated: LoggingConfig = { ...defaultLogging, logFileEnabled: true, logLevel: 'debug', logMaxSizeMB: 5 };
        (SettingsHandlerAdapter.updateLoggingConfig as jest.Mock).mockResolvedValue({ data: updated });

        const action = await updateLoggingConfig(updated)(dispatch, getState, undefined);

        expect(action.type).toBe('settings/updateLoggingConfig/fulfilled');
        expect(action.payload).toEqual(updated);
    });

    it('dispatches rejected with error message on failure', async () => {
        (SettingsHandlerAdapter.updateLoggingConfig as jest.Mock).mockRejectedValue(new Error('save failed'));

        const action = await updateLoggingConfig(defaultLogging)(dispatch, getState, undefined);

        expect(action.type).toBe('settings/updateLoggingConfig/rejected');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((action as any).payload).toBe('save failed');
    });
});

// ---------------------------------------------------------------------------
// Bug regression: getSettings.fulfilled must not wipe loggingConfig loaded
// by the concurrent getLoggingConfig thunk during initializeSettingsState.
// ---------------------------------------------------------------------------

const enabledLogging: LoggingConfig = {
    logFileEnabled: true,
    logLevel: 'debug',
    logDirectory: '/custom/logs',
    logMaxSizeMB: 20,
    logMaxBackups: 3,
    logMaxAgeDays: 14,
    logCompress: true,
};

describe('settingsReducer — getSettings.fulfilled loggingConfig preservation', () => {
    it('preserves loggingConfig when getSettings fires after getLoggingConfig', () => {
        // Simulate the race: getLoggingConfig.fulfilled fires first, then getSettings.fulfilled wipes allSettings.
        const afterLoggingLoad: SettingsState = {
            allSettings: { ...fullSettings, loggingConfig: enabledLogging },
            metadata: null,
            discoveredModels: [],
        };

        const state = settingsReducer(afterLoggingLoad, getSettings.fulfilled({ ...fullSettings }, 'req', undefined));

        expect(state.allSettings?.loggingConfig).toEqual(enabledLogging);
    });

    it('leaves loggingConfig undefined when allSettings was null before getSettings fires', () => {
        // If getSettings fires before getLoggingConfig, loggingConfig starts undefined — getLoggingConfig sets it afterward.
        const emptyState: SettingsState = { allSettings: null, metadata: null, discoveredModels: [] };

        const state = settingsReducer(emptyState, getSettings.fulfilled({ ...fullSettings }, 'req', undefined));

        expect(state.allSettings?.loggingConfig).toBeUndefined();
    });

    it('does not corrupt other settings fields while preserving loggingConfig', () => {
        const afterLoggingLoad: SettingsState = {
            allSettings: { ...fullSettings, loggingConfig: enabledLogging },
            metadata: null,
            discoveredModels: [],
        };
        const newSettings = { ...fullSettings, modelConfig: { ...fullSettings.modelConfig, name: 'new-model' } };

        const state = settingsReducer(afterLoggingLoad, getSettings.fulfilled(newSettings, 'req', undefined));

        expect(state.allSettings?.modelConfig.name).toBe('new-model');
        expect(state.allSettings?.loggingConfig).toEqual(enabledLogging);
    });
});

describe('settingsReducer — createProviderConfig.fulfilled loggingConfig preservation', () => {
    it('preserves loggingConfig when createProviderConfig fires after getLoggingConfig', () => {
        const afterLoggingLoad: SettingsState = {
            allSettings: { ...fullSettings, loggingConfig: enabledLogging },
            metadata: null,
            discoveredModels: [],
        };

        const state = settingsReducer(
            afterLoggingLoad,
            createProviderConfig.fulfilled({ ...fullSettings }, 'req', fullSettings.currentProviderConfig),
        );

        expect(state.allSettings?.loggingConfig).toEqual(enabledLogging);
    });
});

// ---------------------------------------------------------------------------
// Part F: UI preferences — getUIPreferences and persistUIPreferences thunks
// ---------------------------------------------------------------------------

describe('getUIPreferences thunk', () => {
    const dispatch = jest.fn();
    const getState = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('dispatches fulfilled with all 5 UIPreferencesConfig fields in the payload on success', async () => {
        (SettingsHandlerAdapter.getUIPreferencesConfig as jest.Mock).mockResolvedValue({
            data: { theme: 'dark', layout: 'stacked', sidebarCollapsed: true, historyOpen: false, viewMode: 'source' },
        });
        (fromWireUIPreferences as jest.Mock).mockReturnValue({
            theme: 'dark',
            layout: 'stacked',
            sidebarCollapsed: true,
            historyOpen: false,
            viewMode: 'source',
        });

        const action = await getUIPreferences()(dispatch, getState, undefined);

        expect(action.type).toBe('settings/getUIPreferences/fulfilled');
        expect(action.payload).toMatchObject({
            mode: 'dark',
            effective: 'dark',
            layout: 'stacked',
            sidebarCollapsed: true,
            historyOpen: false,
            viewMode: 'source',
        });
    });

    it('dispatches rejected with parsed error message when the adapter rejects', async () => {
        (SettingsHandlerAdapter.getUIPreferencesConfig as jest.Mock).mockRejectedValue(new Error('network error'));

        const action = await getUIPreferences()(dispatch, getState, undefined);

        expect(action.type).toBe('settings/getUIPreferences/rejected');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((action as any).payload).toBe('network error');
    });
});

describe('persistUIPreferences thunk', () => {
    const dispatch = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('calls updateUIPreferencesConfig with all 5 fields assembled from state and dispatches fulfilled', async () => {
        (SettingsHandlerAdapter.updateUIPreferencesConfig as jest.Mock).mockResolvedValue({ data: undefined });
        const getState = jest
            .fn()
            .mockReturnValue({
                ui: { theme: { mode: 'dark' }, layout: 'stacked', sidebarCollapsed: true, historyOpen: false },
                editor: { viewMode: 'source' },
            } as unknown as RootState);

        const action = await persistUIPreferences()(dispatch, getState, undefined);

        expect(action.type).toBe('settings/persistUIPreferences/fulfilled');
        expect(SettingsHandlerAdapter.updateUIPreferencesConfig).toHaveBeenCalledWith({
            theme: 'dark',
            layout: 'stacked',
            sidebarCollapsed: true,
            historyOpen: false,
            viewMode: 'source',
        });
    });

    it('dispatches rejected with parsed error message when the adapter rejects', async () => {
        (SettingsHandlerAdapter.updateUIPreferencesConfig as jest.Mock).mockRejectedValue(new Error('save failed'));
        const getState = jest
            .fn()
            .mockReturnValue({
                ui: { theme: { mode: 'light' }, layout: 'side', sidebarCollapsed: false, historyOpen: false },
                editor: { viewMode: 'preview' },
            } as unknown as RootState);

        const action = await persistUIPreferences()(dispatch, getState, undefined);

        expect(action.type).toBe('settings/persistUIPreferences/rejected');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((action as any).payload).toBe('save failed');
    });
});

// ---------------------------------------------------------------------------
// Part G: deleteProviderConfig resyncs currentProviderConfig (T87)
// ---------------------------------------------------------------------------

describe('deleteProviderConfig thunk — resyncs currentProviderConfig (T87)', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('updates currentProviderConfig after deleting the current provider', async () => {
        // Arrange — a real store so the nested dispatch(getCurrentProviderConfig())
        // actually executes; a bare jest.fn() dispatch (used elsewhere in this file)
        // can't run a nested thunk.
        const providerA = { ...fullSettings.currentProviderConfig, providerId: 'a', providerName: 'A' };
        const providerB = { ...fullSettings.currentProviderConfig, providerId: 'b', providerName: 'B', selectedModel: 'model-b' };
        const store = configureStore({
            reducer: { settings: settingsReducer },
            preloadedState: {
                settings: {
                    allSettings: { ...fullSettings, availableProviderConfigs: [providerA, providerB], currentProviderConfig: providerA },
                    metadata: null,
                    discoveredModels: [],
                    providerPresets: [],
                },
            },
        });
        (SettingsHandlerAdapter.deleteProviderConfig as jest.Mock).mockResolvedValue({ data: undefined });
        (SettingsHandlerAdapter.getCurrentProviderConfig as jest.Mock).mockResolvedValue({ data: providerB });
        (fromWireProvider as jest.Mock).mockReturnValue(providerB);

        // Act
        await store.dispatch(deleteProviderConfig('a'));

        // Assert
        const state = store.getState().settings;
        expect(state.allSettings?.currentProviderConfig.providerId).toBe('b');
        expect(state.allSettings?.availableProviderConfigs.map((p) => p.providerId)).toEqual(['b']);
    });

    it('resyncs modelConfig after deleting the current provider', async () => {
        // Arrange — same two-provider store shape as the previous test, but this
        // time we preload a distinctive stale modelConfig.name so we can detect
        // whether the thunk re-fetches the model config for the newly-current
        // provider (Finding #2, live-testing report 2026-07-04).
        const providerA = { ...fullSettings.currentProviderConfig, providerId: 'a', providerName: 'A' };
        const providerB = { ...fullSettings.currentProviderConfig, providerId: 'b', providerName: 'B', selectedModel: 'model-b' };
        const store = configureStore({
            reducer: { settings: settingsReducer },
            preloadedState: {
                settings: {
                    allSettings: {
                        ...fullSettings,
                        availableProviderConfigs: [providerA, providerB],
                        currentProviderConfig: providerA,
                        modelConfig: { ...fullSettings.modelConfig, name: 'stale-model-a' },
                    },
                    metadata: null,
                    discoveredModels: [],
                    providerPresets: [],
                },
            },
        });
        (SettingsHandlerAdapter.deleteProviderConfig as jest.Mock).mockResolvedValue({ data: undefined });
        (SettingsHandlerAdapter.getCurrentProviderConfig as jest.Mock).mockResolvedValue({ data: providerB });
        (fromWireProvider as jest.Mock).mockReturnValue(providerB);
        (SettingsHandlerAdapter.getModelConfig as jest.Mock).mockResolvedValue({ data: { ...fullSettings.modelConfig, name: 'model-b' } });

        // Act
        await store.dispatch(deleteProviderConfig('a'));

        // Assert — modelConfig.name should reflect the newly-current provider's
        // model, not the stale value left over from the deleted provider.
        const state = store.getState().settings;
        expect(state.allSettings?.modelConfig.name).toBe('model-b');
    });
});

// ---------------------------------------------------------------------------
// Part H: AppBar visibility — getAppBarVisibility and persistAppBarVisibility thunks
// ---------------------------------------------------------------------------

const allVisible: AppBarVisibilityConfig = {
    providerModelSelectors: true,
    languagePicker: true,
    outputFormatToggle: true,
    outputModeToggle: true,
    layoutToggle: true,
    commandPaletteButton: true,
    historyButton: true,
    infoButton: true,
};

describe('getAppBarVisibility thunk', () => {
    const dispatch = jest.fn();
    const getState = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('dispatches fulfilled with the mapped config on success', async () => {
        (SettingsHandlerAdapter.getAppBarVisibilityConfig as jest.Mock).mockResolvedValue({ data: allVisible });
        (fromWireAppBarVisibility as jest.Mock).mockReturnValue(allVisible);

        const action = await getAppBarVisibility()(dispatch, getState, undefined);

        expect(action.type).toBe('settings/getAppBarVisibility/fulfilled');
        expect(action.payload).toEqual(allVisible);
    });

    it('dispatches rejected with parsed error message when the adapter rejects', async () => {
        (SettingsHandlerAdapter.getAppBarVisibilityConfig as jest.Mock).mockRejectedValue(new Error('network error'));

        const action = await getAppBarVisibility()(dispatch, getState, undefined);

        expect(action.type).toBe('settings/getAppBarVisibility/rejected');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((action as any).payload).toBe('network error');
    });
});

describe('persistAppBarVisibility thunk', () => {
    const dispatch = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('calls updateAppBarVisibilityConfig with the current ui.appBarVisibility slice', async () => {
        (SettingsHandlerAdapter.updateAppBarVisibilityConfig as jest.Mock).mockResolvedValue({ data: undefined });
        const hiddenHistory = { ...allVisible, historyButton: false };
        const getState = jest.fn().mockReturnValue({ ui: { appBarVisibility: hiddenHistory } } as unknown as RootState);

        const action = await persistAppBarVisibility()(dispatch, getState, undefined);

        expect(action.type).toBe('settings/persistAppBarVisibility/fulfilled');
        expect(SettingsHandlerAdapter.updateAppBarVisibilityConfig).toHaveBeenCalledWith(hiddenHistory);
    });

    it('dispatches rejected with parsed error message when the adapter rejects', async () => {
        (SettingsHandlerAdapter.updateAppBarVisibilityConfig as jest.Mock).mockRejectedValue(new Error('save failed'));
        const getState = jest.fn().mockReturnValue({ ui: { appBarVisibility: allVisible } } as unknown as RootState);

        const action = await persistAppBarVisibility()(dispatch, getState, undefined);

        expect(action.type).toBe('settings/persistAppBarVisibility/rejected');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((action as any).payload).toBe('save failed');
    });
});

// ---------------------------------------------------------------------------
// Part I: Last-selection persistence — persistLastSelection and restoreLastSelection thunks
// ---------------------------------------------------------------------------

describe('persistLastSelection thunk', () => {
    const dispatch = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
        (SettingsHandlerAdapter.updateLastSelectionConfig as jest.Mock).mockResolvedValue({ data: undefined });
    });

    it('persists kind "action" with the armed action id when only an action is armed', async () => {
        const getState = jest.fn().mockReturnValue({ ui: { armedActionId: 'x', armedStackId: null } } as unknown as RootState);

        const action = await persistLastSelection()(dispatch, getState, undefined);

        expect(action.type).toBe('settings/persistLastSelection/fulfilled');
        expect(SettingsHandlerAdapter.updateLastSelectionConfig).toHaveBeenCalledWith({ kind: 'action', actionId: 'x', stackId: '' });
    });

    it('persists kind "stack" with the armed stack id when only a stack is armed', async () => {
        const getState = jest.fn().mockReturnValue({ ui: { armedActionId: null, armedStackId: 'y' } } as unknown as RootState);

        await persistLastSelection()(dispatch, getState, undefined);

        expect(SettingsHandlerAdapter.updateLastSelectionConfig).toHaveBeenCalledWith({ kind: 'stack', actionId: '', stackId: 'y' });
    });

    it('persists kind "none" with empty ids when neither an action nor a stack is armed', async () => {
        const getState = jest.fn().mockReturnValue({ ui: { armedActionId: null, armedStackId: null } } as unknown as RootState);

        await persistLastSelection()(dispatch, getState, undefined);

        expect(SettingsHandlerAdapter.updateLastSelectionConfig).toHaveBeenCalledWith({ kind: 'none', actionId: '', stackId: '' });
    });

    it('dispatches rejected with parsed error message when the adapter rejects', async () => {
        (SettingsHandlerAdapter.updateLastSelectionConfig as jest.Mock).mockRejectedValue(new Error('persist failed'));
        const getState = jest.fn().mockReturnValue({ ui: { armedActionId: 'x', armedStackId: null } } as unknown as RootState);

        const action = await persistLastSelection()(dispatch, getState, undefined);

        expect(action.type).toBe('settings/persistLastSelection/rejected');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((action as any).payload).toBe('persist failed');
    });
});

describe('restoreLastSelection thunk', () => {
    const dispatch = jest.fn();

    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('resolves with the armed stack id when the persisted stack is present in saved stacks, and does not write back', async () => {
        (SettingsHandlerAdapter.getLastSelectionConfig as jest.Mock).mockResolvedValue({
            data: { kind: 'stack', actionId: '', stackId: 'existing-id' },
        });
        (fromWireLastSelection as jest.Mock).mockReturnValue({ kind: 'stack', actionId: '', stackId: 'existing-id' });
        const getState = jest
            .fn()
            .mockReturnValue({ stacksSaved: { stacks: [{ id: 'existing-id' }] }, actions: { catalog: [] } } as unknown as RootState);

        const action = await restoreLastSelection()(dispatch, getState, undefined);

        expect(action.type).toBe('settings/restoreLastSelection/fulfilled');
        expect(action.payload).toEqual({ armedActionId: null, armedStackId: 'existing-id' });
        expect(SettingsHandlerAdapter.updateLastSelectionConfig).not.toHaveBeenCalled();
    });

    it('resolves with both nulls and writes back kind "none" when the persisted stack id is no longer present', async () => {
        (SettingsHandlerAdapter.getLastSelectionConfig as jest.Mock).mockResolvedValue({
            data: { kind: 'stack', actionId: '', stackId: 'deleted-stack-id' },
        });
        (fromWireLastSelection as jest.Mock).mockReturnValue({ kind: 'stack', actionId: '', stackId: 'deleted-stack-id' });
        (SettingsHandlerAdapter.updateLastSelectionConfig as jest.Mock).mockResolvedValue({ data: undefined });
        const getState = jest
            .fn()
            .mockReturnValue({ stacksSaved: { stacks: [{ id: 'some-other-stack' }] }, actions: { catalog: [] } } as unknown as RootState);

        const action = await restoreLastSelection()(dispatch, getState, undefined);

        expect(action.payload).toEqual({ armedActionId: null, armedStackId: null });
        expect(SettingsHandlerAdapter.updateLastSelectionConfig).toHaveBeenCalledWith({ kind: 'none', actionId: '', stackId: '' });
    });

    it('resolves with the armed action id when the persisted action is present in the catalog, and does not write back', async () => {
        (SettingsHandlerAdapter.getLastSelectionConfig as jest.Mock).mockResolvedValue({
            data: { kind: 'action', actionId: 'existing-action', stackId: '' },
        });
        (fromWireLastSelection as jest.Mock).mockReturnValue({ kind: 'action', actionId: 'existing-action', stackId: '' });
        const getState = jest
            .fn()
            .mockReturnValue({ stacksSaved: { stacks: [] }, actions: { catalog: [{ id: 'existing-action' }] } } as unknown as RootState);

        const action = await restoreLastSelection()(dispatch, getState, undefined);

        expect(action.payload).toEqual({ armedActionId: 'existing-action', armedStackId: null });
        expect(SettingsHandlerAdapter.updateLastSelectionConfig).not.toHaveBeenCalled();
    });

    it('resolves with both nulls and writes back kind "none" when the persisted action id is no longer in the catalog', async () => {
        (SettingsHandlerAdapter.getLastSelectionConfig as jest.Mock).mockResolvedValue({
            data: { kind: 'action', actionId: 'deleted-action', stackId: '' },
        });
        (fromWireLastSelection as jest.Mock).mockReturnValue({ kind: 'action', actionId: 'deleted-action', stackId: '' });
        (SettingsHandlerAdapter.updateLastSelectionConfig as jest.Mock).mockResolvedValue({ data: undefined });
        const getState = jest
            .fn()
            .mockReturnValue({ stacksSaved: { stacks: [] }, actions: { catalog: [{ id: 'some-other-action' }] } } as unknown as RootState);

        const action = await restoreLastSelection()(dispatch, getState, undefined);

        expect(action.payload).toEqual({ armedActionId: null, armedStackId: null });
        expect(SettingsHandlerAdapter.updateLastSelectionConfig).toHaveBeenCalledWith({ kind: 'none', actionId: '', stackId: '' });
    });

    it('resolves with both nulls and does not write back when nothing was persisted (kind "none")', async () => {
        (SettingsHandlerAdapter.getLastSelectionConfig as jest.Mock).mockResolvedValue({ data: { kind: 'none', actionId: '', stackId: '' } });
        (fromWireLastSelection as jest.Mock).mockReturnValue({ kind: 'none', actionId: '', stackId: '' });
        const getState = jest.fn().mockReturnValue({ stacksSaved: { stacks: [] }, actions: { catalog: [] } } as unknown as RootState);

        const action = await restoreLastSelection()(dispatch, getState, undefined);

        expect(action.payload).toEqual({ armedActionId: null, armedStackId: null });
        expect(SettingsHandlerAdapter.updateLastSelectionConfig).not.toHaveBeenCalled();
    });

    it('dispatches rejected with parsed error message when the adapter rejects', async () => {
        (SettingsHandlerAdapter.getLastSelectionConfig as jest.Mock).mockRejectedValue(new Error('load failed'));
        const getState = jest.fn().mockReturnValue({ stacksSaved: { stacks: [] }, actions: { catalog: [] } } as unknown as RootState);

        const action = await restoreLastSelection()(dispatch, getState, undefined);

        expect(action.type).toBe('settings/restoreLastSelection/rejected');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        expect((action as any).payload).toBe('load failed');
    });
});
