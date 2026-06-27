import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import { apperr } from '../../../../wailsjs/go/models';
import { previewPromptForInspector } from './thunks';
import { AboutItemType, AboutSection, AboutState } from './types';

const initialState: AboutState = {
    activeSection: 'guide',
    selectedItemId: null,
    selectedItemType: null,
    inspectorOpen: false,
    inspectorLoading: false,
    inspectorData: null,
    inspectorError: null,
    previewInputEnabled: false,
};

const aboutSlice = createSlice({
    name: 'about',
    initialState,
    reducers: {
        setAboutSection(state, action: PayloadAction<AboutSection>) {
            state.activeSection = action.payload;
        },
        selectAboutItem(state, action: PayloadAction<{ id: string; type: AboutItemType }>) {
            state.selectedItemId = action.payload.id;
            state.selectedItemType = action.payload.type;
            state.inspectorOpen = true;
        },
        clearAboutSelection(state) {
            state.selectedItemId = null;
            state.selectedItemType = null;
            state.inspectorData = null;
            state.inspectorError = null;
            state.inspectorOpen = false;
        },
        togglePreviewInput(state) {
            state.previewInputEnabled = !state.previewInputEnabled;
        },
        setInspectorOpen(state, action: PayloadAction<boolean>) {
            state.inspectorOpen = action.payload;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(previewPromptForInspector.pending, (state) => {
                state.inspectorLoading = true;
                state.inspectorData = null;
                state.inspectorError = null;
            })
            .addCase(previewPromptForInspector.fulfilled, (state, action: PayloadAction<apperr.PromptPreview>) => {
                state.inspectorLoading = false;
                state.inspectorData = action.payload;
                state.inspectorError = null;
            })
            .addCase(previewPromptForInspector.rejected, (state, action) => {
                state.inspectorLoading = false;
                state.inspectorError = action.payload ?? 'Preview failed';
            });
    },
});

export const { setAboutSection, selectAboutItem, clearAboutSelection, togglePreviewInput, setInspectorOpen } = aboutSlice.actions;

export default aboutSlice.reducer;
