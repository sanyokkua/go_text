import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { ActionIdentifier } from '../../common/types';
import { FrontActions } from '../../service';
import { copyToClipboard, initializeState, pasteFromClipboard, processAction } from './state_thunks';

export interface State {
    actionGroups: { [key: string]: ActionIdentifier[] };
    errorMessage: string;

    // UI Managed
    textEditorInputContent: string;
    textEditorOutputContent: string;

    // Provider and task
    currentTask: string;

    // App State
    isProcessing: boolean;

    // View State
    showSettingsView: boolean;
}

const initialState: State = {
    actionGroups: {},
    errorMessage: '',

    textEditorInputContent: '',
    textEditorOutputContent: '',
    currentTask: '',
    isProcessing: false,
    showSettingsView: false,
};

// Helper function to convert FrontActions to actionGroups
const convertFrontActionsToActionGroups = (frontActions: FrontActions): { [key: string]: ActionIdentifier[] } => {
    const actionGroups: { [key: string]: ActionIdentifier[] } = {};

    frontActions.actionGroups.forEach((group) => {
        actionGroups[group.groupName] = group.groupActions.map((action) => ({ id: action.id, name: action.text }));
    });

    return actionGroups;
};

export const stateSlice = createSlice({
    name: 'state',
    initialState,
    reducers: {
        setTextEditorInputContent: (state: State, action: PayloadAction<string>) => {
            state.textEditorInputContent = action.payload;
            state.errorMessage = '';
        },
        setTextEditorOutputContent: (state: State, action: PayloadAction<string>) => {
            state.textEditorOutputContent = action.payload;
        },
        setCurrentTask: (state: State, action: PayloadAction<string>) => {
            state.currentTask = action.payload;
        },
        setShowSettingsView: (state: State, action: PayloadAction<boolean>) => {
            state.showSettingsView = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(initializeState.pending, (state: State) => {
                state.isProcessing = true;
                state.errorMessage = '';
            })
            .addCase(initializeState.fulfilled, (state: State, action: PayloadAction<{ frontActions: FrontActions }>) => {
                state.isProcessing = false;
                state.actionGroups = convertFrontActionsToActionGroups(action.payload.frontActions);
            })
            .addCase(initializeState.rejected, (state: State, action) => {
                state.isProcessing = false;
                state.errorMessage = action.payload || 'Unknown error occurred during initialization';
            })

            // Process action thunk
            .addCase(processAction.pending, (state: State) => {
                state.isProcessing = true;
                state.errorMessage = '';
            })
            .addCase(processAction.fulfilled, (state: State, action: PayloadAction<string>) => {
                state.isProcessing = false;
                state.textEditorOutputContent = action.payload;
                state.currentTask = '';
            })
            .addCase(processAction.rejected, (state: State, action) => {
                state.isProcessing = false;
                state.errorMessage = action.payload || 'Unknown error occurred during action processing';
                state.currentTask = '';
            })

            // Clipboard operations
            .addCase(copyToClipboard.pending, (state: State) => {
                state.isProcessing = true;
            })
            .addCase(copyToClipboard.fulfilled, (state: State) => {
                state.isProcessing = false;
            })
            .addCase(copyToClipboard.rejected, (state: State, action) => {
                state.isProcessing = false;
                state.errorMessage = action.payload || 'Failed to copy to clipboard';
            })

            .addCase(pasteFromClipboard.pending, (state: State) => {
                state.isProcessing = true;
            })
            .addCase(pasteFromClipboard.fulfilled, (state: State, action: PayloadAction<string>) => {
                state.isProcessing = false;
                state.textEditorInputContent = action.payload;
            })
            .addCase(pasteFromClipboard.rejected, (state: State, action) => {
                state.isProcessing = false;
                state.errorMessage = action.payload || 'Failed to paste from clipboard';
            });
    },
});

export const { setTextEditorInputContent, setTextEditorOutputContent, setCurrentTask, setShowSettingsView } = stateSlice.actions;

// Export the state slice reducer
export default stateSlice.reducer;
