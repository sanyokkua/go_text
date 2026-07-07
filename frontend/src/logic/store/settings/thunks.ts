import { createAsyncThunk } from '@reduxjs/toolkit';
import { apperr } from '../../../../wailsjs/go/models';
import {
    ActionHandlerAdapter,
    fromWireAppBarVisibility,
    fromWireBehavior,
    fromWireLastSelection,
    fromWireLogging,
    fromWireMetadata,
    fromWireProvider,
    fromWireSettings,
    fromWireUIPreferences,
    getLogger,
    getProviderPresets,
    SettingsHandlerAdapter,
    unwrap,
} from '../../adapter';
import {
    AppBarVisibilityConfig,
    AppBehaviorConfig,
    AppSettingsMetadata,
    InferenceBaseConfig,
    LanguageConfig,
    LoggingConfig,
    ModelConfig,
    ProviderConfig,
    Settings,
    UIPreferencesConfig,
} from '../../adapter/models';
import { resolveEffectiveTheme } from '../../theme/init';
import { parseError } from '../../utils/error_utils';
import type { RootState } from '../index';
import { ThemeEffective, ThemeMode } from '../ui/types';

const logger = getLogger('SettingsThunks');

export const addLanguage = createAsyncThunk<Array<string>, string, { rejectValue: string }>(
    'settings/addLanguage',
    async (language, { rejectWithValue }) => {
        try {
            return unwrap(await SettingsHandlerAdapter.addLanguage(language)) ?? [];
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`addLanguage failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

export const createProviderConfig = createAsyncThunk<Settings, ProviderConfig, { rejectValue: string }>(
    'settings/createProviderConfig',
    async (providerConfig, { rejectWithValue }) => {
        try {
            unwrap(await SettingsHandlerAdapter.createProviderConfig(providerConfig));
            return fromWireSettings(unwrap(await SettingsHandlerAdapter.getSettings()));
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`createProviderConfig failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

export const deleteProviderConfig = createAsyncThunk<void, string, { rejectValue: string }>(
    'settings/deleteProviderConfig',
    async (providerId, { dispatch, rejectWithValue }) => {
        try {
            unwrap(await SettingsHandlerAdapter.deleteProviderConfig(providerId));
            // The backend may have reassigned app_state.current_provider_id — and,
            // per Finding #2, the active model — if the deleted provider was
            // current. Resync both so the AppBar never shows a stale
            // provider/model combination after a deletion (T87 + Finding #2 fix).
            await Promise.all([dispatch(getCurrentProviderConfig()).unwrap(), dispatch(getModelConfig()).unwrap()]);
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`deleteProviderConfig failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

export const getAllProviderConfigs = createAsyncThunk<Array<ProviderConfig>, void, { rejectValue: string }>(
    'settings/getAllProviderConfigs',
    async (_, { rejectWithValue }) => {
        try {
            return (unwrap(await SettingsHandlerAdapter.getAllProviderConfigs()) ?? []).map(fromWireProvider);
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`getAllProviderConfigs failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

export const getAppSettingsMetadata = createAsyncThunk<AppSettingsMetadata, void, { rejectValue: string }>(
    'settings/getAppSettingsMetadata',
    async (_, { rejectWithValue }) => {
        try {
            return fromWireMetadata(unwrap(await SettingsHandlerAdapter.getAppSettingsMetadata()));
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`getAppSettingsMetadata failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

export const fetchProviderPresets = createAsyncThunk<apperr.ProviderPreset[], void, { rejectValue: string }>(
    'settings/fetchProviderPresets',
    async (_, { rejectWithValue }) => {
        try {
            return await getProviderPresets();
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`fetchProviderPresets failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

export const getCurrentProviderConfig = createAsyncThunk<ProviderConfig, void, { rejectValue: string }>(
    'settings/getCurrentProviderConfig',
    async (_, { rejectWithValue }) => {
        try {
            return fromWireProvider(unwrap(await SettingsHandlerAdapter.getCurrentProviderConfig()));
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`getCurrentProviderConfig failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

/**
 * Discovers the live model list for the given provider and returns the full
 * ModelInfo records (id, label, caps).
 *
 * A failed discovery (unreachable provider, missing credential) rejects with a
 * message but is non-fatal for the UI: the slice only reacts to the fulfilled
 * case, so a failed refresh leaves the previously-discovered list intact, while
 * a genuinely-empty successful discovery still clears it. Callers must not call
 * .unwrap() on this thunk — the rejection then never surfaces as a thrown error.
 */
export const discoverCurrentProviderModels = createAsyncThunk<Array<apperr.ModelInfo>, string, { rejectValue: string }>(
    'settings/discoverCurrentProviderModels',
    async (providerId, { rejectWithValue }) => {
        try {
            const res = await ActionHandlerAdapter.getModels(providerId);
            if (res.error) {
                logger.logWarning(`discoverCurrentProviderModels: ${res.error.message}`);
                return rejectWithValue(res.error.message);
            }
            return res.data ?? [];
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logWarning(`discoverCurrentProviderModels failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

export const getInferenceBaseConfig = createAsyncThunk<InferenceBaseConfig, void, { rejectValue: string }>(
    'settings/getInferenceBaseConfig',
    async (_, { rejectWithValue }) => {
        try {
            return unwrap(await SettingsHandlerAdapter.getInferenceBaseConfig());
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`getInferenceBaseConfig failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

export const getLanguageConfig = createAsyncThunk<LanguageConfig, void, { rejectValue: string }>(
    'settings/getLanguageConfig',
    async (_, { rejectWithValue }) => {
        try {
            return unwrap(await SettingsHandlerAdapter.getLanguageConfig());
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`getLanguageConfig failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

export const getModelConfig = createAsyncThunk<ModelConfig, void, { rejectValue: string }>(
    'settings/getModelConfig',
    async (_, { rejectWithValue }) => {
        try {
            return unwrap(await SettingsHandlerAdapter.getModelConfig());
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`getModelConfig failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

export const getSettings = createAsyncThunk<Settings, void, { rejectValue: string }>('settings/getSettings', async (_, { rejectWithValue }) => {
    try {
        return fromWireSettings(unwrap(await SettingsHandlerAdapter.getSettings()));
    } catch (error: unknown) {
        const err = parseError(error);
        logger.logError(`getSettings failed: ${err.message}`);
        return rejectWithValue(err.message);
    }
});

export const removeLanguage = createAsyncThunk<Array<string>, string, { rejectValue: string }>(
    'settings/removeLanguage',
    async (language, { rejectWithValue }) => {
        try {
            return unwrap(await SettingsHandlerAdapter.removeLanguage(language)) ?? [];
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`removeLanguage failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

export const resetSettingsToDefault = createAsyncThunk<Settings, void, { rejectValue: string }>(
    'settings/resetSettingsToDefault',
    async (_, { rejectWithValue }) => {
        try {
            return fromWireSettings(unwrap(await SettingsHandlerAdapter.resetSettingsToDefault()));
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`resetSettingsToDefault failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

export const setAsCurrentProviderConfig = createAsyncThunk<ProviderConfig, string, { rejectValue: string }>(
    'settings/setAsCurrentProviderConfig',
    async (providerId, { rejectWithValue }) => {
        try {
            return fromWireProvider(unwrap(await SettingsHandlerAdapter.setAsCurrentProviderConfig(providerId)));
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`setAsCurrentProviderConfig failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

export const setDefaultInputLanguage = createAsyncThunk<void, string, { rejectValue: string }>(
    'settings/setDefaultInputLanguage',
    async (language, { rejectWithValue }) => {
        try {
            unwrap(await SettingsHandlerAdapter.setDefaultInputLanguage(language));
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`setDefaultInputLanguage failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

export const setDefaultOutputLanguage = createAsyncThunk<void, string, { rejectValue: string }>(
    'settings/setDefaultOutputLanguage',
    async (language, { rejectWithValue }) => {
        try {
            unwrap(await SettingsHandlerAdapter.setDefaultOutputLanguage(language));
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`setDefaultOutputLanguage failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

export const updateInferenceBaseConfig = createAsyncThunk<InferenceBaseConfig, InferenceBaseConfig, { rejectValue: string }>(
    'settings/updateInferenceBaseConfig',
    async (config, { rejectWithValue }) => {
        try {
            return unwrap(await SettingsHandlerAdapter.updateInferenceBaseConfig(config));
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`updateInferenceBaseConfig failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

export const updateModelConfig = createAsyncThunk<ModelConfig, ModelConfig, { rejectValue: string }>(
    'settings/updateModelConfig',
    async (config, { rejectWithValue }) => {
        try {
            return unwrap(await SettingsHandlerAdapter.updateModelConfig(config));
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`updateModelConfig failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

export const updateProviderConfig = createAsyncThunk<ProviderConfig, ProviderConfig, { rejectValue: string }>(
    'settings/updateProviderConfig',
    async (providerConfig, { rejectWithValue }) => {
        try {
            return fromWireProvider(unwrap(await SettingsHandlerAdapter.updateProviderConfig(providerConfig)));
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`updateProviderConfig failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

export const getAppBehaviorConfig = createAsyncThunk<AppBehaviorConfig, void, { rejectValue: string }>(
    'settings/getAppBehaviorConfig',
    async (_, { rejectWithValue }) => {
        try {
            return fromWireBehavior(unwrap(await SettingsHandlerAdapter.getAppBehaviorConfig()));
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`getAppBehaviorConfig failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

export const updateAppBehaviorConfig = createAsyncThunk<AppBehaviorConfig, AppBehaviorConfig, { rejectValue: string }>(
    'settings/updateAppBehaviorConfig',
    async (config, { rejectWithValue }) => {
        try {
            return fromWireBehavior(unwrap(await SettingsHandlerAdapter.updateAppBehaviorConfig(config)));
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`updateAppBehaviorConfig failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

export const getLoggingConfig = createAsyncThunk<LoggingConfig, void, { rejectValue: string }>(
    'settings/getLoggingConfig',
    async (_, { rejectWithValue }) => {
        try {
            return fromWireLogging(unwrap(await SettingsHandlerAdapter.getLoggingConfig()));
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`getLoggingConfig failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

export const updateLoggingConfig = createAsyncThunk<LoggingConfig, LoggingConfig, { rejectValue: string }>(
    'settings/updateLoggingConfig',
    async (config, { rejectWithValue }) => {
        try {
            return fromWireLogging(unwrap(await SettingsHandlerAdapter.updateLoggingConfig(config)));
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`updateLoggingConfig failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

export const getUIPreferences = createAsyncThunk<
    {
        mode: ThemeMode;
        effective: ThemeEffective;
        layout: UIPreferencesConfig['layout'];
        sidebarCollapsed: boolean;
        historyOpen: boolean;
        viewMode: UIPreferencesConfig['viewMode'];
    },
    void,
    { rejectValue: string }
>('settings/getUIPreferences', async (_, { rejectWithValue }) => {
    try {
        const cfg = fromWireUIPreferences(unwrap(await SettingsHandlerAdapter.getUIPreferencesConfig()));
        const mode: ThemeMode = cfg.theme;
        return {
            mode,
            effective: resolveEffectiveTheme(mode),
            layout: cfg.layout,
            sidebarCollapsed: cfg.sidebarCollapsed,
            historyOpen: cfg.historyOpen,
            viewMode: cfg.viewMode,
        };
    } catch (error: unknown) {
        const err = parseError(error);
        logger.logError(`getUIPreferences failed: ${err.message}`);
        return rejectWithValue(err.message);
    }
});

export const persistUIPreferences = createAsyncThunk<void, void, { state: RootState; rejectValue: string }>(
    'settings/persistUIPreferences',
    async (_, { getState, rejectWithValue }) => {
        try {
            const state = getState();
            const config: UIPreferencesConfig = {
                theme: state.ui.theme.mode as 'auto' | 'light' | 'dark',
                layout: state.ui.layout,
                sidebarCollapsed: state.ui.sidebarCollapsed,
                historyOpen: state.ui.historyOpen,
                viewMode: state.editor.viewMode,
            };
            unwrap(await SettingsHandlerAdapter.updateUIPreferencesConfig(config));
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`persistUIPreferences failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

export const getAppBarVisibility = createAsyncThunk<AppBarVisibilityConfig, void, { rejectValue: string }>(
    'settings/getAppBarVisibility',
    async (_, { rejectWithValue }) => {
        try {
            return fromWireAppBarVisibility(unwrap(await SettingsHandlerAdapter.getAppBarVisibilityConfig()));
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`getAppBarVisibility failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

export const persistAppBarVisibility = createAsyncThunk<void, void, { state: RootState; rejectValue: string }>(
    'settings/persistAppBarVisibility',
    async (_, { getState, rejectWithValue }) => {
        try {
            unwrap(await SettingsHandlerAdapter.updateAppBarVisibilityConfig(getState().ui.appBarVisibility));
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`persistAppBarVisibility failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

/** The single armed run-target resolved from the persisted last-selection config, or nulled out when stale. */
export interface ArmedSelection {
    armedActionId: string | null;
    armedStackId: string | null;
}

export const persistLastSelection = createAsyncThunk<void, void, { state: RootState; rejectValue: string }>(
    'settings/persistLastSelection',
    async (_, { getState, rejectWithValue }) => {
        try {
            const { armedActionId, armedStackId } = getState().ui;
            unwrap(
                await SettingsHandlerAdapter.updateLastSelectionConfig({
                    kind: armedStackId ? 'stack' : armedActionId ? 'action' : 'none',
                    actionId: armedActionId ?? '',
                    stackId: armedStackId ?? '',
                }),
            );
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`persistLastSelection failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

/**
 * Restores the previously armed action/stack on startup. Resolves to the validated
 * armed target — never dispatches armAction/armStack directly, since ui/slice.ts already
 * depends on this module (getAppBarVisibility, getUIPreferences), and a reverse dependency
 * on ui/slice's action creators here would create a circular module import. Instead,
 * ui/slice.ts's extraReducers reacts to this thunk's fulfilled action, mirroring the
 * existing getUIPreferences.fulfilled pattern.
 *
 * A stale reference (action/stack id no longer present in the catalog/saved stacks) is
 * written back to the backend as `{ kind: 'none' }` so it doesn't keep resurfacing.
 */
export const restoreLastSelection = createAsyncThunk<ArmedSelection, void, { state: RootState; rejectValue: string }>(
    'settings/restoreLastSelection',
    async (_, { getState, rejectWithValue }) => {
        try {
            const selection = fromWireLastSelection(unwrap(await SettingsHandlerAdapter.getLastSelectionConfig()));
            const state = getState();

            if (selection.kind === 'stack') {
                if (state.stacksSaved.stacks.some((s) => s.id === selection.stackId)) {
                    return { armedActionId: null, armedStackId: selection.stackId };
                }
                unwrap(await SettingsHandlerAdapter.updateLastSelectionConfig({ kind: 'none', actionId: '', stackId: '' }));
                return { armedActionId: null, armedStackId: null };
            }

            if (selection.kind === 'action') {
                if (state.actions.catalog.some((a) => a.id === selection.actionId)) {
                    return { armedActionId: selection.actionId, armedStackId: null };
                }
                unwrap(await SettingsHandlerAdapter.updateLastSelectionConfig({ kind: 'none', actionId: '', stackId: '' }));
                return { armedActionId: null, armedStackId: null };
            }

            return { armedActionId: null, armedStackId: null };
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`restoreLastSelection failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

export const testProviderInference = createAsyncThunk<apperr.VerifyOutcome, ProviderConfig, { rejectValue: string }>(
    'settings/testProviderInference',
    async (providerConfig, { rejectWithValue }) => {
        try {
            return unwrap(await ActionHandlerAdapter.testInference(providerConfig));
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`testProviderInference failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

export const testConnection = createAsyncThunk<apperr.VerifyOutcome, ProviderConfig, { rejectValue: string }>(
    'settings/testConnection',
    async (providerConfig, { rejectWithValue }) => {
        try {
            return unwrap(await ActionHandlerAdapter.testConnection(providerConfig));
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`testConnection failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

export const testModels = createAsyncThunk<apperr.VerifyOutcome, ProviderConfig, { rejectValue: string }>(
    'settings/testModels',
    async (providerConfig, { rejectWithValue }) => {
        try {
            return unwrap(await ActionHandlerAdapter.testModels(providerConfig));
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`testModels failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

export const initializeSettingsState = createAsyncThunk<void, void, { rejectValue: string }>(
    'settings/initialize',
    async (_, { dispatch, rejectWithValue }) => {
        try {
            // Provider presets are a non-critical enhancement for the New Provider
            // form. Fire without .unwrap() so a preset-fetch failure never blocks
            // the critical settings load (which gates app startup).
            void dispatch(fetchProviderPresets());

            await Promise.all([
                dispatch(getSettings()).unwrap(),
                dispatch(getAllProviderConfigs()).unwrap(),
                dispatch(getCurrentProviderConfig()).unwrap(),
                dispatch(getLanguageConfig()).unwrap(),
                dispatch(getModelConfig()).unwrap(),
                dispatch(getInferenceBaseConfig()).unwrap(),
                dispatch(getAppSettingsMetadata()).unwrap(),
                dispatch(getUIPreferences()).unwrap(),
                dispatch(getAppBarVisibility()).unwrap(),
            ]);

            // Must run after getSettings so state.allSettings is populated before
            // getLoggingConfig.fulfilled fires (its reducer guard requires non-null allSettings).
            await dispatch(getLoggingConfig()).unwrap();
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`initializeSettingsState failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);
