import { createAsyncThunk } from '@reduxjs/toolkit';
import {
    fromWireBehavior,
    fromWireMetadata,
    fromWireProvider,
    fromWireSettings,
    getLogger,
    SettingsHandlerAdapter,
    unwrap,
} from '../../adapter';
import { AppBehaviorConfig, AppSettingsMetadata, InferenceBaseConfig, LanguageConfig, ModelConfig, ProviderConfig, Settings } from '../../adapter/models';
import { parseError } from '../../utils/error_utils';

const logger = getLogger('SettingsThunks');

export const addLanguage = createAsyncThunk<Array<string>, string, { rejectValue: string }>(
    'settings/addLanguage',
    async (language, { rejectWithValue }) => {
        try {
            return unwrap(await SettingsHandlerAdapter.addLanguage(language)) ?? [];
        } catch (error: unknown) {
            logger.logError(`addLanguage failed: ${parseError(error).message}`);
            return rejectWithValue(parseError(error).message);
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
            logger.logError(`createProviderConfig failed: ${parseError(error).message}`);
            return rejectWithValue(parseError(error).message);
        }
    },
);

export const deleteProviderConfig = createAsyncThunk<void, string, { rejectValue: string }>(
    'settings/deleteProviderConfig',
    async (providerId, { rejectWithValue }) => {
        try {
            unwrap(await SettingsHandlerAdapter.deleteProviderConfig(providerId));
        } catch (error: unknown) {
            logger.logError(`deleteProviderConfig failed: ${parseError(error).message}`);
            return rejectWithValue(parseError(error).message);
        }
    },
);

export const getAllProviderConfigs = createAsyncThunk<Array<ProviderConfig>, void, { rejectValue: string }>(
    'settings/getAllProviderConfigs',
    async (_, { rejectWithValue }) => {
        try {
            return (unwrap(await SettingsHandlerAdapter.getAllProviderConfigs()) ?? []).map(fromWireProvider);
        } catch (error: unknown) {
            logger.logError(`getAllProviderConfigs failed: ${parseError(error).message}`);
            return rejectWithValue(parseError(error).message);
        }
    },
);

export const getAppSettingsMetadata = createAsyncThunk<AppSettingsMetadata, void, { rejectValue: string }>(
    'settings/getAppSettingsMetadata',
    async (_, { rejectWithValue }) => {
        try {
            return fromWireMetadata(unwrap(await SettingsHandlerAdapter.getAppSettingsMetadata()));
        } catch (error: unknown) {
            logger.logError(`getAppSettingsMetadata failed: ${parseError(error).message}`);
            return rejectWithValue(parseError(error).message);
        }
    },
);

export const getCurrentProviderConfig = createAsyncThunk<ProviderConfig, void, { rejectValue: string }>(
    'settings/getCurrentProviderConfig',
    async (_, { rejectWithValue }) => {
        try {
            return fromWireProvider(unwrap(await SettingsHandlerAdapter.getCurrentProviderConfig()));
        } catch (error: unknown) {
            logger.logError(`getCurrentProviderConfig failed: ${parseError(error).message}`);
            return rejectWithValue(parseError(error).message);
        }
    },
);

export const getInferenceBaseConfig = createAsyncThunk<InferenceBaseConfig, void, { rejectValue: string }>(
    'settings/getInferenceBaseConfig',
    async (_, { rejectWithValue }) => {
        try {
            return unwrap(await SettingsHandlerAdapter.getInferenceBaseConfig());
        } catch (error: unknown) {
            logger.logError(`getInferenceBaseConfig failed: ${parseError(error).message}`);
            return rejectWithValue(parseError(error).message);
        }
    },
);

export const getLanguageConfig = createAsyncThunk<LanguageConfig, void, { rejectValue: string }>(
    'settings/getLanguageConfig',
    async (_, { rejectWithValue }) => {
        try {
            return unwrap(await SettingsHandlerAdapter.getLanguageConfig());
        } catch (error: unknown) {
            logger.logError(`getLanguageConfig failed: ${parseError(error).message}`);
            return rejectWithValue(parseError(error).message);
        }
    },
);

export const getModelConfig = createAsyncThunk<ModelConfig, void, { rejectValue: string }>(
    'settings/getModelConfig',
    async (_, { rejectWithValue }) => {
        try {
            return unwrap(await SettingsHandlerAdapter.getModelConfig());
        } catch (error: unknown) {
            logger.logError(`getModelConfig failed: ${parseError(error).message}`);
            return rejectWithValue(parseError(error).message);
        }
    },
);

export const getSettings = createAsyncThunk<Settings, void, { rejectValue: string }>(
    'settings/getSettings',
    async (_, { rejectWithValue }) => {
        try {
            return fromWireSettings(unwrap(await SettingsHandlerAdapter.getSettings()));
        } catch (error: unknown) {
            logger.logError(`getSettings failed: ${parseError(error).message}`);
            return rejectWithValue(parseError(error).message);
        }
    },
);

export const removeLanguage = createAsyncThunk<Array<string>, string, { rejectValue: string }>(
    'settings/removeLanguage',
    async (language, { rejectWithValue }) => {
        try {
            return unwrap(await SettingsHandlerAdapter.removeLanguage(language)) ?? [];
        } catch (error: unknown) {
            logger.logError(`removeLanguage failed: ${parseError(error).message}`);
            return rejectWithValue(parseError(error).message);
        }
    },
);

export const resetSettingsToDefault = createAsyncThunk<Settings, void, { rejectValue: string }>(
    'settings/resetSettingsToDefault',
    async (_, { rejectWithValue }) => {
        try {
            return fromWireSettings(unwrap(await SettingsHandlerAdapter.resetSettingsToDefault()));
        } catch (error: unknown) {
            logger.logError(`resetSettingsToDefault failed: ${parseError(error).message}`);
            return rejectWithValue(parseError(error).message);
        }
    },
);

export const setAsCurrentProviderConfig = createAsyncThunk<ProviderConfig, string, { rejectValue: string }>(
    'settings/setAsCurrentProviderConfig',
    async (providerId, { rejectWithValue }) => {
        try {
            return fromWireProvider(unwrap(await SettingsHandlerAdapter.setAsCurrentProviderConfig(providerId)));
        } catch (error: unknown) {
            logger.logError(`setAsCurrentProviderConfig failed: ${parseError(error).message}`);
            return rejectWithValue(parseError(error).message);
        }
    },
);

export const setDefaultInputLanguage = createAsyncThunk<void, string, { rejectValue: string }>(
    'settings/setDefaultInputLanguage',
    async (language, { rejectWithValue }) => {
        try {
            unwrap(await SettingsHandlerAdapter.setDefaultInputLanguage(language));
        } catch (error: unknown) {
            logger.logError(`setDefaultInputLanguage failed: ${parseError(error).message}`);
            return rejectWithValue(parseError(error).message);
        }
    },
);

export const setDefaultOutputLanguage = createAsyncThunk<void, string, { rejectValue: string }>(
    'settings/setDefaultOutputLanguage',
    async (language, { rejectWithValue }) => {
        try {
            unwrap(await SettingsHandlerAdapter.setDefaultOutputLanguage(language));
        } catch (error: unknown) {
            logger.logError(`setDefaultOutputLanguage failed: ${parseError(error).message}`);
            return rejectWithValue(parseError(error).message);
        }
    },
);

export const updateInferenceBaseConfig = createAsyncThunk<InferenceBaseConfig, InferenceBaseConfig, { rejectValue: string }>(
    'settings/updateInferenceBaseConfig',
    async (config, { rejectWithValue }) => {
        try {
            return unwrap(await SettingsHandlerAdapter.updateInferenceBaseConfig(config));
        } catch (error: unknown) {
            logger.logError(`updateInferenceBaseConfig failed: ${parseError(error).message}`);
            return rejectWithValue(parseError(error).message);
        }
    },
);

export const updateModelConfig = createAsyncThunk<ModelConfig, ModelConfig, { rejectValue: string }>(
    'settings/updateModelConfig',
    async (config, { rejectWithValue }) => {
        try {
            return unwrap(await SettingsHandlerAdapter.updateModelConfig(config));
        } catch (error: unknown) {
            logger.logError(`updateModelConfig failed: ${parseError(error).message}`);
            return rejectWithValue(parseError(error).message);
        }
    },
);

export const updateProviderConfig = createAsyncThunk<ProviderConfig, ProviderConfig, { rejectValue: string }>(
    'settings/updateProviderConfig',
    async (providerConfig, { rejectWithValue }) => {
        try {
            return fromWireProvider(unwrap(await SettingsHandlerAdapter.updateProviderConfig(providerConfig)));
        } catch (error: unknown) {
            logger.logError(`updateProviderConfig failed: ${parseError(error).message}`);
            return rejectWithValue(parseError(error).message);
        }
    },
);

export const getAppBehaviorConfig = createAsyncThunk<AppBehaviorConfig, void, { rejectValue: string }>(
    'settings/getAppBehaviorConfig',
    async (_, { rejectWithValue }) => {
        try {
            return fromWireBehavior(unwrap(await SettingsHandlerAdapter.getAppBehaviorConfig()));
        } catch (error: unknown) {
            logger.logError(`getAppBehaviorConfig failed: ${parseError(error).message}`);
            return rejectWithValue(parseError(error).message);
        }
    },
);

export const updateAppBehaviorConfig = createAsyncThunk<AppBehaviorConfig, AppBehaviorConfig, { rejectValue: string }>(
    'settings/updateAppBehaviorConfig',
    async (config, { rejectWithValue }) => {
        try {
            return fromWireBehavior(unwrap(await SettingsHandlerAdapter.updateAppBehaviorConfig(config)));
        } catch (error: unknown) {
            logger.logError(`updateAppBehaviorConfig failed: ${parseError(error).message}`);
            return rejectWithValue(parseError(error).message);
        }
    },
);

export const initializeSettingsState = createAsyncThunk<void, void, { rejectValue: string }>(
    'settings/initialize',
    async (_, { dispatch, rejectWithValue }) => {
        try {
            await Promise.all([
                dispatch(getSettings()).unwrap(),
                dispatch(getAllProviderConfigs()).unwrap(),
                dispatch(getCurrentProviderConfig()).unwrap(),
                dispatch(getLanguageConfig()).unwrap(),
                dispatch(getModelConfig()).unwrap(),
                dispatch(getInferenceBaseConfig()).unwrap(),
                dispatch(getAppSettingsMetadata()).unwrap(),
            ]);
        } catch (error: unknown) {
            logger.logError(`initializeSettingsState failed: ${parseError(error).message}`);
            return rejectWithValue(parseError(error).message);
        }
    },
);
