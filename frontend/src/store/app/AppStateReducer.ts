import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppSettings } from '../../common/types';
import { SelectItem } from '../../widgets/base/Select';
import { TabContentBtn } from '../../widgets/tabs/common/TabButtonsWidget';
import {
    actionProcessAction,
    appStateDefaultInputLanguageGet,
    appStateDefaultOutputLanguageGet,
    appStateFormattingButtonsGet,
    appStateInputLanguagesGet,
    appStateOutputLanguagesGet,
    appStateProofreadingButtonsGet,
    appStateSummaryButtonsGet,
    appStateTranslateButtonsGet,
    fetchCurrentModel,
    fetchCurrentSettings,
    processCopyToClipboard,
    processPasteFromClipboard,
} from './thunks';

export interface AppState {
    buttonsForProofreading: TabContentBtn[];
    buttonsForFormatting: TabContentBtn[];
    buttonsForTranslating: TabContentBtn[];
    buttonsForSummarization: TabContentBtn[];

    textEditorInputContent: string;
    textEditorOutputContent: string;

    selectedInputLanguage: SelectItem;
    selectedOutputLanguage: SelectItem;

    availableInputLanguages: SelectItem[];
    availableOutputLanguages: SelectItem[];

    currentProvider: string;
    currentTask: string;
    currentModelName: string;

    isProcessing: boolean;
    errorMessage: string;
}

const initialState: AppState = {
    buttonsForProofreading: [],
    buttonsForFormatting: [],
    buttonsForTranslating: [],
    buttonsForSummarization: [],
    textEditorInputContent: '',
    textEditorOutputContent: '',
    selectedInputLanguage: { itemId: '', displayText: '' },
    selectedOutputLanguage: { itemId: '', displayText: '' },
    availableInputLanguages: [],
    availableOutputLanguages: [],
    currentTask: '',
    currentProvider: '',
    currentModelName: '',
    isProcessing: false,
    errorMessage: '',
};

export const appStateSlice = createSlice({
    name: 'appState',
    initialState,
    reducers: {
        setInputContent: (state: AppState, action: PayloadAction<string>) => {
            state.textEditorInputContent = action.payload;
        },
        setOutputContent: (state: AppState, action: PayloadAction<string>) => {
            state.textEditorOutputContent = action.payload;
        },
        setInputLanguage: (state: AppState, action: PayloadAction<SelectItem>) => {
            state.selectedInputLanguage = action.payload;
        },
        setOutputLanguage: (state: AppState, action: PayloadAction<SelectItem>) => {
            state.selectedOutputLanguage = action.payload;
        },
        setCurrentTask: (state: AppState, action: PayloadAction<string>) => {
            state.currentTask = action.payload;
        },
        setIsProcessing: (state: AppState, action: PayloadAction<boolean>) => {
            state.isProcessing = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(appStateInputLanguagesGet.pending, (state: AppState) => {
                state.isProcessing = true;
            })
            .addCase(appStateInputLanguagesGet.fulfilled, (state: AppState, action: PayloadAction<SelectItem[]>) => {
                state.isProcessing = false;
                state.availableInputLanguages = action.payload;
            })
            .addCase(appStateInputLanguagesGet.rejected, (state: AppState, action) => {
                state.isProcessing = false;
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
                state.availableOutputLanguages = [];
            })

            .addCase(appStateProofreadingButtonsGet.pending, (state: AppState) => {
                state.isProcessing = true;
            })
            .addCase(
                appStateProofreadingButtonsGet.fulfilled,
                (state: AppState, action: PayloadAction<TabContentBtn[]>) => {
                    state.isProcessing = false;
                    state.buttonsForProofreading = action.payload;
                },
            )
            .addCase(appStateProofreadingButtonsGet.rejected, (state: AppState, action) => {
                state.isProcessing = false;
                state.buttonsForProofreading = [];
            })

            .addCase(appStateFormattingButtonsGet.pending, (state: AppState) => {
                state.isProcessing = true;
            })
            .addCase(
                appStateFormattingButtonsGet.fulfilled,
                (state: AppState, action: PayloadAction<TabContentBtn[]>) => {
                    state.isProcessing = false;
                    state.buttonsForFormatting = action.payload;
                },
            )
            .addCase(appStateFormattingButtonsGet.rejected, (state: AppState, action) => {
                state.isProcessing = false;
                state.buttonsForFormatting = [];
            })

            .addCase(appStateTranslateButtonsGet.pending, (state: AppState) => {
                state.isProcessing = true;
            })
            .addCase(
                appStateTranslateButtonsGet.fulfilled,
                (state: AppState, action: PayloadAction<TabContentBtn[]>) => {
                    state.isProcessing = false;
                    state.buttonsForTranslating = action.payload;
                },
            )
            .addCase(appStateTranslateButtonsGet.rejected, (state: AppState, action) => {
                state.isProcessing = false;
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
                state.buttonsForSummarization = [];
            })

            .addCase(processCopyToClipboard.pending, (state: AppState) => {
                state.isProcessing = true;
            })
            .addCase(processCopyToClipboard.fulfilled, (state: AppState, action: PayloadAction<void>) => {
                state.isProcessing = false;
            })
            .addCase(processCopyToClipboard.rejected, (state: AppState, action) => {
                state.isProcessing = false;
            })

            .addCase(processPasteFromClipboard.pending, (state: AppState) => {
                state.isProcessing = true;
            })
            .addCase(processPasteFromClipboard.fulfilled, (state: AppState, action: PayloadAction<string>) => {
                state.isProcessing = false;
                state.textEditorInputContent = action.payload;
            })
            .addCase(processPasteFromClipboard.rejected, (state: AppState, action) => {
                state.isProcessing = false;
                state.textEditorInputContent = '';
            })

            .addCase(actionProcessAction.pending, (state: AppState) => {
                state.isProcessing = true;
            })
            .addCase(actionProcessAction.fulfilled, (state: AppState, action: PayloadAction<string>) => {
                state.isProcessing = false;
                state.textEditorOutputContent = action.payload;
            })
            .addCase(actionProcessAction.rejected, (state: AppState, action) => {
                state.isProcessing = false;
                state.textEditorOutputContent = '';
            })

            .addCase(fetchCurrentModel.pending, (state: AppState) => {
                state.isProcessing = true;
            })
            .addCase(fetchCurrentModel.fulfilled, (state: AppState, action: PayloadAction<string>) => {
                state.isProcessing = false;
                state.currentModelName = action.payload;
            })
            .addCase(fetchCurrentModel.rejected, (state: AppState, action) => {
                state.isProcessing = false;
                state.currentModelName = '';
            })

            .addCase(fetchCurrentSettings.pending, (state: AppState) => {
                // NOTHING
            })
            .addCase(fetchCurrentSettings.fulfilled, (state: AppState, action: PayloadAction<AppSettings>) => {
                state.currentProvider = action.payload.baseUrl;
                state.currentModelName = action.payload.modelName;
            })
            .addCase(fetchCurrentSettings.rejected, (state: AppState, action) => {
                // NOTHING
            })

            .addCase(appStateDefaultInputLanguageGet.pending, (state: AppState) => {
                state.isProcessing = true;
            })
            .addCase(
                appStateDefaultInputLanguageGet.fulfilled,
                (state: AppState, action: PayloadAction<SelectItem>) => {
                    state.isProcessing = false;
                    state.selectedInputLanguage = action.payload;
                },
            )
            .addCase(appStateDefaultInputLanguageGet.rejected, (state: AppState, action) => {
                state.isProcessing = false;
            })

            .addCase(appStateDefaultOutputLanguageGet.pending, (state: AppState) => {
                state.isProcessing = true;
            })
            .addCase(
                appStateDefaultOutputLanguageGet.fulfilled,
                (state: AppState, action: PayloadAction<SelectItem>) => {
                    state.isProcessing = false;
                    state.selectedOutputLanguage = action.payload;
                },
            )
            .addCase(appStateDefaultOutputLanguageGet.rejected, (state: AppState, action) => {
                state.isProcessing = false;
            });
    },
});

export const {
    setInputLanguage,
    setInputContent,
    setOutputContent,
    setOutputLanguage,
    setIsProcessing,
    setCurrentTask,
} = appStateSlice.actions;

// Export the app state slice reducer
export default appStateSlice.reducer;
