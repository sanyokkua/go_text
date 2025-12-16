import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { v4 as uuidv4 } from 'uuid';
import { AppSettings, KeyValuePair, LanguageConfig, ModelConfig, ProviderConfig, ProviderType, UnknownError } from '../../common/types';
import { SelectItem } from '../../widgets/base/Select';
import {
    appSettingsGetListOfModels,
    appSettingsLoadCurrentSettings,
    appSettingsResetToDefaultSettings,
    appSettingsSaveSettings,
    appSettingsSwitchProviderType,
    appSettingsSwitchProviderTypeAndSave,
    appSettingsValidateCompletionRequest,
    appSettingsValidateModelsRequest,
    appSettingsVerifyProviderAvailability,
    initializeSettingsState,
} from './settings_thunks';

const generateBtnId = (): string => {
    const timePrefix = new Date().getUTCMilliseconds().toString();
    const id = uuidv4();
    return `${timePrefix}-${id}`;
};
const mapStringToSelectItem = (value: string): SelectItem => {
    return { itemId: value, displayText: value };
};
const mapStringListToSelectItems = (list: string[]): SelectItem[] => {
    return list.map(mapStringToSelectItem);
};
const mapRecordToKeyValuePair = (headers: Record<string, string>): KeyValuePair[] => {
    const keyValuePairs: KeyValuePair[] = [];
    Object.keys(headers).forEach((key: string) => {
        const value = headers[key];
        const id = generateBtnId();
        keyValuePairs.push({ id: id, key: key, value: value });
    });
    return keyValuePairs.sort((a, b) => a.id.localeCompare(b.id));
};
const mapKeyValuePairToRecord = (keyValuePairs: KeyValuePair[]): Record<string, string> => {
    const record: Record<string, string> = {};
    keyValuePairs.forEach((item) => {
        record[item.key] = item.value;
    });
    return record;
};
const validateEndpoint = (endpoint: string, name: string): string => {
    if (!endpoint || endpoint.trim().length === 0) {
        return `${name} can't be empty`;
    }
    if (!endpoint.startsWith('/')) {
        return `${name} should start with '/' symbol`;
    }
    if (endpoint.endsWith('/')) {
        return `${name} shouldn't end with '/' symbol`;
    }
    return '';
};
const resetValidationMessages = (state: AppSettingsState) => {
    state.baseUrlSuccessMsg = '';
    state.baseUrlValidationErr = '';
    state.modelsEndpointSuccessMsg = '';
    state.modelsEndpointValidationErr = '';
    state.completionEndpointSuccessMsg = '';
    state.completionEndpointValidationErr = '';
    state.errorMsg = '';
};
const setStateFields = (state: AppSettingsState, action: PayloadAction<AppSettings>) => {
    state.availableProviderConfigs = action.payload.availableProviderConfigs;
    state.currentProviderConfig = action.payload.currentProviderConfig;
    state.modelConfig = action.payload.modelConfig;
    state.languageConfig = action.payload.languageConfig;
    state.useMarkdownForOutput = action.payload.useMarkdownForOutput;

    // Helper mappings for UI
    state.displayListOfLanguages = mapStringListToSelectItems(action.payload.languageConfig.languages);
    state.displaySelectedInputLanguage = mapStringToSelectItem(action.payload.languageConfig.defaultInputLanguage);
    state.displaySelectedOutputLanguage = mapStringToSelectItem(action.payload.languageConfig.defaultOutputLanguage);
    state.displaySelectedModel = mapStringToSelectItem(action.payload.modelConfig.modelName);
    state.displayHeaders = mapRecordToKeyValuePair(action.payload.currentProviderConfig.headers);

    resetValidationMessages(state);
};

export interface AppSettingsState {
    displayListOfLanguages: SelectItem[];
    displaySelectedInputLanguage: SelectItem;
    displaySelectedOutputLanguage: SelectItem;
    displayListOfModels: SelectItem[];
    displaySelectedModel: SelectItem;
    displayHeaders: KeyValuePair[];

    // New nested state structures
    availableProviderConfigs: ProviderConfig[];
    currentProviderConfig: ProviderConfig;
    modelConfig: ModelConfig;
    languageConfig: LanguageConfig;
    useMarkdownForOutput: boolean;

    // UI state for current provider editing
    completionEndpointModel: string; // This seems to be UI-only state not saved in backend config directly?

    baseUrlSuccessMsg: string;
    baseUrlValidationErr: string;
    modelsEndpointSuccessMsg: string;
    modelsEndpointValidationErr: string;
    completionEndpointSuccessMsg: string;
    completionEndpointValidationErr: string;
    models: string[];
    errorMsg: string;
    isLoadingSettings: boolean;
    // Provider management state
    isEditingProvider: boolean;
    currentEditingProvider: ProviderConfig | null;
}

const emptySelectItems: SelectItem = mapStringToSelectItem('');

const initialState: AppSettingsState = {
    displayListOfLanguages: [],
    displaySelectedInputLanguage: emptySelectItems,
    displaySelectedOutputLanguage: emptySelectItems,
    displayListOfModels: [],
    displaySelectedModel: emptySelectItems,
    displayHeaders: [],

    availableProviderConfigs: [],
    currentProviderConfig: {
        providerType: 'custom',
        providerName: 'Custom OpenAI',
        baseUrl: '',
        modelsEndpoint: '',
        completionEndpoint: '',
        headers: {},
    },
    modelConfig: { modelName: '', isTemperatureEnabled: true, temperature: 0.5 },
    languageConfig: { languages: [], defaultInputLanguage: '', defaultOutputLanguage: '' },
    useMarkdownForOutput: false,

    models: [],
    errorMsg: '',
    baseUrlValidationErr: '',
    modelsEndpointValidationErr: '',
    completionEndpointValidationErr: '',
    completionEndpointModel: '',
    baseUrlSuccessMsg: '',
    modelsEndpointSuccessMsg: '',
    completionEndpointSuccessMsg: '',
    isLoadingSettings: false,
    // Provider management state
    isEditingProvider: false,
    currentEditingProvider: null,
};

export const appSettingsSlice = createSlice({
    name: 'appSettings',
    initialState,
    reducers: {
        setDisplaySelectedInputLanguage(state, action: PayloadAction<SelectItem>) {
            state.displaySelectedInputLanguage = action.payload;
            state.languageConfig.defaultInputLanguage = action.payload.itemId;
        },
        setDisplaySelectedOutputLanguage(state, action: PayloadAction<SelectItem>) {
            state.displaySelectedOutputLanguage = action.payload;
            state.languageConfig.defaultOutputLanguage = action.payload.itemId;
        },
        setDisplaySelectedModel(state, action: PayloadAction<SelectItem>) {
            state.displaySelectedModel = action.payload;
            state.modelConfig.modelName = action.payload.itemId;
        },
        addDisplayHeader(state, action: PayloadAction<void>) {
            if (state.displayHeaders.some((item) => item.key.trim().length === 0 && item.value.trim().length === 0)) {
                return;
            }
            if (state.displayHeaders.some((item) => item.key.trim() === '')) {
                return;
            }

            const newHeaders = [...state.displayHeaders];
            newHeaders.push({ id: generateBtnId(), key: '', value: '' });
            state.displayHeaders = newHeaders.sort((a, b) => a.id.localeCompare(b.id));
            state.currentProviderConfig.headers = mapKeyValuePairToRecord(newHeaders);
            resetValidationMessages(state);
        },
        updateHeader(state, action: PayloadAction<KeyValuePair>) {
            const newHeaders = [...state.displayHeaders];
            const filtered = newHeaders.filter((item) => item.id !== action.payload.id);
            filtered.push(action.payload);

            state.displayHeaders = filtered.sort((a, b) => a.id.localeCompare(b.id));
            state.currentProviderConfig.headers = mapKeyValuePairToRecord(filtered);
            resetValidationMessages(state);
        },
        removeDisplayHeader(state, action: PayloadAction<string>) {
            const newHeaders = [...state.displayHeaders];
            const filtered = newHeaders.filter((item) => item.id !== action.payload);
            state.displayHeaders = filtered.sort((a, b) => a.id.localeCompare(b.id));
            state.currentProviderConfig.headers = mapKeyValuePairToRecord(filtered);
            resetValidationMessages(state);
        },
        setModelName: (state: AppSettingsState, action: PayloadAction<string>) => {
            state.modelConfig.modelName = action.payload;
        },
        setBaseUrl: (state: AppSettingsState, action: PayloadAction<string>) => {
            resetValidationMessages(state);
            const baseUrl = action.payload;
            state.currentProviderConfig.baseUrl = baseUrl;
            // Only validate if custom provider, others might be hardcoded/different?
            // Actually, validation logic is good to keep generally, but maybe loosen for non-http?
            if (!baseUrl || baseUrl.trim().length === 0) {
                state.baseUrlValidationErr = 'Base Url cannot be empty.';
            } else if (!(baseUrl.startsWith('http://') || baseUrl.startsWith('https://'))) {
                state.baseUrlValidationErr = 'Base Url should start with http:// or https://';
            } else if (baseUrl.endsWith('/')) {
                state.baseUrlValidationErr = 'Base Url should not end with /';
            } else {
                state.baseUrlValidationErr = '';
            }
        },
        setModelsEndpoint: (state: AppSettingsState, action: PayloadAction<string>) => {
            resetValidationMessages(state);
            const modelsEndpoint = action.payload;
            state.currentProviderConfig.modelsEndpoint = modelsEndpoint;
            state.modelsEndpointValidationErr = validateEndpoint(modelsEndpoint, 'Model Endpoint');
        },
        setCompletionEndpoint: (state: AppSettingsState, action: PayloadAction<string>) => {
            resetValidationMessages(state);
            const completionEndpoint = action.payload;
            state.currentProviderConfig.completionEndpoint = completionEndpoint;
            state.completionEndpointValidationErr = validateEndpoint(completionEndpoint, 'Completion Endpoint');
        },
        setCompletionEndpointModel: (state: AppSettingsState, action: PayloadAction<string>) => {
            resetValidationMessages(state);
            state.completionEndpointModel = action.payload;
        },
        setTemperature: (state: AppSettingsState, action: PayloadAction<number>) => {
            state.modelConfig.temperature = action.payload;
        },
        setIsTemperatureEnabled: (state: AppSettingsState, action: PayloadAction<boolean>) => {
            state.modelConfig.isTemperatureEnabled = action.payload;
        },
        setUseMarkdownForOutput: (state: AppSettingsState, action: PayloadAction<boolean>) => {
            state.useMarkdownForOutput = action.payload;
        },
        setProviderType: (state: AppSettingsState, action: PayloadAction<ProviderType>) => {
            state.currentProviderConfig.providerType = action.payload;
        },
        // setCustomSettings removed as it is now part of state via ProviderConfig switching logic
        setBaseUrlSuccessMsg: (state: AppSettingsState, action: PayloadAction<string>) => {
            state.baseUrlSuccessMsg = action.payload;
        },
        setBaseUrlValidationErr: (state: AppSettingsState, action: PayloadAction<string>) => {
            state.baseUrlValidationErr = action.payload;
        },
        setProviderName: (state: AppSettingsState, action: PayloadAction<string>) => {
            state.currentProviderConfig.providerName = action.payload;
        },
        setIsEditingProvider: (state: AppSettingsState, action: PayloadAction<boolean>) => {
            state.isEditingProvider = action.payload;
        },
        setCurrentEditingProvider: (state: AppSettingsState, action: PayloadAction<ProviderConfig | null>) => {
            state.currentEditingProvider = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(appSettingsLoadCurrentSettings.pending, (state: AppSettingsState) => {
                state.isLoadingSettings = true;
                resetValidationMessages(state);
            })
            .addCase(appSettingsLoadCurrentSettings.fulfilled, (state: AppSettingsState, action: PayloadAction<AppSettings>) => {
                state.isLoadingSettings = false;
                setStateFields(state, action);
            })
            .addCase(appSettingsLoadCurrentSettings.rejected, (state: AppSettingsState, action) => {
                state.isLoadingSettings = false;
                state.errorMsg = action.payload || UnknownError;
            })

            .addCase(appSettingsResetToDefaultSettings.pending, (state: AppSettingsState) => {
                state.isLoadingSettings = true;
                resetValidationMessages(state);
            })
            .addCase(appSettingsResetToDefaultSettings.fulfilled, (state: AppSettingsState, action: PayloadAction<AppSettings>) => {
                state.isLoadingSettings = false;
                setStateFields(state, action);
            })
            .addCase(appSettingsResetToDefaultSettings.rejected, (state: AppSettingsState, action) => {
                state.isLoadingSettings = false;
                state.errorMsg = action.payload || UnknownError;
            })

            .addCase(appSettingsSaveSettings.pending, (state: AppSettingsState) => {
                state.isLoadingSettings = true;
                resetValidationMessages(state);
            })
            .addCase(appSettingsSaveSettings.fulfilled, (state: AppSettingsState, action: PayloadAction<void>) => {
                state.isLoadingSettings = false;
            })
            .addCase(appSettingsSaveSettings.rejected, (state: AppSettingsState, action: any) => {
                state.isLoadingSettings = false;
                state.errorMsg = action.payload || UnknownError;
            })

            .addCase(appSettingsGetListOfModels.pending, (state: AppSettingsState) => {
                state.isLoadingSettings = true;
                resetValidationMessages(state);
            })
            .addCase(appSettingsGetListOfModels.fulfilled, (state: AppSettingsState, action: PayloadAction<string[]>) => {
                state.isLoadingSettings = false;
                const loadedModelsList = action.payload;
                loadedModelsList.push(''); //Add the ability to see not selected model

                state.models = loadedModelsList;
                state.displayListOfModels = mapStringListToSelectItems(loadedModelsList);
                const currentModelInAvailableModelsList = loadedModelsList.some((item) => item.trim() === state.modelConfig.modelName.trim());
                if (!currentModelInAvailableModelsList && loadedModelsList.length > 0) {
                    const modelNameFromPayload = loadedModelsList[0];
                    const newModel = mapStringToSelectItem(modelNameFromPayload);
                    state.modelConfig.modelName = modelNameFromPayload;
                    state.displaySelectedModel = newModel;
                }
            })
            .addCase(appSettingsGetListOfModels.rejected, (state: AppSettingsState, action) => {
                state.isLoadingSettings = false;
                state.errorMsg = action.payload || UnknownError;
                state.models = [];
                state.displayListOfModels = [];
            })

            .addCase(appSettingsValidateModelsRequest.pending, (state: AppSettingsState) => {
                state.isLoadingSettings = true;
                resetValidationMessages(state);
            })
            .addCase(appSettingsValidateModelsRequest.fulfilled, (state: AppSettingsState, action: PayloadAction<boolean>) => {
                state.isLoadingSettings = false;
                if (action.payload) {
                    state.modelsEndpointSuccessMsg = 'Models Request Succeeded';
                } else {
                    state.modelsEndpointValidationErr = 'Models Request Failed';
                }
            })
            .addCase(appSettingsValidateModelsRequest.rejected, (state: AppSettingsState, action) => {
                state.isLoadingSettings = false;
                state.modelsEndpointValidationErr = action.payload || UnknownError;
            })

            .addCase(appSettingsValidateCompletionRequest.pending, (state: AppSettingsState) => {
                state.isLoadingSettings = true;
                resetValidationMessages(state);
            })
            .addCase(appSettingsValidateCompletionRequest.fulfilled, (state: AppSettingsState, action: PayloadAction<boolean>) => {
                state.isLoadingSettings = false;
                if (action.payload) {
                    state.completionEndpointSuccessMsg = 'Models Request Succeeded';
                } else {
                    state.completionEndpointValidationErr = 'Models Request Failed';
                }
            })
            .addCase(appSettingsValidateCompletionRequest.rejected, (state: AppSettingsState, action) => {
                state.isLoadingSettings = false;
                state.completionEndpointValidationErr = action.payload || UnknownError;
            })

            .addCase(initializeSettingsState.pending, (state: AppSettingsState) => {
                state.isLoadingSettings = true;
                resetValidationMessages(state);
            })
            .addCase(initializeSettingsState.fulfilled, (state: AppSettingsState, action: PayloadAction<void>) => {
                state.isLoadingSettings = false;
            })
            .addCase(initializeSettingsState.rejected, (state: AppSettingsState, action) => {
                state.isLoadingSettings = false;
            })

            .addCase(appSettingsSwitchProviderType.pending, (state: AppSettingsState) => {
                state.isLoadingSettings = true;
                resetValidationMessages(state);
            })
            .addCase(appSettingsSwitchProviderType.fulfilled, (state: AppSettingsState, action: PayloadAction<AppSettings>) => {
                state.isLoadingSettings = false;
                setStateFields(state, action);
            })
            .addCase(appSettingsSwitchProviderType.rejected, (state: AppSettingsState, action) => {
                state.isLoadingSettings = false;
                state.errorMsg = action.payload || UnknownError;
            })

            .addCase(appSettingsSwitchProviderTypeAndSave.pending, (state: AppSettingsState) => {
                state.isLoadingSettings = true;
                resetValidationMessages(state);
            })
            .addCase(appSettingsSwitchProviderTypeAndSave.fulfilled, (state: AppSettingsState, action: PayloadAction<AppSettings>) => {
                state.isLoadingSettings = false;
                setStateFields(state, action);
            })
            .addCase(appSettingsSwitchProviderTypeAndSave.rejected, (state: AppSettingsState, action: any) => {
                state.isLoadingSettings = false;
                state.errorMsg = action.payload ? action.payload.toString() : 'Unknown error';
            })

            .addCase(appSettingsVerifyProviderAvailability.pending, (state: AppSettingsState) => {
                state.isLoadingSettings = true;
                resetValidationMessages(state);
            })
            .addCase(appSettingsVerifyProviderAvailability.fulfilled, (state: AppSettingsState, action: PayloadAction<boolean>) => {
                state.isLoadingSettings = false;
                if (action.payload) {
                    state.baseUrlSuccessMsg = 'Provider is available';
                } else {
                    state.baseUrlValidationErr = 'Provider is not available';
                }
            })
            .addCase(appSettingsVerifyProviderAvailability.rejected, (state: AppSettingsState, action) => {
                state.isLoadingSettings = false;
                state.baseUrlValidationErr = action.payload || UnknownError;
            });
    },
});

export const {
    setDisplaySelectedInputLanguage,
    setDisplaySelectedOutputLanguage,
    setDisplaySelectedModel,
    setBaseUrl,
    setTemperature,
    setIsTemperatureEnabled,
    setUseMarkdownForOutput,
    addDisplayHeader,
    updateHeader,
    removeDisplayHeader,
    setModelsEndpoint,
    setCompletionEndpoint,
    setCompletionEndpointModel,
    setProviderType,
    setModelName,
    setBaseUrlSuccessMsg,
    setBaseUrlValidationErr,
    setProviderName,
    setIsEditingProvider,
    setCurrentEditingProvider,
} = appSettingsSlice.actions;

export { emptySelectItems };

export default appSettingsSlice.reducer;
