import { createAsyncThunk } from '@reduxjs/toolkit';
import { LogDebug, LogWarning } from '../../../wailsjs/runtime';
import { SettingsApi, UiStateApi } from '../../common';
import { extractErrorDetails } from '../../common/error_utils';
import { AppSettings } from '../../common/types';
import { AppDispatch } from '../store';

export const appSettingsLoadCurrentSettings = createAsyncThunk<
    AppSettings,
    void,
    { dispatch: AppDispatch; rejectValue: string }
>('appSettings/appSettingsLoadCurrentSettings', async (_, { dispatch, rejectWithValue }) => {
    try {
        LogDebug('appSettingsLoadCurrentSettings is triggered');
        const settings = await SettingsApi.loadSettings();
        dispatch(appSettingsGetListOfModels());
        return settings;
    } catch (error: unknown) {
        const msg = extractErrorDetails(error);
        LogWarning('Failed appSettingsLoadCurrentSettings with error: ' + msg);
        return rejectWithValue(msg);
    }
});
export const appSettingsResetToDefaultSettings = createAsyncThunk<
    AppSettings,
    void,
    { dispatch: AppDispatch; rejectValue: string }
>('appSettings/appSettingsResetToDefaultSettings', async (_, { dispatch, rejectWithValue }) => {
    try {
        LogDebug('appSettingsResetToDefaultSettings is triggered');
        const settings = await SettingsApi.resetToDefaultSettings();
        dispatch(appSettingsSaveSettings(settings));
        dispatch(appSettingsGetListOfModels());
        return settings;
    } catch (error: unknown) {
        const msg = extractErrorDetails(error);
        LogWarning('Failed appSettingsResetToDefaultSettings with error: ' + msg);
        return rejectWithValue(msg);
    }
});
export const appSettingsSaveSettings = createAsyncThunk<
    void,
    AppSettings,
    { dispatch: AppDispatch; rejectValue: string }
>('appSettings/appSettingsSaveSettings', async (appSettings, { dispatch, rejectWithValue }) => {
    try {
        LogDebug('appSettingsSaveSettings is triggered');
        await SettingsApi.saveSettings(appSettings);
        dispatch(appSettingsLoadCurrentSettings());
    } catch (error: unknown) {
        const msg = extractErrorDetails(error);
        LogWarning('Failed appSettingsSaveSettings with error: ' + msg);
        return rejectWithValue(msg);
    }
});

export type ValidateUserUrlAndHeaders = { baseUrl: string; headers: Record<string, string> };
export const appSettingsValidateUrlAndHeaders = createAsyncThunk<
    boolean,
    ValidateUserUrlAndHeaders,
    { rejectValue: string }
>('appSettings/appSettingsValidateUrlAndHeaders', async (userData, { rejectWithValue }) => {
    try {
        LogDebug('appSettingsValidateUrlAndHeaders is triggered');
        return await SettingsApi.validateConnection(userData.baseUrl, userData.headers);
    } catch (error: unknown) {
        const msg = extractErrorDetails(error);
        LogWarning('Failed appSettingsValidateUrlAndHeaders with error: ' + msg);
        return rejectWithValue(msg);
    }
});

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
        await Promise.all([
            dispatch(appSettingsLoadCurrentSettings()).unwrap(),
            dispatch(appSettingsGetListOfModels()).unwrap(),
        ]);
    },
);
