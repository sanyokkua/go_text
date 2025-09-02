import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { AppSettings } from '../../common/types';
import { SelectItem } from '../../widgets/base/Select';
import { TabContentBtn } from '../../widgets/tabs/common/TabButtonsWidget';
import {
    fetchCurrentModel,
    fetchCurrentSettings,
    fetchFormattingButtons,
    fetchInputLanguages,
    fetchOutputLanguages,
    fetchProofreadingButtons,
    fetchSummaryButtons,
    fetchTranslateButtons,
    processCopyToClipboard,
    processOperation,
    processPasteFromClipboard,
} from './thunks';

export interface AppState {
    proofreadingButtons: TabContentBtn[];
    formattingButtons: TabContentBtn[];
    translateButtons: TabContentBtn[];
    summaryButtons: TabContentBtn[];

    inputContent: string;
    outputContent: string;

    inputLanguage: SelectItem;
    outputLanguage: SelectItem;

    inputLanguages: SelectItem[];
    outputLanguages: SelectItem[];

    currentProvider: string;
    currentTask: string;
    currentModelName: string;

    isProcessing: boolean;
}

const initialState: AppState = {
    proofreadingButtons: [],
    formattingButtons: [],
    translateButtons: [],
    summaryButtons: [],
    inputContent: '',
    outputContent: '',
    inputLanguage: { itemId: '', displayText: '' },
    outputLanguage: { itemId: '', displayText: '' },
    inputLanguages: [],
    outputLanguages: [],
    currentTask: '',
    currentProvider: '',
    currentModelName: '',
    isProcessing: false,
};

export const appStateSlice = createSlice({
    name: 'appState',
    initialState,
    reducers: {
        setInputContent: (state: AppState, action: PayloadAction<string>) => {
            state.inputContent = action.payload;
        },
        setOutputContent: (state: AppState, action: PayloadAction<string>) => {
            state.outputContent = action.payload;
        },
        setInputLanguage: (state: AppState, action: PayloadAction<SelectItem>) => {
            state.inputLanguage = action.payload;
        },
        setOutputLanguage: (state: AppState, action: PayloadAction<SelectItem>) => {
            state.outputLanguage = action.payload;
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
            .addCase(fetchInputLanguages.pending, (state: AppState) => {
                state.isProcessing = true;
            })
            .addCase(fetchInputLanguages.fulfilled, (state: AppState, action: PayloadAction<SelectItem[]>) => {
                state.isProcessing = false;
                state.inputLanguages = action.payload;
            })
            .addCase(fetchInputLanguages.rejected, (state: AppState, action) => {
                state.isProcessing = false;
                state.inputLanguages = [];
            })
            .addCase(fetchOutputLanguages.pending, (state: AppState) => {
                state.isProcessing = true;
            })
            .addCase(fetchOutputLanguages.fulfilled, (state: AppState, action: PayloadAction<SelectItem[]>) => {
                state.isProcessing = false;
                state.outputLanguages = action.payload;
            })
            .addCase(fetchOutputLanguages.rejected, (state: AppState, action) => {
                state.isProcessing = false;
                state.outputLanguages = [];
            })

            .addCase(fetchProofreadingButtons.pending, (state: AppState) => {
                state.isProcessing = true;
            })
            .addCase(fetchProofreadingButtons.fulfilled, (state: AppState, action: PayloadAction<TabContentBtn[]>) => {
                state.isProcessing = false;
                state.proofreadingButtons = action.payload;
            })
            .addCase(fetchProofreadingButtons.rejected, (state: AppState, action) => {
                state.isProcessing = false;
                state.proofreadingButtons = [];
            })

            .addCase(fetchFormattingButtons.pending, (state: AppState) => {
                state.isProcessing = true;
            })
            .addCase(fetchFormattingButtons.fulfilled, (state: AppState, action: PayloadAction<TabContentBtn[]>) => {
                state.isProcessing = false;
                state.formattingButtons = action.payload;
            })
            .addCase(fetchFormattingButtons.rejected, (state: AppState, action) => {
                state.isProcessing = false;
                state.formattingButtons = [];
            })

            .addCase(fetchTranslateButtons.pending, (state: AppState) => {
                state.isProcessing = true;
            })
            .addCase(fetchTranslateButtons.fulfilled, (state: AppState, action: PayloadAction<TabContentBtn[]>) => {
                state.isProcessing = false;
                state.translateButtons = action.payload;
            })
            .addCase(fetchTranslateButtons.rejected, (state: AppState, action) => {
                state.isProcessing = false;
                state.translateButtons = [];
            })

            .addCase(fetchSummaryButtons.pending, (state: AppState) => {
                state.isProcessing = true;
            })
            .addCase(fetchSummaryButtons.fulfilled, (state: AppState, action: PayloadAction<TabContentBtn[]>) => {
                state.isProcessing = false;
                state.summaryButtons = action.payload;
            })
            .addCase(fetchSummaryButtons.rejected, (state: AppState, action) => {
                state.isProcessing = false;
                state.summaryButtons = [];
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
                state.inputContent = action.payload;
            })
            .addCase(processPasteFromClipboard.rejected, (state: AppState, action) => {
                state.isProcessing = false;
                state.inputContent = '';
            })

            .addCase(processOperation.pending, (state: AppState) => {
                state.isProcessing = true;
            })
            .addCase(processOperation.fulfilled, (state: AppState, action: PayloadAction<string>) => {
                state.isProcessing = false;
                state.outputContent = action.payload;
            })
            .addCase(processOperation.rejected, (state: AppState, action) => {
                state.isProcessing = false;
                state.outputContent = '';
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
            }); //fetchCurrentModel
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
