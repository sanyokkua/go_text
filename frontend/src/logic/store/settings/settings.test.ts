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
    SettingsHandlerAdapter: {
        getAppBehaviorConfig: jest.fn().mockResolvedValue({ data: { enableTaskLogging: false } }),
        updateAppBehaviorConfig: jest.fn().mockResolvedValue({ data: { enableTaskLogging: true } }),
    },
    ActionHandlerAdapter: {
        getModels: jest.fn().mockResolvedValue({ data: [], error: null }),
    },
}));

import { apperr } from '../../../../wailsjs/go/models';
import { SelectItem } from '../../../ui/primitives/Select';
import { ActionHandlerAdapter, AppBehaviorConfig, Settings, SettingsHandlerAdapter } from '../../adapter';
import { RootState } from '../index';
import { selectAppBehaviorConfig, selectCurrentModelCaps, selectCurrentProviderModelItems } from './selectors';
import settingsReducer from './slice';
import { discoverCurrentProviderModels, getAppBehaviorConfig, setAsCurrentProviderConfig, updateAppBehaviorConfig } from './thunks';
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
    modelConfig: { name: '', useTemperature: false, temperature: 0, useContextWindow: false, contextWindow: 0, useLegacyMaxTokens: false },
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
    it('syncs modelConfig.name to the newly current provider\'s selectedModel', () => {
        const initialState: SettingsState = {
            allSettings: {
                ...fullSettings,
                modelConfig: { ...fullSettings.modelConfig, name: 'stale-old-model' },
            },
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
        const initialState: SettingsState = {
            allSettings: fullSettings,
            metadata: null,
            discoveredModels: models('old-1', 'old-2'),
        };
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
        const discovered = [{ id: 'qwen3:0.6b', label: 'Qwen3 0.6B' }, { id: 'llama3', label: 'Llama 3' }];
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
    const provider = {
        ...fullSettings.currentProviderConfig,
        providerId: 'ollama',
        selectedModel: 'qwen3:0.6b',
    };

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
        const state = makeState(
            { ...fullSettings, currentProviderConfig: provider, modelConfig: { ...fullSettings.modelConfig, name: 'm1' } },
            [{ id: 'm1', label: 'm1', caps: { supportsTemperature: false } }] as never,
        );

        const caps = selectCurrentModelCaps(state);

        expect(caps).toEqual({ supportsTemperature: false });
    });

    it('returns null when the current model has not been discovered', () => {
        const state = makeState(
            { ...fullSettings, currentProviderConfig: provider, modelConfig: { ...fullSettings.modelConfig, name: 'unknown' } },
            [{ id: 'm1', label: 'm1' }],
        );

        const caps = selectCurrentModelCaps(state);

        expect(caps).toBeNull();
    });
});
