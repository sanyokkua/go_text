import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppSettings } from '../../common/types';
import {
    fetchCurrentSettings,
    fetchLlmModels,
    resetCurrentSettingsToDefault,
    saveCurrentSettings,
    validateUserUrlAndHeaders,
} from './thunks';

export interface AppSettingsState {
    baseUrl: string;
    headers: Record<string, string>;
    modelName: string;
    temperature: number;
    defaultInputLanguage: string;
    defaultOutputLanguage: string;
    languages: string[];
    useMarkdownForOutput: boolean;

    models: string[];
    tmpBaseUrl: string;
    tmpHeaders: Record<string, string>;
}

const initialState: AppSettingsState = {
    baseUrl: '',
    headers: {},
    modelName: '',
    temperature: 0.5,
    defaultInputLanguage: '',
    defaultOutputLanguage: '',
    languages: [],
    useMarkdownForOutput: false,
    models: [],
    tmpBaseUrl: '',
    tmpHeaders: {},
};

export const appSettingsSlice = createSlice({
    name: 'appSettings',
    initialState,
    reducers: {
        setBaseUrl: (state: AppSettingsState, action: PayloadAction<string>) => {
            state.baseUrl = action.payload;
        },
        setHeaders: (state: AppSettingsState, action: PayloadAction<Record<string, string>>) => {
            state.headers = action.payload;
        },
        setModelName: (state: AppSettingsState, action: PayloadAction<string>) => {
            state.modelName = action.payload;
        },
        setTemperature: (state: AppSettingsState, action: PayloadAction<number>) => {
            state.temperature = action.payload;
        },
        setDefaultInputLanguage: (state: AppSettingsState, action: PayloadAction<string>) => {
            state.defaultInputLanguage = action.payload;
        },
        setDefaultOutputLanguage: (state: AppSettingsState, action: PayloadAction<string>) => {
            state.defaultOutputLanguage = action.payload;
        },
        setLanguages: (state: AppSettingsState, action: PayloadAction<string[]>) => {
            state.languages = action.payload;
        },
        setUseMarkdownForOutput: (state: AppSettingsState, action: PayloadAction<boolean>) => {
            state.useMarkdownForOutput = action.payload;
        },
        setTmpBaseUrl: (state: AppSettingsState, action: PayloadAction<string>) => {
            state.tmpBaseUrl = action.payload;
        },
        setTmpHeaders: (state: AppSettingsState, action: PayloadAction<Record<string, string>>) => {
            state.tmpHeaders = action.payload;
        },
        setSettings: (state: AppSettingsState, action: PayloadAction<AppSettings>) => {
            state.baseUrl = action.payload.baseUrl;
            state.headers = action.payload.headers;
            state.modelName = action.payload.modelName;
            state.temperature = action.payload.temperature;
            state.defaultInputLanguage = action.payload.defaultInputLanguage;
            state.defaultOutputLanguage = action.payload.defaultOutputLanguage;
            state.languages = action.payload.languages;
            state.useMarkdownForOutput = action.payload.useMarkdownForOutput;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchCurrentSettings.pending, (state: AppSettingsState) => {
                // NOTHING
            })
            .addCase(fetchCurrentSettings.fulfilled, (state: AppSettingsState, action: PayloadAction<AppSettings>) => {
                state.baseUrl = action.payload.baseUrl;
                state.headers = action.payload.headers;
                state.modelName = action.payload.modelName;
                state.temperature = action.payload.temperature;
                state.defaultInputLanguage = action.payload.defaultInputLanguage;
                state.defaultOutputLanguage = action.payload.defaultOutputLanguage;
                state.languages = action.payload.languages;
                state.useMarkdownForOutput = action.payload.useMarkdownForOutput;
            })
            .addCase(fetchCurrentSettings.rejected, (state: AppSettingsState, action) => {
                // NOTHING
            })

            .addCase(resetCurrentSettingsToDefault.pending, (state: AppSettingsState) => {
                // NOTHING
            })
            .addCase(
                resetCurrentSettingsToDefault.fulfilled,
                (state: AppSettingsState, action: PayloadAction<AppSettings>) => {
                    state.baseUrl = action.payload.baseUrl;
                    state.headers = action.payload.headers;
                    state.modelName = action.payload.modelName;
                    state.temperature = action.payload.temperature;
                    state.defaultInputLanguage = action.payload.defaultInputLanguage;
                    state.defaultOutputLanguage = action.payload.defaultOutputLanguage;
                    state.languages = action.payload.languages;
                    state.useMarkdownForOutput = action.payload.useMarkdownForOutput;
                },
            )
            .addCase(resetCurrentSettingsToDefault.rejected, (state: AppSettingsState, action) => {
                // NOTHING
            })

            .addCase(saveCurrentSettings.fulfilled, (state: AppSettingsState, action) => {
                // NOTHING
            })
            .addCase(validateUserUrlAndHeaders.fulfilled, (state: AppSettingsState, action) => {
                // NOTHING
            })

            .addCase(fetchLlmModels.pending, (state: AppSettingsState) => {
                // NOTHING
            })
            .addCase(fetchLlmModels.fulfilled, (state: AppSettingsState, action: PayloadAction<string[]>) => {
                state.models = action.payload;
            })
            .addCase(fetchLlmModels.rejected, (state: AppSettingsState, action) => {
                state.models = [];
            });
    },
});

export const {
    setBaseUrl,
    setHeaders,
    setModelName,
    setTemperature,
    setDefaultInputLanguage,
    setDefaultOutputLanguage,
    setLanguages,
    setUseMarkdownForOutput,
    setTmpBaseUrl,
    setTmpHeaders,
    setSettings,
} = appSettingsSlice.actions;

// Export the settings slice reducer
export default appSettingsSlice.reducer;
