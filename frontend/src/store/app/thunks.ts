import { createAsyncThunk } from '@reduxjs/toolkit';
import { models } from '../../../wailsjs/go/models';
import { ActionApi, ClipboardUtils, SettingsApi, UiStateApi } from '../../common';
import { extractErrorDetails } from '../../common/error_utils';
import { AppSettings } from '../../common/types';
import { SelectItem } from '../../widgets/base/Select';
import { TabContentBtn } from '../../widgets/tabs/common/TabButtonsWidget';
import { setCurrentTask } from './AppStateReducer';
import AppActionObjWrapper = models.AppActionObjWrapper;

export const appStateInputLanguagesGet = createAsyncThunk<SelectItem[], void, { rejectValue: string }>(
    'appState/availableInputLanguages',
    async (_, { rejectWithValue }) => {
        try {
            const response = await UiStateApi.getInputLanguages();
            return response.map((item) => ({ itemId: item.languageId, displayText: item.languageText }));
        } catch (error: unknown) {
            const msg = extractErrorDetails(error);
            return rejectWithValue(msg);
        }
    },
);

export const appStateOutputLanguagesGet = createAsyncThunk(
    'appState/availableOutputLanguages',
    async (_, { rejectWithValue }): Promise<SelectItem[]> => {
        try {
            const response = await UiStateApi.getOutputLanguages();

            return response.map((item) => {
                return { itemId: item.languageId, displayText: item.languageText };
            });
        } catch (error: unknown) {
            return [];
        }
    },
);

export const appStateProofreadingButtonsGet = createAsyncThunk(
    'appState/buttonsForProofreading',
    async (_, { rejectWithValue }): Promise<TabContentBtn[]> => {
        try {
            const response = await UiStateApi.getProofreadingItems();
            return response.map((item) => {
                return { btnId: item.actionId, btnName: item.actionText };
            });
        } catch (error: unknown) {
            return [];
        }
    },
);
export const appStateFormattingButtonsGet = createAsyncThunk(
    'appState/buttonsForFormatting',
    async (_, { rejectWithValue }): Promise<TabContentBtn[]> => {
        try {
            const response = await UiStateApi.getFormattingItems();
            return response.map((item) => {
                return { btnId: item.actionId, btnName: item.actionText };
            });
        } catch (error: unknown) {
            return [];
        }
    },
);
export const appStateTranslateButtonsGet = createAsyncThunk(
    'appState/buttonsForTranslating',
    async (_, { rejectWithValue }): Promise<TabContentBtn[]> => {
        try {
            const response = await UiStateApi.getTranslatingItems();
            return response.map((item) => {
                return { btnId: item.actionId, btnName: item.actionText };
            });
        } catch (error: unknown) {
            return [];
        }
    },
);
export const appStateSummaryButtonsGet = createAsyncThunk(
    'appState/buttonsForSummarization',
    async (_, { rejectWithValue }): Promise<TabContentBtn[]> => {
        try {
            const response = await UiStateApi.getSummarizationItems();
            return response.map((item) => {
                return { btnId: item.actionId, btnName: item.actionText };
            });
        } catch (error: unknown) {
            return [];
        }
    },
);

export const appStateDefaultInputLanguageGet = createAsyncThunk(
    'appState/appStateDefaultInputLanguageGet',
    async (_, { rejectWithValue }): Promise<SelectItem> => {
        try {
            const response = await UiStateApi.getDefaultInputLanguage();

            return { itemId: response.languageId, displayText: response.languageText };
        } catch (error: unknown) {
            return { itemId: '', displayText: '' };
        }
    },
);

export const appStateDefaultOutputLanguageGet = createAsyncThunk(
    'appState/appStateDefaultOutputLanguageGet',
    async (_, { rejectWithValue }): Promise<SelectItem> => {
        try {
            const response = await UiStateApi.getDefaultOutputLanguage();

            return { itemId: response.languageId, displayText: response.languageText };
        } catch (error: unknown) {
            return { itemId: '', displayText: '' };
        }
    },
);
export const fetchLlmModels = createAsyncThunk(
    'appState/fetchLlmModels',
    async (_, { rejectWithValue }): Promise<string[]> => {
        try {
            const response = await UiStateApi.getModelsList();
            return response;
        } catch (error: unknown) {
            return [];
        }
    },
);
export const fetchCurrentSettings = createAsyncThunk(
    'appState/fetchCurrentSettings',
    async (_, { rejectWithValue }): Promise<AppSettings> => {
        try {
            const response = await SettingsApi.loadSettings();
            return response;
        } catch (error: unknown) {
            return {
                baseUrl: '',
                headers: {},
                modelName: '',
                temperature: 0.5,
                defaultInputLanguage: '',
                defaultOutputLanguage: '',
                languages: [],
                useMarkdownForOutput: false,
            };
        }
    },
);

export const processCopyToClipboard = createAsyncThunk(
    'appState/processCopyToClipboard',
    async (textToCopy: string, { rejectWithValue }): Promise<void> => {
        try {
            await ClipboardUtils.clipboardSetText(textToCopy);
        } catch (error: unknown) {}
    },
);

export const processPasteFromClipboard = createAsyncThunk(
    'appState/processPasteFromClipboard',
    async (_, { rejectWithValue }): Promise<string> => {
        try {
            const value = await ClipboardUtils.clipboardGetText();
            return value;
        } catch (error: unknown) {
            return '';
        }
    },
);

export const actionProcessAction = createAsyncThunk(
    'action/actionProcessAction',
    async (actionWrapper: AppActionObjWrapper, { dispatch, rejectWithValue }) => {
        try {
            dispatch(setCurrentTask(actionWrapper.actionId));
            const response = await ActionApi.processAction(actionWrapper);
            return response;
        } catch (error: unknown) {
            dispatch(setCurrentTask(''));
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return rejectWithValue({ error: errorMessage, actionId: actionWrapper.actionId });
        }
    },
);

export const fetchCurrentModel = createAsyncThunk(
    'appState/fetchCurrentModel',
    async (_, { rejectWithValue }): Promise<string> => {
        try {
            const response = await UiStateApi.getCurrentModel();
            return response;
        } catch (error: unknown) {
            return '';
        }
    },
);
export const resetCurrentSettingsToDefault = createAsyncThunk(
    'appState/resetCurrentSettingsToDefault',
    async (_, { rejectWithValue }): Promise<AppSettings> => {
        try {
            const response = await SettingsApi.resetToDefaultSettings();
            return response;
        } catch (error: unknown) {
            return {
                baseUrl: '',
                headers: {},
                modelName: '',
                temperature: 0.5,
                defaultInputLanguage: '',
                defaultOutputLanguage: '',
                languages: [],
                useMarkdownForOutput: false,
            };
        }
    },
);

export const saveCurrentSettings = createAsyncThunk(
    'appState/saveCurrentSettings',
    async (appSettings: AppSettings, { rejectWithValue }): Promise<void> => {
        try {
            const response = await SettingsApi.saveSettings(appSettings);
        } catch (error: unknown) {}
    },
);

export type ValidateUserUrlAndHeaders = { baseUrl: string; headers: Record<string, string> };
export const validateUserUrlAndHeaders = createAsyncThunk(
    'appState/validateUserUrlAndHeaders',
    async (userData: ValidateUserUrlAndHeaders, { rejectWithValue }): Promise<boolean> => {
        try {
            const response = await SettingsApi.validateConnection(userData.baseUrl, userData.headers);
            return response;
        } catch (error: unknown) {
            return false;
        }
    },
);
