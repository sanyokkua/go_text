import { createAsyncThunk } from '@reduxjs/toolkit';
import { LogDebug, LogWarning } from '../../../wailsjs/runtime';
import { SettingsApi, UiStateApi } from '../../common';
import { extractErrorDetails } from '../../common/error_utils';
import { AppSettings } from '../../common/types';
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
export const appSettingsSaveSettings = createAsyncThunk<void, AppSettings, { dispatch: AppDispatch; rejectValue: string }>(
    'appSettings/appSettingsSaveSettings',
    async (appSettings, { dispatch, rejectWithValue }) => {
        try {
            LogDebug('appSettingsSaveSettings is triggered');
            await SettingsApi.saveSettings(appSettings);
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
