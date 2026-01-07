import { createAsyncThunk } from '@reduxjs/toolkit';
import {
    AppSettingsMetadata,
    getLogger,
    InferenceBaseConfig,
    LanguageConfig,
    ModelConfig,
    ProviderConfig,
    Settings,
    SettingsHandlerAdapter,
} from '../../adapter';
import { parseError } from '../../utils/error_utils';

const logger = getLogger('SettingsThunks');

// Thunk for adding a language
export const addLanguage = createAsyncThunk<Array<string>, string, { rejectValue: string }>(
    'settings/addLanguage',
    async (language: string, { rejectWithValue }) => {
        try {
            logger.logInfo(`Attempting to add language: ${language}`);
            const result = await SettingsHandlerAdapter.addLanguage(language);
            logger.logInfo(`Successfully added language, total languages: ${result.length}`);
            return result;
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Failed to add language: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

// Thunk for creating a provider config
export const createProviderConfig = createAsyncThunk<ProviderConfig, ProviderConfig, { rejectValue: string }>(
    'settings/createProviderConfig',
    async (providerConfig: ProviderConfig, { rejectWithValue }) => {
        try {
            logger.logInfo(`Attempting to create provider config: ${providerConfig.providerName}`);
            const result = await SettingsHandlerAdapter.createProviderConfig(providerConfig);
            logger.logInfo(`Successfully created provider config: ${result.providerName}`);
            return result;
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Failed to create provider config: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

// Thunk for deleting a provider config
export const deleteProviderConfig = createAsyncThunk<void, string, { rejectValue: string }>(
    'settings/deleteProviderConfig',
    async (providerId: string, { rejectWithValue }) => {
        try {
            logger.logInfo(`Attempting to delete provider config: ${providerId}`);
            await SettingsHandlerAdapter.deleteProviderConfig(providerId);
            logger.logInfo(`Successfully deleted provider config: ${providerId}`);
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Failed to delete provider config: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

// Thunk for getting all provider configs
export const getAllProviderConfigs = createAsyncThunk<Array<ProviderConfig>, void, { rejectValue: string }>(
    'settings/getAllProviderConfigs',
    async (_, { rejectWithValue }) => {
        try {
            logger.logInfo('Attempting to get all provider configs');
            const result = await SettingsHandlerAdapter.getAllProviderConfigs();
            logger.logInfo(`Successfully retrieved ${result.length} provider configs`);
            return result;
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Failed to get all provider configs: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

// Thunk for getting app settings metadata
export const getAppSettingsMetadata = createAsyncThunk<AppSettingsMetadata, void, { rejectValue: string }>(
    'settings/getAppSettingsMetadata',
    async (_, { rejectWithValue }) => {
        try {
            logger.logInfo('Attempting to get app settings metadata');
            const result = await SettingsHandlerAdapter.getAppSettingsMetadata();
            logger.logInfo('Successfully retrieved app settings metadata');
            return result;
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Failed to get app settings metadata: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

// Thunk for getting current provider config
export const getCurrentProviderConfig = createAsyncThunk<ProviderConfig, void, { rejectValue: string }>(
    'settings/getCurrentProviderConfig',
    async (_, { rejectWithValue }) => {
        try {
            logger.logInfo('Attempting to get current provider config');
            const result = await SettingsHandlerAdapter.getCurrentProviderConfig();
            logger.logInfo(`Successfully retrieved current provider config: ${result.providerName}`);
            return result;
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Failed to get current provider config: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

// Thunk for getting inference base config
export const getInferenceBaseConfig = createAsyncThunk<InferenceBaseConfig, void, { rejectValue: string }>(
    'settings/getInferenceBaseConfig',
    async (_, { rejectWithValue }) => {
        try {
            logger.logInfo('Attempting to get inference base config');
            const result = await SettingsHandlerAdapter.getInferenceBaseConfig();
            logger.logInfo('Successfully retrieved inference base config');
            return result;
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Failed to get inference base config: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

// Thunk for getting language config
export const getLanguageConfig = createAsyncThunk<LanguageConfig, void, { rejectValue: string }>(
    'settings/getLanguageConfig',
    async (_, { rejectWithValue }) => {
        try {
            logger.logInfo('Attempting to get language config');
            const result = await SettingsHandlerAdapter.getLanguageConfig();
            logger.logInfo(`Successfully retrieved language config with ${result.languages.length} languages`);
            return result;
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Failed to get language config: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

// Thunk for getting model config
export const getModelConfig = createAsyncThunk<ModelConfig, void, { rejectValue: string }>(
    'settings/getModelConfig',
    async (_, { rejectWithValue }) => {
        try {
            logger.logInfo('Attempting to get model config');
            const result = await SettingsHandlerAdapter.getModelConfig();
            logger.logInfo(`Successfully retrieved model config: ${result.name}`);
            return result;
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Failed to get model config: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

// Thunk for getting provider config by ID
export const getProviderConfig = createAsyncThunk<ProviderConfig, string, { rejectValue: string }>(
    'settings/getProviderConfig',
    async (providerId: string, { rejectWithValue }) => {
        try {
            logger.logInfo(`Attempting to get provider config: ${providerId}`);
            const result = await SettingsHandlerAdapter.getProviderConfig(providerId);
            logger.logInfo(`Successfully retrieved provider config: ${result.providerName}`);
            return result;
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Failed to get provider config: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

// Thunk for getting all settings
export const getSettings = createAsyncThunk<Settings, void, { rejectValue: string }>('settings/getSettings', async (_, { rejectWithValue }) => {
    try {
        logger.logInfo('Attempting to get all settings');
        const result = await SettingsHandlerAdapter.getSettings();
        logger.logInfo(`Successfully retrieved settings with ${result.availableProviderConfigs.length} providers`);
        return result;
    } catch (error: unknown) {
        const err = parseError(error);
        logger.logError(`Failed to get all settings: ${err.message}`);
        return rejectWithValue(err.message);
    }
});

// Thunk for removing a language
export const removeLanguage = createAsyncThunk<Array<string>, string, { rejectValue: string }>(
    'settings/removeLanguage',
    async (language: string, { rejectWithValue }) => {
        try {
            logger.logInfo(`Attempting to remove language: ${language}`);
            const result = await SettingsHandlerAdapter.removeLanguage(language);
            logger.logInfo(`Successfully removed language, total languages: ${result.length}`);
            return result;
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Failed to remove language: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

// Thunk for resetting settings to default
export const resetSettingsToDefault = createAsyncThunk<Settings, void, { rejectValue: string }>(
    'settings/resetSettingsToDefault',
    async (_, { rejectWithValue }) => {
        try {
            logger.logInfo('Attempting to reset settings to default');
            const result = await SettingsHandlerAdapter.resetSettingsToDefault();
            logger.logInfo('Successfully reset settings to default');
            return result;
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Failed to reset settings to default: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

// Thunk for setting current provider config
export const setAsCurrentProviderConfig = createAsyncThunk<ProviderConfig, string, { rejectValue: string }>(
    'settings/setAsCurrentProviderConfig',
    async (providerId: string, { rejectWithValue }) => {
        try {
            logger.logInfo(`Attempting to set current provider config: ${providerId}`);
            const result = await SettingsHandlerAdapter.setAsCurrentProviderConfig(providerId);
            logger.logInfo(`Successfully set current provider config: ${result.providerName}`);
            return result;
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Failed to set current provider config: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

// Thunk for setting default input language
export const setDefaultInputLanguage = createAsyncThunk<void, string, { rejectValue: string }>(
    'settings/setDefaultInputLanguage',
    async (language: string, { rejectWithValue }) => {
        try {
            logger.logInfo(`Attempting to set default input language: ${language}`);
            await SettingsHandlerAdapter.setDefaultInputLanguage(language);
            logger.logInfo(`Successfully set default input language: ${language}`);
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Failed to set default input language: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

// Thunk for setting default output language
export const setDefaultOutputLanguage = createAsyncThunk<void, string, { rejectValue: string }>(
    'settings/setDefaultOutputLanguage',
    async (language: string, { rejectWithValue }) => {
        try {
            logger.logInfo(`Attempting to set default output language: ${language}`);
            await SettingsHandlerAdapter.setDefaultOutputLanguage(language);
            logger.logInfo(`Successfully set default output language: ${language}`);
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Failed to set default output language: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

// Thunk for updating inference base config
export const updateInferenceBaseConfig = createAsyncThunk<InferenceBaseConfig, InferenceBaseConfig, { rejectValue: string }>(
    'settings/updateInferenceBaseConfig',
    async (inferenceBaseConfig: InferenceBaseConfig, { rejectWithValue }) => {
        try {
            logger.logInfo('Attempting to update inference base config');
            const result = await SettingsHandlerAdapter.updateInferenceBaseConfig(inferenceBaseConfig);
            logger.logInfo('Successfully updated inference base config');
            return result;
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Failed to update inference base config: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

// Thunk for updating model config
export const updateModelConfig = createAsyncThunk<ModelConfig, ModelConfig, { rejectValue: string }>(
    'settings/updateModelConfig',
    async (modelConfig: ModelConfig, { rejectWithValue }) => {
        try {
            logger.logInfo(`Attempting to update model config: ${modelConfig.name}`);
            const result = await SettingsHandlerAdapter.updateModelConfig(modelConfig);
            logger.logInfo(`Successfully updated model config: ${result.name}`);
            return result;
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Failed to update model config: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

// Thunk for updating provider config
export const updateProviderConfig = createAsyncThunk<ProviderConfig, ProviderConfig, { rejectValue: string }>(
    'settings/updateProviderConfig',
    async (providerConfig: ProviderConfig, { rejectWithValue }) => {
        try {
            logger.logInfo(`Attempting to update provider config: ${providerConfig.providerName}`);
            const result = await SettingsHandlerAdapter.updateProviderConfig(providerConfig);
            logger.logInfo(`Successfully updated provider config: ${result.providerName}`);
            return result;
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Failed to update provider config: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

// Thunk for initializing settings state
export const initializeSettingsState = createAsyncThunk<void, void, { rejectValue: string }>(
    'settings/initialize',
    async (_, { dispatch, rejectWithValue }) => {
        try {
            logger.logInfo('Initializing settings state');
            await Promise.all([
                dispatch(getSettings()).unwrap(),
                dispatch(getAllProviderConfigs()).unwrap(),
                dispatch(getCurrentProviderConfig()).unwrap(),
                dispatch(getLanguageConfig()).unwrap(),
                dispatch(getModelConfig()).unwrap(),
                dispatch(getInferenceBaseConfig()).unwrap(),
                dispatch(getAppSettingsMetadata()).unwrap(),
            ]);
            logger.logInfo('Successfully initialized settings state');
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Failed to initialize settings state: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);
