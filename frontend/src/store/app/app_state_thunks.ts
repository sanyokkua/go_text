import { createAsyncThunk } from '@reduxjs/toolkit';
import { LogDebug, LogWarning } from '../../../wailsjs/runtime';
import { ActionApi, ClipboardUtils, SettingsApi, UiStateApi } from '../../common';
import { extractErrorDetails } from '../../common/error_utils';
import { AppActionObj, AppSettings } from '../../common/types';
import { SelectItem } from '../../widgets/base/Select';
import { TabContentBtn } from '../../widgets/tabs/common/TabButtonsWidget';
import { AppDispatch } from '../store';
import { setCurrentTask } from './AppStateReducer';

export const appStateProofreadingButtonsGet = createAsyncThunk<TabContentBtn[], void, { rejectValue: string }>(
    'appState/appStateProofreadingButtonsGet',
    async (_, { rejectWithValue }) => {
        try {
            LogDebug('appStateProofreadingButtonsGet is triggered');
            const response = await UiStateApi.getProofreadingItems();
            return response.map((item) => {
                return { btnId: item.actionId, btnName: item.actionText };
            });
        } catch (error: unknown) {
            const msg = extractErrorDetails(error);
            LogWarning('Failed appStateProofreadingButtonsGet with error: ' + msg);
            return rejectWithValue(msg);
        }
    },
);
export const appStateFormattingButtonsGet = createAsyncThunk<TabContentBtn[], void, { rejectValue: string }>(
    'appState/appStateFormattingButtonsGet',
    async (_, { rejectWithValue }) => {
        try {
            LogDebug('appStateFormattingButtonsGet is triggered');
            const response = await UiStateApi.getFormattingItems();
            return response.map((item) => {
                return { btnId: item.actionId, btnName: item.actionText };
            });
        } catch (error: unknown) {
            const msg = extractErrorDetails(error);
            LogWarning('Failed appStateFormattingButtonsGet with error: ' + msg);
            return rejectWithValue(msg);
        }
    },
);
export const appStateTranslateButtonsGet = createAsyncThunk<TabContentBtn[], void, { rejectValue: string }>(
    'appState/appStateTranslateButtonsGet',
    async (_, { rejectWithValue }) => {
        try {
            LogDebug('appStateTranslateButtonsGet is triggered');
            const response = await UiStateApi.getTranslatingItems();
            return response.map((item) => {
                return { btnId: item.actionId, btnName: item.actionText };
            });
        } catch (error: unknown) {
            const msg = extractErrorDetails(error);
            LogWarning('Failed appStateTranslateButtonsGet with error: ' + msg);
            return rejectWithValue(msg);
        }
    },
);
export const appStateSummaryButtonsGet = createAsyncThunk<TabContentBtn[], void, { rejectValue: string }>(
    'appState/appStateSummaryButtonsGet',
    async (_, { rejectWithValue }) => {
        try {
            LogDebug('appStateSummaryButtonsGet is triggered');
            const response = await UiStateApi.getSummarizationItems();
            return response.map((item) => {
                return { btnId: item.actionId, btnName: item.actionText };
            });
        } catch (error: unknown) {
            const msg = extractErrorDetails(error);
            LogWarning('Failed appStateSummaryButtonsGet with error: ' + msg);
            return rejectWithValue(msg);
        }
    },
);
export const appStateTransformingButtonsGet = createAsyncThunk<TabContentBtn[], void, { rejectValue: string }>(
    'appState/appStateTransformingButtonsGet',
    async (_, { rejectWithValue }) => {
        try {
            LogDebug('appStateTransformingButtonsGet is triggered');
            const response = await UiStateApi.getTransformingItems();
            return response.map((item) => {
                return { btnId: item.actionId, btnName: item.actionText };
            });
        } catch (error: unknown) {
            const msg = extractErrorDetails(error);
            LogWarning('Failed appStateTransformingButtonsGet with error: ' + msg);
            return rejectWithValue(msg);
        }
    },
);
export const appStateInputLanguagesGet = createAsyncThunk<SelectItem[], void, { rejectValue: string }>(
    'appState/appStateInputLanguagesGet',
    async (_, { rejectWithValue }) => {
        try {
            LogDebug('appStateInputLanguagesGet is triggered');
            const response = await UiStateApi.getInputLanguages();
            return response.map((item) => ({ itemId: item.languageId, displayText: item.languageText }));
        } catch (error: unknown) {
            const msg = extractErrorDetails(error);
            LogWarning('Failed appStateInputLanguagesGet with error: ' + msg);
            return rejectWithValue(msg);
        }
    },
);
export const appStateOutputLanguagesGet = createAsyncThunk<SelectItem[], void, { rejectValue: string }>(
    'appState/appStateOutputLanguagesGet',
    async (_, { rejectWithValue }) => {
        try {
            LogDebug('appStateOutputLanguagesGet is triggered');
            const response = await UiStateApi.getOutputLanguages();
            return response.map((item) => ({ itemId: item.languageId, displayText: item.languageText }));
        } catch (error: unknown) {
            const msg = extractErrorDetails(error);
            LogWarning('Failed appStateOutputLanguagesGet with error: ' + msg);
            return rejectWithValue(msg);
        }
    },
);
export const appStateDefaultInputLanguageGet = createAsyncThunk<SelectItem, void, { rejectValue: string }>(
    'appState/appStateDefaultInputLanguageGet',
    async (_, { rejectWithValue }) => {
        try {
            LogDebug('appStateDefaultInputLanguageGet is triggered');
            const response = await UiStateApi.getDefaultInputLanguage();
            return { itemId: response.languageId, displayText: response.languageText };
        } catch (error: unknown) {
            const msg = extractErrorDetails(error);
            LogWarning('Failed appStateDefaultInputLanguageGet with error: ' + msg);
            return rejectWithValue(msg);
        }
    },
);
export const appStateDefaultOutputLanguageGet = createAsyncThunk<SelectItem, void, { rejectValue: string }>(
    'appState/appStateDefaultOutputLanguageGet',
    async (_, { rejectWithValue }) => {
        try {
            LogDebug('appStateDefaultOutputLanguageGet is triggered');
            const response = await UiStateApi.getDefaultOutputLanguage();
            return { itemId: response.languageId, displayText: response.languageText };
        } catch (error: unknown) {
            const msg = extractErrorDetails(error);
            LogWarning('Failed appStateDefaultOutputLanguageGet with error: ' + msg);
            return rejectWithValue(msg);
        }
    },
);
export const appStateCurrentProviderAndModelGet = createAsyncThunk<AppSettings, void, { rejectValue: string }>(
    'appState/appStateCurrentProviderAndModelGet',
    async (_, { rejectWithValue }) => {
        try {
            LogDebug('appStateCurrentProviderAndModelGet is triggered');
            return await SettingsApi.loadSettings();
        } catch (error: unknown) {
            const msg = extractErrorDetails(error);
            LogWarning('Failed appStateCurrentProviderAndModelGet with error: ' + msg);
            return rejectWithValue(msg);
        }
    },
);

export const initializeAppState = createAsyncThunk('appState/initialize', async (_, { dispatch }) => {
    await Promise.all([
        dispatch(appStateProofreadingButtonsGet()).unwrap(),
        dispatch(appStateFormattingButtonsGet()).unwrap(),
        dispatch(appStateTranslateButtonsGet()).unwrap(),
        dispatch(appStateSummaryButtonsGet()).unwrap(),
        dispatch(appStateTransformingButtonsGet()).unwrap(),
        dispatch(appStateInputLanguagesGet()).unwrap(),
        dispatch(appStateOutputLanguagesGet()).unwrap(),
        dispatch(appStateDefaultInputLanguageGet()).unwrap(),
        dispatch(appStateDefaultOutputLanguageGet()).unwrap(),
        dispatch(appStateCurrentProviderAndModelGet()).unwrap(),
    ]);
});

export const appStateProcessCopyToClipboard = createAsyncThunk<void, string, { rejectValue: string }>(
    'appState/appStateProcessCopyToClipboard',
    async (textToCopy: string, { rejectWithValue }) => {
        try {
            LogDebug('appStateProcessCopyToClipboard is triggered');
            await ClipboardUtils.clipboardSetText(textToCopy);
        } catch (error: unknown) {
            const msg = extractErrorDetails(error);
            LogWarning('Failed appStateProcessCopyToClipboard with error: ' + msg);
            return rejectWithValue(msg);
        }
    },
);
export const appStateProcessPasteFromClipboard = createAsyncThunk<string, void, { rejectValue: string }>(
    'appState/appStateProcessPasteFromClipboard',
    async (_, { rejectWithValue }) => {
        try {
            LogDebug('appStateProcessPasteFromClipboard is triggered');
            return await ClipboardUtils.clipboardGetText();
        } catch (error: unknown) {
            const msg = extractErrorDetails(error);
            LogWarning('Failed appStateProcessPasteFromClipboard with error: ' + msg);
            return rejectWithValue(msg);
        }
    },
);
export const appStateActionProcess = createAsyncThunk<string, AppActionObj, { dispatch: AppDispatch; rejectValue: string }>(
    'appState/appStateActionProcess',
    async (actionWrapper, { dispatch, rejectWithValue }) => {
        try {
            LogDebug('appStateActionProcess is triggered');
            dispatch(setCurrentTask(actionWrapper.actionId));
            LogDebug(`appStateActionProcess is set actionId: ${actionWrapper.actionId} to currentTask`);
            return await ActionApi.processAction(actionWrapper);
        } catch (error: unknown) {
            const msg = extractErrorDetails(error);
            LogWarning('Failed appStateActionProcess with error: ' + msg);
            return rejectWithValue(msg);
        }
    },
);
