import { createSlice } from '@reduxjs/toolkit';
import { getLogger } from '../../adapter';
import { loadActionCatalog, loadModels, loadModelsForProvider } from './thunks';
import { ActionsCatalogState } from './types';

const logger = getLogger('ActionsSlice');

const initialState: ActionsCatalogState = { catalog: [], catalogStatus: 'idle', availableModels: [], modelsStatus: 'idle' };

const actionsSlice = createSlice({
    name: 'actions',
    initialState,
    reducers: {},
    extraReducers: (builder) => {
        builder
            .addCase(loadActionCatalog.pending, (state) => {
                state.catalogStatus = 'loading';
            })
            .addCase(loadActionCatalog.fulfilled, (state, action) => {
                logger.logInfo(`Catalog loaded: ${action.payload.length} actions`);
                state.catalog = action.payload;
                state.catalogStatus = 'success';
            })
            .addCase(loadActionCatalog.rejected, (state) => {
                state.catalogStatus = 'error';
            })
            .addCase(loadModels.pending, (state) => {
                state.modelsStatus = 'loading';
            })
            .addCase(loadModels.fulfilled, (state, action) => {
                logger.logInfo(`Models loaded: ${action.payload.length}`);
                state.availableModels = action.payload;
                state.modelsStatus = 'success';
            })
            .addCase(loadModels.rejected, (state) => {
                state.modelsStatus = 'error';
            })
            .addCase(loadModelsForProvider.pending, (state) => {
                state.modelsStatus = 'loading';
            })
            .addCase(loadModelsForProvider.fulfilled, (state, action) => {
                state.availableModels = action.payload;
                state.modelsStatus = 'success';
            })
            .addCase(loadModelsForProvider.rejected, (state) => {
                state.modelsStatus = 'error';
            });
    },
});

export default actionsSlice.reducer;
