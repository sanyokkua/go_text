import { createAsyncThunk } from '@reduxjs/toolkit';
import { LogDebug, LogWarning } from '../../../wailsjs/runtime';
import { SettingsApi, UiStateApi } from '../../common';
import { extractErrorDetails } from '../../common/error_utils';
import { AppSettings, ProviderType } from '../../common/types';
import { AppDispatch } from '../store';

export const appSettingsLoadCurrentSettings = createAsyncThunk<AppSettings, void, { dispatch: AppDispatch; rejectValue: string }>(
    'appSettings/appSettingsLoadCurrentSettings',
    async (_, { dispatch, rejectWithValue }) => {
        try {
            LogDebug('appSettingsLoadCurrentSettings is triggered');
            return await SettingsApi.loadSettings();
        } catch (error: unknown) {
            const msg = extractErrorDetails(error);
            LogWarning('Failed appSettingsLoadCurrentSettings with error: ' + msg);
            return rejectWithValue(msg);
        }
    },
);
export const appSettingsResetToDefaultSettings = createAsyncThunk<AppSettings, void, { dispatch: AppDispatch; rejectValue: string }>(
    'appSettings/appSettingsResetToDefaultSettings',
    async (_, { dispatch, rejectWithValue }) => {
        try {
            LogDebug('appSettingsResetToDefaultSettings is triggered');
            return await SettingsApi.resetToDefaultSettings();
        } catch (error: unknown) {
            const msg = extractErrorDetails(error);
            LogWarning('Failed appSettingsResetToDefaultSettings with error: ' + msg);
            return rejectWithValue(msg);
        }
    },
);
export const appSettingsSaveSettings = createAsyncThunk<void, AppSettings, { dispatch: AppDispatch; rejectWithValue: string }>(
    'appSettings/appSettingsSaveSettings',
    async (appSettings, { dispatch, rejectWithValue }) => {
        try {
            LogDebug('appSettingsSaveSettings is triggered');
            await SettingsApi.saveSettings(appSettings);
            // Only reload settings if this is not called from provider switching
            // When called from provider switching, the caller will handle the reload
            dispatch(appSettingsLoadCurrentSettings());
        } catch (error: unknown) {
            const msg = extractErrorDetails(error);
            LogWarning('Failed appSettingsSaveSettings with error: ' + msg);
            return rejectWithValue(msg);
        }
    },
);

export type ValidateModelsRequest = { baseUrl: string; endpoint: string; headers: Record<string, string> };
export const appSettingsValidateModelsRequest = createAsyncThunk<boolean, ValidateModelsRequest, { rejectValue: string }>(
    'appSettings/appSettingsValidateModelsRequest',
    async (userData, { rejectWithValue }) => {
        try {
            LogDebug('appSettingsValidateModelsRequest is triggered');
            return await SettingsApi.validateModelsRequest(userData.baseUrl, userData.endpoint, userData.headers);
        } catch (error: unknown) {
            const msg = extractErrorDetails(error);
            LogWarning('Failed appSettingsValidateModelsRequest with error: ' + msg);
            return rejectWithValue(msg);
        }
    },
);

export type ValidateCompletionRequest = { baseUrl: string; endpoint: string; modelName: string; headers: Record<string, string> };
export const appSettingsValidateCompletionRequest = createAsyncThunk<boolean, ValidateCompletionRequest, { rejectValue: string }>(
    'appSettings/validateCompletionRequest',
    async (userData, { rejectWithValue }) => {
        try {
            LogDebug('validateCompletionRequest is triggered');
            return await SettingsApi.validateCompletionRequest(userData.baseUrl, userData.endpoint, userData.modelName, userData.headers);
        } catch (error: unknown) {
            const msg = extractErrorDetails(error);
            LogWarning('Failed validateCompletionRequest with error: ' + msg);
            return rejectWithValue(msg);
        }
    },
);

export type SwitchProviderTypeRequest = { currentSettings: AppSettings; newProviderType: ProviderType };
export const appSettingsSwitchProviderType = createAsyncThunk<AppSettings, SwitchProviderTypeRequest, { rejectValue: string }>(
    'appSettings/appSettingsSwitchProviderType',
    async (request, { rejectWithValue }) => {
        try {
            LogDebug('appSettingsSwitchProviderType is triggered');
            return await SettingsApi.switchProviderType({ currentSettings: request.currentSettings, newProviderType: request.newProviderType });
        } catch (error: unknown) {
            const msg = extractErrorDetails(error);
            LogWarning('Failed appSettingsSwitchProviderType with error: ' + msg);
            return rejectWithValue(msg);
        }
    },
);

export type SwitchProviderTypeAndSaveRequest = { currentSettings: AppSettings; newProviderType: ProviderType };
export const appSettingsSwitchProviderTypeAndSave = createAsyncThunk<AppSettings, SwitchProviderTypeAndSaveRequest, { rejectValue: string }>(
    'appSettings/appSettingsSwitchProviderTypeAndSave',
    async (request, { rejectWithValue }) => {
        try {
            LogDebug('appSettingsSwitchProviderTypeAndSave is triggered');

            // Switch provider type
            // Switch provider type
            const newSettings = await SettingsApi.switchProviderType({
                currentSettings: request.currentSettings,
                newProviderType: request.newProviderType,
            });

            // Save the new settings
            await SettingsApi.saveSettings(newSettings);

            // Reload settings to ensure frontend and backend are in sync
            // Note: The caller will need to dispatch appSettingsLoadCurrentSettings() after this thunk

            return newSettings;
        } catch (error: unknown) {
            const msg = extractErrorDetails(error);
            LogWarning('Failed appSettingsSwitchProviderTypeAndSave with error: ' + msg);
            return rejectWithValue(msg);
        }
    },
);

export type VerifyProviderAvailabilityRequest = { baseUrl: string; modelsEndpoint: string; headers: Record<string, string> };
export const appSettingsVerifyProviderAvailability = createAsyncThunk<boolean, VerifyProviderAvailabilityRequest, { rejectValue: string }>(
    'appSettings/appSettingsVerifyProviderAvailability',
    async (request, { rejectWithValue }) => {
        try {
            LogDebug('appSettingsVerifyProviderAvailability is triggered');
            return await SettingsApi.verifyProviderAvailability(request.baseUrl, request.modelsEndpoint, request.headers);
        } catch (error: unknown) {
            const msg = extractErrorDetails(error);
            LogWarning('Failed appSettingsVerifyProviderAvailability with error: ' + msg);
            return rejectWithValue(msg);
        }
    },
);

export const appSettingsGetListOfModels = createAsyncThunk<string[], void, { rejectValue: string }>(
    'appSettings/appSettingsGetListOfModels',
    async (_, { rejectWithValue }) => {
        try {
            LogDebug('appSettingsGetListOfModels is triggered');
            return await UiStateApi.getModelsList();
        } catch (error: unknown) {
            const msg = extractErrorDetails(error);
            LogWarning('Failed appSettingsGetListOfModels with error: ' + msg);
            return rejectWithValue(msg);
        }
    },
);

export const initializeSettingsState = createAsyncThunk<void, void, { dispatch: AppDispatch; rejectValue: string }>(
    'appSettings/initialize',
    async (_, { dispatch }) => {
        await Promise.all([dispatch(appSettingsLoadCurrentSettings()).unwrap(), dispatch(appSettingsGetListOfModels()).unwrap()]);
    },
);

// Custom provider management thunks
export const appSettingsAddCustomProvider = createAsyncThunk<void, any, { rejectValue: string }>(
    'appSettings/appSettingsAddCustomProvider',
    async (provider, { rejectWithValue }) => {
        try {
            LogDebug('appSettingsAddCustomProvider is triggered');
            await SettingsApi.addCustomProvider(provider);
            // Reload settings to get the updated provider list
            await SettingsApi.loadSettings();
        } catch (error: unknown) {
            const msg = extractErrorDetails(error);
            LogWarning('Failed appSettingsAddCustomProvider with error: ' + msg);
            return rejectWithValue(msg);
        }
    },
);

export const appSettingsUpdateCustomProvider = createAsyncThunk<void, any, { rejectValue: string }>(
    'appSettings/appSettingsUpdateCustomProvider',
    async (provider, { rejectWithValue }) => {
        try {
            LogDebug('appSettingsUpdateCustomProvider is triggered');
            await SettingsApi.updateCustomProvider(provider);
            // Reload settings to get the updated provider list
            await SettingsApi.loadSettings();
        } catch (error: unknown) {
            const msg = extractErrorDetails(error);
            LogWarning('Failed appSettingsUpdateCustomProvider with error: ' + msg);
            return rejectWithValue(msg);
        }
    },
);

export const appSettingsDeleteCustomProvider = createAsyncThunk<void, string, { rejectValue: string }>(
    'appSettings/appSettingsDeleteCustomProvider',
    async (providerName, { rejectWithValue }) => {
        try {
            LogDebug('appSettingsDeleteCustomProvider is triggered');
            await SettingsApi.deleteCustomProvider(providerName);
            // Reload settings to get the updated provider list
            await SettingsApi.loadSettings();
        } catch (error: unknown) {
            const msg = extractErrorDetails(error);
            LogWarning('Failed appSettingsDeleteCustomProvider with error: ' + msg);
            return rejectWithValue(msg);
        }
    },
);

export const appSettingsGetCustomProviders = createAsyncThunk<any[], void, { rejectValue: string }>(
    'appSettings/appSettingsGetCustomProviders',
    async (_, { rejectWithValue }) => {
        try {
            LogDebug('appSettingsGetCustomProviders is triggered');
            return await SettingsApi.getCustomProviders();
        } catch (error: unknown) {
            const msg = extractErrorDetails(error);
            LogWarning('Failed appSettingsGetCustomProviders with error: ' + msg);
            return rejectWithValue(msg);
        }
    },
);
