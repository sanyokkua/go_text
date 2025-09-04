import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import { AppSettings, KeyValuePair, UnknownError } from '../../common/types';
import { SelectItem } from '../../widgets/base/Select';
import {
    appSettingsGetListOfModels,
    appSettingsLoadCurrentSettings,
    appSettingsResetToDefaultSettings,
    appSettingsSaveSettings,
    appSettingsValidateUrlAndHeaders,
    initializeSettingsState,
} from './settings_thunks';

const mapStringToSelectItem = (value: string): SelectItem => {
    return { itemId: value, displayText: value };
};

const mapStringListToSelectItems = (list: string[]): SelectItem[] => {
    return list.map(mapStringToSelectItem);
};

export const mapRecordToKeyValuePair = (headers: Record<string, string>): KeyValuePair[] => {
    const keyValuePairs: KeyValuePair[] = [];
    Object.keys(headers).forEach((key: string) => {
        const value = headers[key];
        const id = uuidv4();
        keyValuePairs.push({ id: id, key: key, value: value });
    });
    return keyValuePairs;
};
export const mapKeyValuePairToRecord = (keyValuePairs: KeyValuePair[]): Record<string, string> => {
    const record: Record<string, string> = {};
    keyValuePairs.forEach((item) => {
        record[item.key] = item.value;
    });
    return record;
};

const setStateFields = (state: AppSettingsState, action: PayloadAction<AppSettings>) => {
    state.baseUrl = action.payload.baseUrl;
    state.headers = action.payload.headers;
    state.modelName = action.payload.modelName;
    state.temperature = action.payload.temperature;
    state.defaultInputLanguage = action.payload.defaultInputLanguage;
    state.defaultOutputLanguage = action.payload.defaultOutputLanguage;
    state.languages = action.payload.languages;
    state.useMarkdownForOutput = action.payload.useMarkdownForOutput;
    state.displayListOfLanguages = mapStringListToSelectItems(action.payload.languages);

    state.displaySelectedInputLanguage = mapStringToSelectItem(state.defaultInputLanguage);
    state.displaySelectedOutputLanguage = mapStringToSelectItem(state.defaultOutputLanguage);
    state.displaySelectedModel = mapStringToSelectItem(state.modelName);
    state.displayHeaders = mapRecordToKeyValuePair(action.payload.headers);
};
export interface AppSettingsState {
    displayListOfLanguages: SelectItem[];
    displaySelectedInputLanguage: SelectItem;
    displaySelectedOutputLanguage: SelectItem;
    displayListOfModels: SelectItem[];
    displaySelectedModel: SelectItem;
    displayHeaders: KeyValuePair[];

    baseUrl: string;
    headers: Record<string, string>;
    modelName: string;
    temperature: number;
    defaultInputLanguage: string;
    defaultOutputLanguage: string;
    languages: string[];
    useMarkdownForOutput: boolean;
    models: string[];
    errorMsg: string;
    isLoadingSettings: boolean;
    isSettingsValid: boolean;
    isChanged: boolean;
}

const emptySelectItems: SelectItem = mapStringToSelectItem('');

const initialState: AppSettingsState = {
    displayListOfLanguages: [],
    displaySelectedInputLanguage: emptySelectItems,
    displaySelectedOutputLanguage: emptySelectItems,
    displayListOfModels: [],
    displaySelectedModel: emptySelectItems,
    displayHeaders: [],
    baseUrl: '',
    headers: {},
    modelName: '',
    temperature: 0.5,
    defaultInputLanguage: '',
    defaultOutputLanguage: '',
    languages: [],
    useMarkdownForOutput: false,

    models: [],
    errorMsg: '',
    isLoadingSettings: false,
    isSettingsValid: false,
    isChanged: false,
};

export const appSettingsSlice = createSlice({
    name: 'appSettings',
    initialState,
    reducers: {
        setDisplaySelectedInputLanguage(state, action: PayloadAction<SelectItem>) {
            state.displaySelectedInputLanguage = action.payload;
            state.defaultInputLanguage = action.payload.itemId;
            state.isChanged = true;
        },
        setDisplaySelectedOutputLanguage(state, action: PayloadAction<SelectItem>) {
            state.displaySelectedOutputLanguage = action.payload;
            state.defaultOutputLanguage = action.payload.itemId;
            state.isChanged = true;
        },
        setDisplaySelectedModel(state, action: PayloadAction<SelectItem>) {
            state.displaySelectedModel = action.payload;
            state.modelName = action.payload.itemId;
            state.isChanged = true;
        },
        addDisplayHeader(state, action: PayloadAction<void>) {
            if (state.displayHeaders.some((item) => item.key.trim().length === 0 && item.value.trim().length === 0)) {
                return;
            }
            if (state.displayHeaders.some((item) => item.key.trim() === '')) {
                return;
            }

            const newHeaders = [...state.displayHeaders];
            newHeaders.push({ id: uuidv4(), key: '', value: '' });

            state.displayHeaders = newHeaders;
            state.headers = mapKeyValuePairToRecord(newHeaders);
            state.isChanged = true;
        },
        updateHeader(state, action: PayloadAction<KeyValuePair>) {
            const newHeaders = [...state.displayHeaders];
            const filtered = newHeaders.filter((item) => item.id !== action.payload.id);
            filtered.push(action.payload);

            state.displayHeaders = filtered;
            state.headers = mapKeyValuePairToRecord(filtered);
            state.isChanged = true;
        },
        removeDisplayHeader(state, action: PayloadAction<string>) {
            const newHeaders = [...state.displayHeaders];
            const filtered = newHeaders.filter((item) => item.id !== action.payload);
            state.displayHeaders = filtered;
            state.headers = mapKeyValuePairToRecord(filtered);
            state.isChanged = true;
        },
        setBaseUrl: (state: AppSettingsState, action: PayloadAction<string>) => {
            const baseUrl = action.payload;
            state.baseUrl = baseUrl;
            state.isChanged = true;
            if (!baseUrl || baseUrl.trim().length === 0) {
                state.isSettingsValid = false;
                state.errorMsg = 'Base Url cannot be empty.';
            } else if (!(baseUrl.startsWith('http://') || baseUrl.startsWith('https://'))) {
                state.isSettingsValid = false;
                state.errorMsg = 'Base Url should start with http:// or https://';
            } else if (baseUrl.endsWith('/')) {
                state.isSettingsValid = false;
                state.errorMsg = 'Base Url should not end with /';
            } else {
                state.isSettingsValid = true;
                state.errorMsg = '';
            }
        },
        setTemperature: (state: AppSettingsState, action: PayloadAction<number>) => {
            state.temperature = action.payload;
            state.isChanged = true;
        },
        setUseMarkdownForOutput: (state: AppSettingsState, action: PayloadAction<boolean>) => {
            state.useMarkdownForOutput = action.payload;
            state.isChanged = true;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(appSettingsLoadCurrentSettings.pending, (state: AppSettingsState) => {
                state.isLoadingSettings = true;
                state.errorMsg = '';
            })
            .addCase(
                appSettingsLoadCurrentSettings.fulfilled,
                (state: AppSettingsState, action: PayloadAction<AppSettings>) => {
                    state.isLoadingSettings = false;
                    setStateFields(state, action);
                    state.isChanged = false;
                },
            )
            .addCase(appSettingsLoadCurrentSettings.rejected, (state: AppSettingsState, action) => {
                state.isLoadingSettings = false;
                state.errorMsg = action.payload || UnknownError;
            })
            .addCase(appSettingsResetToDefaultSettings.pending, (state: AppSettingsState) => {
                state.isLoadingSettings = true;
                state.errorMsg = '';
            })
            .addCase(
                appSettingsResetToDefaultSettings.fulfilled,
                (state: AppSettingsState, action: PayloadAction<AppSettings>) => {
                    state.isLoadingSettings = false;
                    setStateFields(state, action);
                    state.isChanged = false;
                },
            )
            .addCase(appSettingsResetToDefaultSettings.rejected, (state: AppSettingsState, action) => {
                state.isLoadingSettings = false;
                state.errorMsg = action.payload || UnknownError;
            })
            .addCase(appSettingsSaveSettings.pending, (state: AppSettingsState) => {
                state.isLoadingSettings = true;
                state.errorMsg = '';
            })
            .addCase(appSettingsSaveSettings.fulfilled, (state: AppSettingsState, action: PayloadAction<void>) => {
                state.isLoadingSettings = false;
                state.isChanged = false;
            })
            .addCase(appSettingsSaveSettings.rejected, (state: AppSettingsState, action) => {
                state.isLoadingSettings = false;
                state.errorMsg = action.payload || UnknownError;
            })
            .addCase(appSettingsValidateUrlAndHeaders.pending, (state: AppSettingsState) => {
                state.isLoadingSettings = true;
                state.errorMsg = '';
            })
            .addCase(
                appSettingsValidateUrlAndHeaders.fulfilled,
                (state: AppSettingsState, action: PayloadAction<boolean>) => {
                    state.isLoadingSettings = false;
                    state.isSettingsValid = action.payload;
                    if (!action.payload) {
                        state.errorMsg = 'Connection Failed';
                    }
                },
            )
            .addCase(appSettingsValidateUrlAndHeaders.rejected, (state: AppSettingsState, action) => {
                state.isLoadingSettings = false;
                state.errorMsg = action.payload || UnknownError;
                state.isSettingsValid = false;
            })
            .addCase(appSettingsGetListOfModels.pending, (state: AppSettingsState) => {
                state.isLoadingSettings = true;
                state.errorMsg = '';
            })
            .addCase(
                appSettingsGetListOfModels.fulfilled,
                (state: AppSettingsState, action: PayloadAction<string[]>) => {
                    state.isLoadingSettings = false;
                    const loadedModelsList = action.payload;
                    loadedModelsList.push(''); //Add the ability to see not selected model

                    state.models = loadedModelsList;
                    state.displayListOfModels = mapStringListToSelectItems(loadedModelsList);
                    const currentModelInAvailableModelsList = loadedModelsList.some(
                        (item) => item.trim() === state.modelName.trim(),
                    );
                    if (!currentModelInAvailableModelsList && loadedModelsList.length > 0) {
                        const modelNameFromPayload = loadedModelsList[0];
                        const newModel = mapStringToSelectItem(modelNameFromPayload);
                        state.modelName = modelNameFromPayload;
                        state.displaySelectedModel = newModel;
                    }
                },
            )
            .addCase(appSettingsGetListOfModels.rejected, (state: AppSettingsState, action) => {
                state.isLoadingSettings = false;
                state.errorMsg = action.payload || UnknownError;
                state.models = [];
                state.displayListOfModels = [];
            })
            .addCase(initializeSettingsState.pending, (state: AppSettingsState) => {
                state.isLoadingSettings = true;
            })
            .addCase(initializeSettingsState.fulfilled, (state: AppSettingsState, action: PayloadAction<void>) => {
                state.isLoadingSettings = false;
            })
            .addCase(initializeSettingsState.rejected, (state: AppSettingsState, action) => {
                state.isLoadingSettings = false;
            });
    },
});

export const {
    setDisplaySelectedInputLanguage,
    setDisplaySelectedOutputLanguage,
    setDisplaySelectedModel,
    setBaseUrl,
    setTemperature,
    setUseMarkdownForOutput,
    addDisplayHeader,
    updateHeader,
    removeDisplayHeader,
} = appSettingsSlice.actions;

export default appSettingsSlice.reducer;
