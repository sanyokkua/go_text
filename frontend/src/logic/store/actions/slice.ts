/**
 * Actions State Management
 *
 * Manages prompt groups and available models for AI actions.
 * Handles loading and caching of action-related data from the backend.
 *
 * Key Features:
 * - Caches prompt groups for quick access
 * - Maintains list of available models for provider selection
 * - Handles model list updates when switching providers
 */
import { createSlice } from '@reduxjs/toolkit';
import { getLogger } from '../../adapter';
import { getModelsList, getModelsListForProvider, getPromptGroups } from './thunks';
import { ActionsState } from './types';

const logger = getLogger('ActionsSlice');

const initialState: ActionsState = { promptGroups: null, availableModels: [] };

const actionsSlice = createSlice({
    name: 'actions',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(getPromptGroups.fulfilled, (state, action) => {
                logger.logInfo(`Prompt groups loaded successfully (${Object.keys(action.payload.promptGroups).length} groups)`);
                state.promptGroups = action.payload;
            })
            .addCase(getModelsList.fulfilled, (state, action) => {
                logger.logInfo(`Models list loaded successfully (${action.payload.length} models)`);
                state.availableModels = action.payload;
            })
            .addCase(getModelsListForProvider.fulfilled, (state, action) => {
                // Update models when switching providers - maintains provider-specific model lists
                state.availableModels = action.payload;
            });
    },
});

export default actionsSlice.reducer;
