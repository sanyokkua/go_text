import { createSlice } from '@reduxjs/toolkit';
import { getLogger } from '../../adapter';
import { getModelsList, getModelsListForProvider, getPromptGroups } from './thunks';
import { ActionsState } from './types';

const logger = getLogger('ActionsSlice');

// Initial state
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
                state.availableModels = action.payload;
            });
    },
});

export default actionsSlice.reducer;
