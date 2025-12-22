import { createAsyncThunk } from '@reduxjs/toolkit';
import {
    FrontProviderConfig,
    FrontSettings,
    LoggerServiceInstance as log,
    parseError,
    SettingsServiceInstance as settingsService,
} from '../../service';
import { AppDispatch } from '../store';

// Example
export const settingsGetCurrentSettings = createAsyncThunk<FrontSettings, void, { dispatch: AppDispatch; rejectValue: string }>(
    'settingsState/settingsGetCurrentSettings',
    async (_, { dispatch, rejectWithValue }) => {
        try {
            log.debug('appSettingsLoadCurrentSettings is triggered');
            return await settingsService.getCurrentSettings();
        } catch (error: unknown) {
            const msg = parseError(error);
            log.warning('Failed appSettingsLoadCurrentSettings with error: ' + msg.originalError);
            return rejectWithValue(msg.message);
        }
    },
);

export const settingsCreateNewProvider = createAsyncThunk<
    FrontProviderConfig,
    { providerConfig: FrontProviderConfig; modelName?: string },
    { dispatch: AppDispatch; rejectValue: string }
>('settingsState/settingsCreateNewProvider', async ({ providerConfig, modelName }, { dispatch, rejectWithValue }) => {
    try {
        log.debug('settingsCreateNewProvider is triggered');
        return await settingsService.createNewProvider(providerConfig, modelName);
    } catch (error: unknown) {
        const msg = parseError(error);
        log.warning('Failed settingsCreateNewProvider with error: ' + msg.originalError);
        return rejectWithValue(msg.message);
    }
});

export const settingsDeleteProvider = createAsyncThunk<boolean, FrontProviderConfig, { dispatch: AppDispatch; rejectValue: string }>(
    'settingsState/settingsDeleteProvider',
    async (providerConfig: FrontProviderConfig, { dispatch, rejectWithValue }) => {
        try {
            log.debug('settingsDeleteProvider is triggered');
            return await settingsService.deleteProvider(providerConfig);
        } catch (error: unknown) {
            const msg = parseError(error);
            log.warning('Failed settingsDeleteProvider with error: ' + msg.originalError);
            return rejectWithValue(msg.message);
        }
    },
);

export const settingsGetDefaultSettings = createAsyncThunk<FrontSettings, void, { dispatch: AppDispatch; rejectValue: string }>(
    'settingsState/settingsGetDefaultSettings',
    async (_, { dispatch, rejectWithValue }) => {
        try {
            log.debug('settingsGetDefaultSettings is triggered');
            return await settingsService.getDefaultSettings();
        } catch (error: unknown) {
            const msg = parseError(error);
            log.warning('Failed settingsGetDefaultSettings with error: ' + msg.originalError);
            return rejectWithValue(msg.message);
        }
    },
);

export const settingsGetModelsList = createAsyncThunk<Array<string>, FrontProviderConfig, { dispatch: AppDispatch; rejectValue: string }>(
    'settingsState/settingsGetModelsList',
    async (providerConfig: FrontProviderConfig, { dispatch, rejectWithValue }) => {
        try {
            log.debug('settingsGetModelsList is triggered');
            return await settingsService.getModelsList(providerConfig);
        } catch (error: unknown) {
            const msg = parseError(error);
            log.warning('Failed settingsGetModelsList with error: ' + msg.originalError);
            return rejectWithValue(msg.message);
        }
    },
);

export const settingsGetProviderTypes = createAsyncThunk<Array<string>, void, { dispatch: AppDispatch; rejectValue: string }>(
    'settingsState/settingsGetProviderTypes',
    async (_, { dispatch, rejectWithValue }) => {
        try {
            log.debug('settingsGetProviderTypes is triggered');
            return await settingsService.getProviderTypes();
        } catch (error: unknown) {
            const msg = parseError(error);
            log.warning('Failed settingsGetProviderTypes with error: ' + msg.originalError);
            return rejectWithValue(msg.message);
        }
    },
);

export const settingsGetSettingsFilePath = createAsyncThunk<string, void, { dispatch: AppDispatch; rejectValue: string }>(
    'settingsState/settingsGetSettingsFilePath',
    async (_, { dispatch, rejectWithValue }) => {
        try {
            log.debug('settingsGetSettingsFilePath is triggered');
            return await settingsService.getSettingsFilePath();
        } catch (error: unknown) {
            const msg = parseError(error);
            log.warning('Failed settingsGetSettingsFilePath with error: ' + msg.originalError);
            return rejectWithValue(msg.message);
        }
    },
);

export const settingsSaveSettings = createAsyncThunk<FrontSettings, FrontSettings, { dispatch: AppDispatch; rejectValue: string }>(
    'settingsState/settingsSaveSettings',
    async (settings: FrontSettings, { dispatch, rejectWithValue }) => {
        try {
            log.debug('settingsSaveSettings is triggered');
            return await settingsService.saveSettings(settings);
        } catch (error: unknown) {
            const msg = parseError(error);
            log.warning('Failed settingsSaveSettings with error: ' + msg.originalError);
            return rejectWithValue(msg.message);
        }
    },
);

export const settingsSelectProvider = createAsyncThunk<FrontProviderConfig, FrontProviderConfig, { dispatch: AppDispatch; rejectValue: string }>(
    'settingsState/settingsSelectProvider',
    async (providerConfig: FrontProviderConfig, { dispatch, rejectWithValue }) => {
        try {
            log.debug('settingsSelectProvider is triggered');
            return await settingsService.selectProvider(providerConfig);
        } catch (error: unknown) {
            const msg = parseError(error);
            log.warning('Failed settingsSelectProvider with error: ' + msg.originalError);
            return rejectWithValue(msg.message);
        }
    },
);

export const settingsUpdateProvider = createAsyncThunk<FrontProviderConfig, FrontProviderConfig, { dispatch: AppDispatch; rejectValue: string }>(
    'settingsState/settingsUpdateProvider',
    async (providerConfig: FrontProviderConfig, { dispatch, rejectWithValue }) => {
        try {
            log.debug('settingsUpdateProvider is triggered');
            return await settingsService.updateProvider(providerConfig);
        } catch (error: unknown) {
            const msg = parseError(error);
            log.warning('Failed settingsUpdateProvider with error: ' + msg.originalError);
            return rejectWithValue(msg.message);
        }
    },
);

export const settingsValidateProvider = createAsyncThunk<
    boolean,
    { providerConfig: FrontProviderConfig; validateHttpCalls: boolean; modelName?: string },
    { dispatch: AppDispatch; rejectValue: string }
>('settingsState/settingsValidateProvider', async ({ providerConfig, validateHttpCalls, modelName }, { dispatch, rejectWithValue }) => {
    try {
        log.debug('settingsValidateProvider is triggered');
        return await settingsService.validateProvider(providerConfig, validateHttpCalls, modelName);
    } catch (error: unknown) {
        const msg = parseError(error);
        log.warning('Failed settingsValidateProvider with error: ' + msg.originalError);
        return rejectWithValue(msg.message);
    }
});

export const initializeSettingsState = createAsyncThunk<void, void, { dispatch: AppDispatch; rejectValue: string }>(
    'appSettings/initialize',
    async (_, { dispatch }) => {
        await Promise.all([
            dispatch(settingsGetCurrentSettings()).unwrap(),
            dispatch(settingsGetProviderTypes()).unwrap(),
            dispatch(settingsGetSettingsFilePath()).unwrap(),
        ]);
    },
);
