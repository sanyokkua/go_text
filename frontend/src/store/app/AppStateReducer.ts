import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppSettings, UnknownError } from '../../common/types';
import { SelectItem } from '../../widgets/base/Select';
import { TabContentBtn } from '../../widgets/tabs/common/TabButtonsWidget';
import {
    appStateActionProcess,
    appStateCurrentProviderAndModelGet,
    appStateDefaultInputLanguageGet,
    appStateDefaultOutputLanguageGet,
    appStateFormattingButtonsGet,
    appStateInputLanguagesGet,
    appStateOutputLanguagesGet,
    appStateProcessCopyToClipboard,
    appStateProcessPasteFromClipboard,
    appStateProofreadingButtonsGet,
    appStateSummaryButtonsGet,
    appStateTransformingButtonsGet,
    appStateTranslateButtonsGet,
    initializeAppState,
} from './app_state_thunks';

export interface AppState {
    buttonsForProofreading: TabContentBtn[];
    buttonsForFormatting: TabContentBtn[];
    buttonsForTranslating: TabContentBtn[];
    buttonsForSummarization: TabContentBtn[];
    buttonsForTransforming: TabContentBtn[];
    availableInputLanguages: SelectItem[];
    availableOutputLanguages: SelectItem[];
    currentProvider: string;
    errorMessage: string;

    // UI Managed
    textEditorInputContent: string;
    textEditorOutputContent: string;
    selectedInputLanguage: SelectItem;
    selectedOutputLanguage: SelectItem;
    currentTask: string;
    currentModelName: string;
    isProcessing: boolean;
    showSettingsView: boolean;
}

const initialState: AppState = {
    buttonsForProofreading: [],
    buttonsForFormatting: [],
    buttonsForTranslating: [],
    buttonsForSummarization: [],
    buttonsForTransforming: [],
    availableInputLanguages: [],
    availableOutputLanguages: [],
    currentProvider: '',
    errorMessage: '',

    textEditorInputContent: '',
    textEditorOutputContent: '',
    selectedInputLanguage: { itemId: '', displayText: '' },
    selectedOutputLanguage: { itemId: '', displayText: '' },
    currentTask: '',
    currentModelName: '',
    isProcessing: false,
    showSettingsView: false,
};

export const appStateSlice = createSlice({
    name: 'appState',
    initialState,
    reducers: {
        setTextEditorInputContent: (state: AppState, action: PayloadAction<string>) => {
            state.textEditorInputContent = action.payload;
            state.errorMessage = '';
        },
        setTextEditorOutputContent: (state: AppState, action: PayloadAction<string>) => {
            state.textEditorOutputContent = action.payload;
        },
        setSelectedInputLanguage: (state: AppState, action: PayloadAction<SelectItem>) => {
            state.selectedInputLanguage = action.payload;
        },
        setSelectedOutputLanguage: (state: AppState, action: PayloadAction<SelectItem>) => {
            state.selectedOutputLanguage = action.payload;
        },
        setCurrentTask: (state: AppState, action: PayloadAction<string>) => {
            state.currentTask = action.payload;
        },
        setShowSettingsView: (state: AppState, action: PayloadAction<boolean>) => {
            state.showSettingsView = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(appStateProofreadingButtonsGet.pending, (state: AppState) => {
                state.isProcessing = true;
            })
            .addCase(appStateProofreadingButtonsGet.fulfilled, (state: AppState, action: PayloadAction<TabContentBtn[]>) => {
                state.isProcessing = false;
                state.buttonsForProofreading = action.payload;
            })
            .addCase(appStateProofreadingButtonsGet.rejected, (state: AppState, action) => {
                state.isProcessing = false;
                state.errorMessage = action.payload || UnknownError;
                state.buttonsForProofreading = [];
            })

            .addCase(appStateFormattingButtonsGet.pending, (state: AppState) => {
                state.isProcessing = true;
            })
            .addCase(appStateFormattingButtonsGet.fulfilled, (state: AppState, action: PayloadAction<TabContentBtn[]>) => {
                state.isProcessing = false;
                state.buttonsForFormatting = action.payload;
            })
            .addCase(appStateFormattingButtonsGet.rejected, (state: AppState, action) => {
                state.isProcessing = false;
                state.errorMessage = action.payload || UnknownError;
                state.buttonsForFormatting = [];
            })

            .addCase(appStateTranslateButtonsGet.pending, (state: AppState) => {
                state.isProcessing = true;
            })
            .addCase(appStateTranslateButtonsGet.fulfilled, (state: AppState, action: PayloadAction<TabContentBtn[]>) => {
                state.isProcessing = false;
                state.buttonsForTranslating = action.payload;
            })
            .addCase(appStateTranslateButtonsGet.rejected, (state: AppState, action) => {
                state.isProcessing = false;
                state.errorMessage = action.payload || UnknownError;
                state.buttonsForTranslating = [];
            })

            .addCase(appStateSummaryButtonsGet.pending, (state: AppState) => {
                state.isProcessing = true;
            })
            .addCase(appStateSummaryButtonsGet.fulfilled, (state: AppState, action: PayloadAction<TabContentBtn[]>) => {
                state.isProcessing = false;
                state.buttonsForSummarization = action.payload;
            })
            .addCase(appStateSummaryButtonsGet.rejected, (state: AppState, action) => {
                state.isProcessing = false;
                state.errorMessage = action.payload || UnknownError;
                state.buttonsForSummarization = [];
            })

            .addCase(appStateTransformingButtonsGet.pending, (state: AppState) => {
                state.isProcessing = true;
            })
            .addCase(appStateTransformingButtonsGet.fulfilled, (state: AppState, action: PayloadAction<TabContentBtn[]>) => {
                state.isProcessing = false;
                state.buttonsForTransforming = action.payload;
            })
            .addCase(appStateTransformingButtonsGet.rejected, (state: AppState, action) => {
                state.isProcessing = false;
                state.errorMessage = action.payload || UnknownError;
                state.buttonsForTransforming = [];
            })

            .addCase(appStateInputLanguagesGet.pending, (state: AppState) => {
                state.isProcessing = true;
            })
            .addCase(appStateInputLanguagesGet.fulfilled, (state: AppState, action: PayloadAction<SelectItem[]>) => {
                state.isProcessing = false;
                state.availableInputLanguages = action.payload;
            })
            .addCase(appStateInputLanguagesGet.rejected, (state: AppState, action) => {
                state.isProcessing = false;
                state.errorMessage = action.payload || UnknownError;
                state.availableInputLanguages = [];
            })

            .addCase(appStateOutputLanguagesGet.pending, (state: AppState) => {
                state.isProcessing = true;
            })
            .addCase(appStateOutputLanguagesGet.fulfilled, (state: AppState, action: PayloadAction<SelectItem[]>) => {
                state.isProcessing = false;
                state.availableOutputLanguages = action.payload;
            })
            .addCase(appStateOutputLanguagesGet.rejected, (state: AppState, action) => {
                state.isProcessing = false;
                state.errorMessage = action.payload || UnknownError;
                state.availableOutputLanguages = [];
            })

            .addCase(appStateDefaultInputLanguageGet.pending, (state: AppState) => {
                state.isProcessing = true;
            })
            .addCase(appStateDefaultInputLanguageGet.fulfilled, (state: AppState, action: PayloadAction<SelectItem>) => {
                state.isProcessing = false;
                state.selectedInputLanguage = action.payload;
            })
            .addCase(appStateDefaultInputLanguageGet.rejected, (state: AppState, action) => {
                state.isProcessing = false;
                state.errorMessage = action.payload || UnknownError;
                state.selectedInputLanguage = { itemId: '', displayText: '' };
            })

            .addCase(appStateDefaultOutputLanguageGet.pending, (state: AppState) => {
                state.isProcessing = true;
            })
            .addCase(appStateDefaultOutputLanguageGet.fulfilled, (state: AppState, action: PayloadAction<SelectItem>) => {
                state.isProcessing = false;
                state.selectedOutputLanguage = action.payload;
            })
            .addCase(appStateDefaultOutputLanguageGet.rejected, (state: AppState, action) => {
                state.isProcessing = false;
                state.errorMessage = action.payload || UnknownError;
                state.selectedOutputLanguage = { itemId: '', displayText: '' };
            })

            .addCase(appStateCurrentProviderAndModelGet.pending, (state: AppState) => {
                state.isProcessing = true;
            })
            .addCase(appStateCurrentProviderAndModelGet.fulfilled, (state: AppState, action: PayloadAction<AppSettings>) => {
                state.isProcessing = false;
                state.currentProvider = action.payload.baseUrl;
                state.currentModelName = action.payload.modelName;
            })
            .addCase(appStateCurrentProviderAndModelGet.rejected, (state: AppState, action) => {
                state.isProcessing = false;
                state.errorMessage = action.payload || UnknownError;
                state.currentProvider = '';
                state.currentModelName = '';
            })

            .addCase(appStateProcessCopyToClipboard.pending, (state: AppState) => {
                state.isProcessing = true;
            })
            .addCase(appStateProcessCopyToClipboard.fulfilled, (state: AppState, action: PayloadAction<void>) => {
                state.isProcessing = false;
            })
            .addCase(appStateProcessCopyToClipboard.rejected, (state: AppState, action) => {
                state.isProcessing = false;
                state.errorMessage = action.payload || UnknownError;
            })

            .addCase(appStateProcessPasteFromClipboard.pending, (state: AppState) => {
                state.isProcessing = true;
            })
            .addCase(appStateProcessPasteFromClipboard.fulfilled, (state: AppState, action: PayloadAction<string>) => {
                state.isProcessing = false;
                state.textEditorInputContent = action.payload;
            })
            .addCase(appStateProcessPasteFromClipboard.rejected, (state: AppState, action) => {
                state.isProcessing = false;
                state.errorMessage = action.payload || UnknownError;
            })

            .addCase(appStateActionProcess.pending, (state: AppState) => {
                state.isProcessing = true;
                state.errorMessage = '';
            })
            .addCase(appStateActionProcess.fulfilled, (state: AppState, action: PayloadAction<string>) => {
                state.isProcessing = false;
                state.textEditorOutputContent = action.payload;
                state.currentTask = '';
            })
            .addCase(appStateActionProcess.rejected, (state: AppState, action) => {
                state.isProcessing = false;
                state.errorMessage = action.payload || UnknownError;
                state.currentTask = '';
            })

            .addCase(initializeAppState.pending, (state: AppState) => {
                state.isProcessing = true;
                state.errorMessage = '';
            })
            .addCase(initializeAppState.fulfilled, (state: AppState, action: PayloadAction<void>) => {
                state.isProcessing = false;
            })
            .addCase(initializeAppState.rejected, (state: AppState, action) => {
                state.isProcessing = false;
            });
    },
});

export const {
    setSelectedInputLanguage,
    setTextEditorInputContent,
    setTextEditorOutputContent,
    setSelectedOutputLanguage,
    setCurrentTask,
    setShowSettingsView,
} = appStateSlice.actions;

// Export the app state slice reducer
export default appStateSlice.reducer;
