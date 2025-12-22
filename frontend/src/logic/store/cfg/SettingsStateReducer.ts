import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { KeyValuePair, UnknownError } from '../../common/types';
import {
    FrontLanguageConfig,
    FrontModelConfig,
    FrontProviderConfig,
    FrontSettings,
    keyValuePairsToRecord,
    stringsToSelectItems,
    stringToSelectItem,
} from '../../service';
import { generateUniqueId } from '../../service/util/helpers';
import { SelectItem } from '../../../ui/widgets/base/Select';
import {
    settingsCreateNewProvider,
    settingsDeleteProvider,
    settingsGetCurrentSettings,
    settingsGetDefaultSettings,
    settingsGetModelsList,
    settingsGetProviderTypes,
    settingsGetSettingsFilePath,
    settingsSaveSettings,
    settingsSelectProvider,
    settingsUpdateProvider,
    settingsValidateProvider,
} from './settings_thunks';

const emptyHeaderPredicate = (item: KeyValuePair) => item.key.trim().length === 0 && item.value.trim().length === 0;
const emptyKeyPredicate = (item: KeyValuePair) => item.key.trim() === '';

const emptySelectItem: SelectItem = stringToSelectItem('');

/**
 * Maps string to SelectItem
 */
const mapStringToSelectItem = (value: string): SelectItem => {
    return { itemId: value, displayText: value };
};

/**
 * Maps an array of strings to SelectItems
 */
const mapStringListToSelectItems = (list: string[]): SelectItem[] => {
    return list.map(mapStringToSelectItem);
};

/**
 * Maps record to KeyValuePair array
 */
const mapRecordToKeyValuePair = (headers: Record<string, string> | undefined | null): KeyValuePair[] => {
    const keyValuePairs: KeyValuePair[] = [];

    // Handle null or undefined headers
    if (!headers) {
        return keyValuePairs;
    }

    Object.keys(headers).forEach((key: string) => {
        const value = headers[key];
        const id = generateUniqueId();
        keyValuePairs.push({ id: id, key: key, value: value });
    });
    return keyValuePairs.sort((a, b) => a.id.localeCompare(b.id));
};

/**
 * Sets all state fields from FrontSettings
 */
const setStateFields = (state: SettingsState, settings: FrontSettings) => {
    // Set the readonly and editable settings
    state.loadedSettingsReadonly = JSON.parse(JSON.stringify(settings));
    state.loadedSettingsEditable = JSON.parse(JSON.stringify(settings));

    // Map provider configurations with null checks
    state.providerList = mapStringListToSelectItems(settings.availableProviderConfigs?.map((p) => p.providerName) || []);
    state.providerSelected = mapStringToSelectItem(settings.currentProviderConfig?.providerName || '');

    // Map provider types (this will be set when provider types are loaded)
    // state.providersTypes and state.providerType will be set separately

    // Map provider headers with null check
    state.providerHeaders = mapRecordToKeyValuePair(settings.currentProviderConfig?.headers);

    // Map model configuration with null checks
    state.llmModelSelected = mapStringToSelectItem(settings.modelConfig?.modelName || '');

    // Map language configuration with null checks
    state.languageList = mapStringListToSelectItems(settings.languageConfig?.languages || []);
    state.languageInputSelected = mapStringToSelectItem(settings.languageConfig?.defaultInputLanguage || '');
    state.languageOutputSelected = mapStringToSelectItem(settings.languageConfig?.defaultOutputLanguage || '');

    // Clear validation messages
    state.providerValidationSuccessMsg = '';
    state.providerValidationErrorMsg = '';
    state.settingsGlobalErrorMsg = '';
};

/**
 * Resets validation messages
 */
const resetValidationMessages = (state: SettingsState) => {
    state.providerValidationSuccessMsg = '';
    state.providerValidationErrorMsg = '';
    state.settingsGlobalErrorMsg = '';
};

export const defaultProviderConfig: FrontProviderConfig = {
    providerName: '',
    providerType: 'custom',
    baseUrl: 'http://localhost:8080',
    modelsEndpoint: 'v1/models',
    completionEndpoint: 'v1/completions',
    headers: {},
};

const defaultModelConfig: FrontModelConfig = { modelName: '', isTemperatureEnabled: true, temperature: 0.5 };

const defaultLanguageConfig: FrontLanguageConfig = { languages: [], defaultInputLanguage: '', defaultOutputLanguage: '' };

const defaultSettings: FrontSettings = {
    availableProviderConfigs: [],
    currentProviderConfig: defaultProviderConfig,
    modelConfig: defaultModelConfig,
    languageConfig: defaultLanguageConfig,
    useMarkdownForOutput: false,
};

export interface SettingsState {
    loadedSettingsReadonly: FrontSettings;
    loadedSettingsEditable: FrontSettings;

    providerList: SelectItem[];
    providerSelected: SelectItem;
    providersTypes: SelectItem[];
    providerType: SelectItem;
    providerHeaders: KeyValuePair[];
    providerTestModel: string;

    llmModelList: SelectItem[];
    llmModelSelected: SelectItem;

    languageList: SelectItem[];
    languageInputSelected: SelectItem;
    languageOutputSelected: SelectItem;

    // Settings file path (read-only, set once when settings are loaded)
    settingsFilePath: string;

    // UI Only
    providerValidationSuccessMsg: string;
    providerValidationErrorMsg: string;
    settingsGlobalErrorMsg: string;
    isLoadingSettings: boolean;
}

const initSettingsState: SettingsState = {
    loadedSettingsReadonly: defaultSettings,
    loadedSettingsEditable: defaultSettings,
    providerList: [],
    providerSelected: emptySelectItem,
    providersTypes: [],
    providerType: emptySelectItem,
    providerHeaders: [],
    providerTestModel: '',
    llmModelList: [],
    llmModelSelected: emptySelectItem,
    languageList: [],
    languageInputSelected: emptySelectItem,
    languageOutputSelected: emptySelectItem,
    settingsFilePath: '',
    providerValidationSuccessMsg: '',
    providerValidationErrorMsg: '',
    settingsGlobalErrorMsg: '',
    isLoadingSettings: false,
};

export const settingsSlice = createSlice({
    name: 'settingsState',
    initialState: initSettingsState,
    reducers: {
        setProviderSelected(state, action: PayloadAction<SelectItem>) {
            state.providerSelected = action.payload;
        },
        setCurrentProviderConfig(state, action: PayloadAction<FrontProviderConfig>) {
            // Update the current provider in editable settings only (no backend call)
            state.loadedSettingsEditable.currentProviderConfig = action.payload;
            state.providerSelected = mapStringToSelectItem(action.payload.providerName);
            state.providerHeaders = mapRecordToKeyValuePair(action.payload.headers);
        },
        addNewEmptyProviderHeader(state) {
            if (state.providerHeaders.some(emptyHeaderPredicate)) {
                return;
            }
            if (state.providerHeaders.some(emptyKeyPredicate)) {
                return;
            }

            const newHeaders = [...state.providerHeaders];
            newHeaders.push({ id: generateUniqueId(), key: '', value: '' });
            state.providerHeaders = newHeaders.sort((a, b) => a.id.localeCompare(b.id));
            state.loadedSettingsEditable.currentProviderConfig.headers = keyValuePairsToRecord(newHeaders);
        },
        updateProviderHeader(state, action: PayloadAction<KeyValuePair>) {
            const newHeaders = [...state.providerHeaders];
            const filtered = newHeaders.filter((item) => item.id !== action.payload.id);
            filtered.push(action.payload);

            state.providerHeaders = filtered.sort((a, b) => a.id.localeCompare(b.id));
            state.loadedSettingsEditable.currentProviderConfig.headers = keyValuePairsToRecord(newHeaders);
        },
        removeProviderHeader(state, action: PayloadAction<string>) {
            const newHeaders = [...state.providerHeaders];
            const filtered = newHeaders.filter((item) => item.id !== action.payload);

            state.providerHeaders = filtered.sort((a, b) => a.id.localeCompare(b.id));
            state.loadedSettingsEditable.currentProviderConfig.headers = keyValuePairsToRecord(newHeaders);
        },
        setProviderTestModel(state, action: PayloadAction<string>) {
            state.providerTestModel = action.payload;
        },
        setEditableModelName(state, action: PayloadAction<string>) {
            state.loadedSettingsEditable.modelConfig.modelName = action.payload;
            state.llmModelSelected = stringToSelectItem(action.payload);
        },
        setEditableTemperatureEnabled(state, action: PayloadAction<boolean>) {
            state.loadedSettingsEditable.modelConfig.isTemperatureEnabled = action.payload;
        },
        setEditableTemperature(state, action: PayloadAction<number>) {
            state.loadedSettingsEditable.modelConfig.temperature = action.payload;
        },
        setEditableInputLanguage(state, action: PayloadAction<string>) {
            state.loadedSettingsEditable.languageConfig.defaultInputLanguage = action.payload;
        },
        setEditableOutputLanguage(state, action: PayloadAction<string>) {
            state.loadedSettingsEditable.languageConfig.defaultOutputLanguage = action.payload;
        },
        setEditableUseMarkdown(state, action: PayloadAction<boolean>) {
            state.loadedSettingsEditable.useMarkdownForOutput = action.payload;
        },
        setLlmModelList(state, action: PayloadAction<SelectItem[]>) {
            state.llmModelList = action.payload;
            if (action.payload.length > 0) {
                state.llmModelSelected = action.payload[0];
            } else {
                state.llmModelSelected = emptySelectItem;
            }
        },
        setLlmModelSelected(state, action: PayloadAction<SelectItem>) {
            state.llmModelSelected = action.payload;
        },
        setLanguageInputSelected(state, action: PayloadAction<SelectItem>) {
            state.languageInputSelected = action.payload;
        },
        setLanguageOutputSelected(state, action: PayloadAction<SelectItem>) {
            state.languageOutputSelected = action.payload;
        },
        resetEditableSettingsFromReadonly(state: SettingsState) {
            // Reset editable settings from readonly settings
            state.loadedSettingsEditable = JSON.parse(JSON.stringify(state.loadedSettingsReadonly));

            // Reset all derived UI states to match the restored settings
            state.providerSelected = mapStringToSelectItem(state.loadedSettingsReadonly.currentProviderConfig?.providerName || '');
            state.llmModelSelected = mapStringToSelectItem(state.loadedSettingsReadonly.modelConfig?.modelName || '');
            state.languageInputSelected = mapStringToSelectItem(state.loadedSettingsReadonly.languageConfig?.defaultInputLanguage || '');
            state.languageOutputSelected = mapStringToSelectItem(state.loadedSettingsReadonly.languageConfig?.defaultOutputLanguage || '');
            state.providerHeaders = mapRecordToKeyValuePair(state.loadedSettingsReadonly.currentProviderConfig?.headers);
        },
    },
    extraReducers: (builder) => {
        builder
            // settingsGetCurrentSettings
            .addCase(settingsGetCurrentSettings.pending, (state: SettingsState) => {
                state.isLoadingSettings = true;
                resetValidationMessages(state);
            })
            .addCase(settingsGetCurrentSettings.fulfilled, (state: SettingsState, action: PayloadAction<FrontSettings>) => {
                state.isLoadingSettings = false;
                setStateFields(state, action.payload);
            })
            .addCase(settingsGetCurrentSettings.rejected, (state: SettingsState, action) => {
                state.isLoadingSettings = false;
                state.settingsGlobalErrorMsg = action.payload || UnknownError;
            })

            // settingsGetDefaultSettings
            .addCase(settingsGetDefaultSettings.pending, (state: SettingsState) => {
                state.isLoadingSettings = true;
                resetValidationMessages(state);
            })
            .addCase(settingsGetDefaultSettings.fulfilled, (state: SettingsState, action: PayloadAction<FrontSettings>) => {
                state.isLoadingSettings = false;
                setStateFields(state, action.payload);
            })
            .addCase(settingsGetDefaultSettings.rejected, (state: SettingsState, action) => {
                state.isLoadingSettings = false;
                state.settingsGlobalErrorMsg = action.payload || UnknownError;
            })

            // settingsSaveSettings
            .addCase(settingsSaveSettings.pending, (state: SettingsState) => {
                state.isLoadingSettings = true;
                resetValidationMessages(state);
            })
            .addCase(settingsSaveSettings.fulfilled, (state: SettingsState, action: PayloadAction<FrontSettings>) => {
                state.isLoadingSettings = false;
                setStateFields(state, action.payload);
            })
            .addCase(settingsSaveSettings.rejected, (state: SettingsState, action) => {
                state.isLoadingSettings = false;
                state.settingsGlobalErrorMsg = action.payload || UnknownError;
            })

            // settingsGetProviderTypes
            .addCase(settingsGetProviderTypes.pending, (state: SettingsState) => {
                state.isLoadingSettings = true;
                resetValidationMessages(state);
            })
            .addCase(settingsGetProviderTypes.fulfilled, (state: SettingsState, action: PayloadAction<string[]>) => {
                state.isLoadingSettings = false;
                state.providersTypes = stringsToSelectItems(action.payload);
                if (action.payload.length > 0) {
                    state.providerType = stringsToSelectItems([action.payload[0]])[0];
                }
            })
            .addCase(settingsGetProviderTypes.rejected, (state: SettingsState, action) => {
                state.isLoadingSettings = false;
                state.settingsGlobalErrorMsg = action.payload || UnknownError;
            })

            // settingsGetModelsList
            .addCase(settingsGetModelsList.pending, (state: SettingsState) => {
                state.isLoadingSettings = true;
                resetValidationMessages(state);
            })
            .addCase(settingsGetModelsList.fulfilled, (state: SettingsState, action: PayloadAction<string[]>) => {
                state.isLoadingSettings = false;
                const loadedModelsList = action.payload;
                state.llmModelList = stringsToSelectItems(loadedModelsList);

                if (loadedModelsList.length > 0) {
                    // Try to preserve the currently selected model if it exists in the new list
                    const currentModelName = state.loadedSettingsEditable.modelConfig.modelName;
                    const currentModelExists = loadedModelsList.includes(currentModelName);

                    if (currentModelExists && currentModelName) {
                        // Keep the current selection
                        state.llmModelSelected = stringToSelectItem(currentModelName);
                    } else {
                        // Fall back to the first model if current doesn't exist
                        state.llmModelSelected = stringsToSelectItems([loadedModelsList[0]])[0];
                        state.loadedSettingsEditable.modelConfig.modelName = loadedModelsList[0];
                    }
                }
            })
            .addCase(settingsGetModelsList.rejected, (state: SettingsState, action) => {
                state.isLoadingSettings = false;
                state.settingsGlobalErrorMsg = action.payload || UnknownError;
            })

            // settingsCreateNewProvider
            .addCase(settingsCreateNewProvider.pending, (state: SettingsState) => {
                state.isLoadingSettings = true;
                resetValidationMessages(state);
            })
            .addCase(settingsCreateNewProvider.fulfilled, (state: SettingsState, action: PayloadAction<FrontProviderConfig>) => {
                state.isLoadingSettings = false;
                // Update the available providers and select the new one
                state.loadedSettingsReadonly.availableProviderConfigs.push(action.payload);
                state.loadedSettingsEditable.availableProviderConfigs.push(action.payload);
                state.providerList = mapStringListToSelectItems(state.loadedSettingsEditable.availableProviderConfigs.map((p) => p.providerName));
                state.providerSelected = mapStringToSelectItem(action.payload.providerName);
                state.providerValidationSuccessMsg = 'Provider created successfully';
            })
            .addCase(settingsCreateNewProvider.rejected, (state: SettingsState, action) => {
                state.isLoadingSettings = false;
                state.providerValidationErrorMsg = action.payload || UnknownError;
            })

            // settingsUpdateProvider
            .addCase(settingsUpdateProvider.pending, (state: SettingsState) => {
                state.isLoadingSettings = true;
                resetValidationMessages(state);
            })
            .addCase(settingsUpdateProvider.fulfilled, (state: SettingsState, action: PayloadAction<FrontProviderConfig>) => {
                state.isLoadingSettings = false;
                // Update the provider in both available providers and the current provider if it matches
                const updatedProvider = action.payload;

                // Update in available providers
                const availableIndex = state.loadedSettingsEditable.availableProviderConfigs.findIndex(
                    (p) => p.providerName === updatedProvider.providerName,
                );
                if (availableIndex >= 0) {
                    state.loadedSettingsEditable.availableProviderConfigs[availableIndex] = updatedProvider;
                    state.loadedSettingsReadonly.availableProviderConfigs[availableIndex] = JSON.parse(JSON.stringify(updatedProvider));
                }

                // Update current provider if it matches
                if (state.loadedSettingsEditable.currentProviderConfig.providerName === updatedProvider.providerName) {
                    state.loadedSettingsEditable.currentProviderConfig = updatedProvider;
                    state.loadedSettingsReadonly.currentProviderConfig = JSON.parse(JSON.stringify(updatedProvider));
                    state.providerHeaders = mapRecordToKeyValuePair(updatedProvider.headers);
                }

                state.providerValidationSuccessMsg = 'Provider updated successfully';
            })
            .addCase(settingsUpdateProvider.rejected, (state: SettingsState, action) => {
                state.isLoadingSettings = false;
                state.providerValidationErrorMsg = action.payload || UnknownError;
            })

            // settingsSelectProvider
            .addCase(settingsSelectProvider.pending, (state: SettingsState) => {
                state.isLoadingSettings = true;
                resetValidationMessages(state);
            })
            .addCase(settingsSelectProvider.fulfilled, (state: SettingsState, action: PayloadAction<FrontProviderConfig>) => {
                state.isLoadingSettings = false;
                // Update the current provider
                state.loadedSettingsEditable.currentProviderConfig = action.payload;
                state.loadedSettingsReadonly.currentProviderConfig = JSON.parse(JSON.stringify(action.payload));
                state.providerSelected = mapStringToSelectItem(action.payload.providerName);
                state.providerHeaders = mapRecordToKeyValuePair(action.payload.headers);
                state.providerValidationSuccessMsg = 'Provider selected successfully';
            })
            .addCase(settingsSelectProvider.rejected, (state: SettingsState, action) => {
                state.isLoadingSettings = false;
                state.providerValidationErrorMsg = action.payload || UnknownError;
            })

            // settingsDeleteProvider
            .addCase(settingsDeleteProvider.pending, (state: SettingsState) => {
                state.isLoadingSettings = true;
                resetValidationMessages(state);
            })
            .addCase(settingsDeleteProvider.fulfilled, (state: SettingsState, action: PayloadAction<boolean>) => {
                state.isLoadingSettings = false;
                if (action.payload) {
                    state.providerValidationSuccessMsg = 'Provider deleted successfully';
                    // Note: The full settings will be reloaded after deletion, so we don't update here
                } else {
                    state.providerValidationErrorMsg = 'Failed to delete provider';
                }
            })
            .addCase(settingsDeleteProvider.rejected, (state: SettingsState, action) => {
                state.isLoadingSettings = false;
                state.providerValidationErrorMsg = action.payload || UnknownError;
            })

            // settingsValidateProvider
            .addCase(settingsValidateProvider.pending, (state: SettingsState) => {
                state.isLoadingSettings = true;
                resetValidationMessages(state);
            })
            .addCase(settingsValidateProvider.fulfilled, (state: SettingsState, action: PayloadAction<boolean>) => {
                state.isLoadingSettings = false;
                if (action.payload) {
                    state.providerValidationSuccessMsg = 'Provider validation successful';
                } else {
                    state.providerValidationErrorMsg = 'Provider validation failed';
                }
            })
            .addCase(settingsValidateProvider.rejected, (state: SettingsState, action) => {
                state.isLoadingSettings = false;
                state.providerValidationErrorMsg = action.payload || UnknownError;
            })

            // settingsGetSettingsFilePath
            .addCase(settingsGetSettingsFilePath.pending, (state: SettingsState) => {
                state.isLoadingSettings = true;
                resetValidationMessages(state);
            })
            .addCase(settingsGetSettingsFilePath.fulfilled, (state: SettingsState, action: PayloadAction<string>) => {
                state.isLoadingSettings = false;
                state.settingsFilePath = action.payload;
            })
            .addCase(settingsGetSettingsFilePath.rejected, (state: SettingsState, action) => {
                state.isLoadingSettings = false;
                state.settingsGlobalErrorMsg = action.payload || UnknownError;
            });
    },
});

export const {
    setProviderSelected,
    addNewEmptyProviderHeader,
    updateProviderHeader,
    removeProviderHeader,
    setEditableModelName,
    setEditableTemperatureEnabled,
    setEditableTemperature,
    setEditableInputLanguage,
    setEditableOutputLanguage,
    setEditableUseMarkdown,
    setLlmModelSelected,
    setLanguageInputSelected,
    setLanguageOutputSelected,
    resetEditableSettingsFromReadonly,
    setProviderTestModel,
    setCurrentProviderConfig,
} = settingsSlice.actions;

export { emptySelectItem };

export default settingsSlice.reducer;
