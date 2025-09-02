import { createAsyncThunk } from '@reduxjs/toolkit';
import { settings, ui } from '../../../wailsjs/go/models';
import { ProcessAction } from '../../../wailsjs/go/ui/appUIActionApiStruct';
import {
    LoadSettings,
    ResetToDefaultSettings,
    SaveSettings,
    ValidateConnection,
} from '../../../wailsjs/go/ui/appUISettingsApiStruct';
import {
    GetCurrentModel,
    GetDefaultInputLanguage,
    GetDefaultOutputLanguage,
    GetFormattingItems,
    GetInputLanguages,
    GetModelsList,
    GetOutputLanguages,
    GetProofreadingItems,
    GetSummarizationItems,
    GetTranslatingItems,
} from '../../../wailsjs/go/ui/appUIStateApiStruct';
import { ClipboardGetText, ClipboardSetText } from '../../../wailsjs/runtime';
import { AppSettings } from '../../common/types';
import { SelectItem } from '../../widgets/base/Select';
import { TabContentBtn } from '../../widgets/tabs/common/TabButtonsWidget';
import { setCurrentTask } from './AppStateReducer';
import AppActionObjWrapper = ui.AppActionObjWrapper;
import Settings = settings.Settings;

export const fetchInputLanguages = createAsyncThunk(
    'appState/inputLanguages',
    async (_, { rejectWithValue }): Promise<SelectItem[]> => {
        try {
            const response = await GetInputLanguages();

            return response.map((item) => {
                return { itemId: item.languageId, displayText: item.languageText };
            });
        } catch (error: unknown) {
            return [];
        }
    },
);

export const fetchOutputLanguages = createAsyncThunk(
    'appState/outputLanguages',
    async (_, { rejectWithValue }): Promise<SelectItem[]> => {
        try {
            const response = await GetOutputLanguages();

            return response.map((item) => {
                return { itemId: item.languageId, displayText: item.languageText };
            });
        } catch (error: unknown) {
            return [];
        }
    },
);

export const fetchProofreadingButtons = createAsyncThunk(
    'appState/proofreadingButtons',
    async (_, { rejectWithValue }): Promise<TabContentBtn[]> => {
        try {
            const response = await GetProofreadingItems();
            return response.map((item) => {
                return { btnId: item.actionId, btnName: item.actionText };
            });
        } catch (error: unknown) {
            return [];
        }
    },
);
export const fetchFormattingButtons = createAsyncThunk(
    'appState/formattingButtons',
    async (_, { rejectWithValue }): Promise<TabContentBtn[]> => {
        try {
            const response = await GetFormattingItems();
            return response.map((item) => {
                return { btnId: item.actionId, btnName: item.actionText };
            });
        } catch (error: unknown) {
            return [];
        }
    },
);
export const fetchTranslateButtons = createAsyncThunk(
    'appState/translateButtons',
    async (_, { rejectWithValue }): Promise<TabContentBtn[]> => {
        try {
            const response = await GetTranslatingItems();
            return response.map((item) => {
                return { btnId: item.actionId, btnName: item.actionText };
            });
        } catch (error: unknown) {
            return [];
        }
    },
);
export const fetchSummaryButtons = createAsyncThunk(
    'appState/summaryButtons',
    async (_, { rejectWithValue }): Promise<TabContentBtn[]> => {
        try {
            const response = await GetSummarizationItems();
            return response.map((item) => {
                return { btnId: item.actionId, btnName: item.actionText };
            });
        } catch (error: unknown) {
            return [];
        }
    },
);

export const processOperation = createAsyncThunk(
    'appState/processOperation',
    async (actionWrapper: AppActionObjWrapper, { dispatch, rejectWithValue }) => {
        try {
            dispatch(setCurrentTask(actionWrapper.actionId));

            const response = await ProcessAction(actionWrapper);
            return response;
        } catch (error: unknown) {
            dispatch(setCurrentTask(''));
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            return rejectWithValue({ error: errorMessage, actionId: actionWrapper.actionId });
        }
    },
);

export const processCopyToClipboard = createAsyncThunk(
    'appState/processCopyToClipboard',
    async (textToCopy: string, { rejectWithValue }): Promise<void> => {
        try {
            await ClipboardSetText(textToCopy);
        } catch (error: unknown) {}
    },
);

export const processPasteFromClipboard = createAsyncThunk(
    'appState/processPasteFromClipboard',
    async (_, { rejectWithValue }): Promise<string> => {
        try {
            const value = await ClipboardGetText();
            return value;
        } catch (error: unknown) {
            return '';
        }
    },
);

export const fetchDefaultInputLanguage = createAsyncThunk(
    'appState/fetchDefaultInputLanguage',
    async (_, { rejectWithValue }): Promise<SelectItem> => {
        try {
            const response = await GetDefaultInputLanguage();

            return { itemId: response.languageId, displayText: response.languageText };
        } catch (error: unknown) {
            return { itemId: '', displayText: '' };
        }
    },
);
export const fetchDefaultOutputLanguage = createAsyncThunk(
    'appState/fetchDefaultOutputLanguage',
    async (_, { rejectWithValue }): Promise<SelectItem> => {
        try {
            const response = await GetDefaultOutputLanguage();

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
            const response = await GetModelsList();
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
            const response = await LoadSettings();
            return {
                baseUrl: response.BaseUrl,
                headers: response.Headers,
                modelName: response.ModelName,
                temperature: response.Temperature,
                defaultInputLanguage: response.DefaultInputLanguage,
                defaultOutputLanguage: response.DefaultOutputLanguage,
                languages: response.Languages,
                useMarkdownForOutput: response.UseMarkdownForOutput,
            };
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

export const fetchCurrentModel = createAsyncThunk(
    'appState/fetchCurrentModel',
    async (_, { rejectWithValue }): Promise<string> => {
        try {
            const response = await GetCurrentModel();
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
            const response = await ResetToDefaultSettings();
            return {
                baseUrl: response.BaseUrl,
                headers: response.Headers,
                modelName: response.ModelName,
                temperature: response.Temperature,
                defaultInputLanguage: response.DefaultInputLanguage,
                defaultOutputLanguage: response.DefaultOutputLanguage,
                languages: response.Languages,
                useMarkdownForOutput: response.UseMarkdownForOutput,
            };
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
            const response = await SaveSettings(
                Settings.createFrom({
                    BaseUrl: appSettings.baseUrl,
                    Headers: appSettings.headers,
                    ModelName: appSettings.modelName,
                    Temperature: appSettings.temperature,
                    DefaultInputLanguage: appSettings.defaultInputLanguage,
                    DefaultOutputLanguage: appSettings.defaultOutputLanguage,
                    Languages: appSettings.languages,
                    UseMarkdownForOutput: appSettings.useMarkdownForOutput,
                }),
            );
        } catch (error: unknown) {}
    },
);

export type ValidateUserUrlAndHeaders = { baseUrl: string; headers: Record<string, string> };
export const validateUserUrlAndHeaders = createAsyncThunk(
    'appState/validateUserUrlAndHeaders',
    async (userData: ValidateUserUrlAndHeaders, { rejectWithValue }): Promise<boolean> => {
        try {
            const response = await ValidateConnection(userData.baseUrl, userData.headers);
            return response;
        } catch (error: unknown) {
            return false;
        }
    },
);
