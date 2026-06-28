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
}));

import { AppBehaviorConfig, Settings, SettingsHandlerAdapter } from '../../adapter';
import { RootState } from '../index';
import { selectAppBehaviorConfig } from './selectors';
import settingsReducer from './slice';
import { getAppBehaviorConfig, setAsCurrentProviderConfig, updateAppBehaviorConfig } from './thunks';
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

const makeState = (allSettings: Settings | null): RootState => ({ settings: { allSettings, metadata: null } }) as unknown as RootState;

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
