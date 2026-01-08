import { createSlice } from '@reduxjs/toolkit';
import { getLogger } from '../../adapter';
import {
    getCompletionResponse,
    getCompletionResponseForProvider,
    getModelsList,
    getModelsListForProvider,
    getPromptGroups,
    processPrompt,
} from './thunks';
import { ActionsState } from './types';

const logger = getLogger('ActionsSlice');

// Initial state
const initialState: ActionsState = { promptGroups: null, availableModels: [], loading: false, error: null };

const actionsSlice = createSlice({
    name: 'actions',
    initialState,
    reducers: {
        // Synchronous reducers can be added here if needed
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(getPromptGroups.fulfilled, (state, action) => {
                logger.logInfo(`Prompt groups loaded successfully (${Object.keys(action.payload.promptGroups).length} groups)`);
                state.promptGroups = action.payload;
                state.loading = false;
                state.error = null;
            })
            .addCase(getModelsList.fulfilled, (state, action) => {
                logger.logInfo(`Models list loaded successfully (${action.payload.length} models)`);
                state.availableModels = action.payload;
                state.loading = false;
                state.error = null;
            })
            .addCase(processPrompt.pending, (state) => {
                logger.logInfo('Processing prompt...');
                state.loading = true;
                state.error = null;
            })
            .addCase(processPrompt.fulfilled, (state) => {
                logger.logInfo('Prompt processed successfully');
                state.loading = false;
                state.error = null;
            })
            .addCase(processPrompt.rejected, (state, action) => {
                logger.logError(`Failed to process prompt: ${action.payload || 'Unknown error'}`);
                state.loading = false;
                state.error = action.payload || 'Failed to process prompt';
            })

            // Handle other thunks for completeness
            .addCase(getCompletionResponse.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getCompletionResponse.fulfilled, (state) => {
                state.loading = false;
                state.error = null;
            })
            .addCase(getCompletionResponse.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || 'Failed to get completion response';
            })

            .addCase(getCompletionResponseForProvider.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getCompletionResponseForProvider.fulfilled, (state) => {
                state.loading = false;
                state.error = null;
            })
            .addCase(getCompletionResponseForProvider.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || 'Failed to get completion response for provider';
            })

            .addCase(getModelsListForProvider.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(getModelsListForProvider.fulfilled, (state, action) => {
                state.availableModels = action.payload;
                state.loading = false;
                state.error = null;
            })
            .addCase(getModelsListForProvider.rejected, (state, action) => {
                state.loading = false;
                state.error = action.payload || 'Failed to get models list for provider';
            });
    },
});

export const { clearError } = actionsSlice.actions;
export default actionsSlice.reducer;
