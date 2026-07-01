/**
 * Editor State Management
 *
 * Manages text editor content and provides content manipulation actions.
 * Handles input/output text states and provides utility functions for content reuse.
 *
 * Features:
 * - Maintains separate input and output text states
 * - Provides content reuse functionality (useOutputAsInput)
 * - Includes content clearing utilities
 * - Synchronous operations only
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getLogger } from '../../adapter';
import { getUIPreferences } from '../settings/thunks';
import { previewTokenEstimate } from './thunks';
import { EditorState } from './types';

const logger = getLogger('EditorSlice');

const initialState: EditorState = { inputContent: '', outputContent: '', viewMode: 'preview', tokenEstimate: null };

const editorSlice = createSlice({
    name: 'editor',
    initialState,
    reducers: {
        setInputContent: (state, action: PayloadAction<string>) => {
            logger.logDebug(`Setting input content (length: ${action.payload.length})`);
            state.inputContent = action.payload;
        },
        setOutputContent: (state, action: PayloadAction<string>) => {
            logger.logDebug(`Setting output content (length: ${action.payload.length})`);
            state.outputContent = action.payload;
        },
        useOutputAsInput: (state) => {
            logger.logInfo('Using output as input');
            state.inputContent = state.outputContent;
            state.outputContent = '';
        },
        clearInput: (state) => {
            logger.logDebug('Clearing input content');
            state.inputContent = '';
        },
        clearOutput: (state) => {
            logger.logDebug('Clearing output content');
            state.outputContent = '';
        },
        setViewMode: (state, action: PayloadAction<import('./types').EditorViewMode>) => {
            state.viewMode = action.payload;
        },
        clearTokenEstimate: (state) => {
            state.tokenEstimate = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(getUIPreferences.fulfilled, (state, action) => {
                state.viewMode = action.payload.viewMode;
            })
            .addCase(previewTokenEstimate.fulfilled, (state, action) => {
                if (action.meta.arg.sampleInput !== state.inputContent) return; // stale response, input changed since request
                state.tokenEstimate = action.payload.groups?.[0]?.estimatedTokens ?? null;
            })
            .addCase(previewTokenEstimate.rejected, (state, action) => {
                if (action.meta.arg.sampleInput !== state.inputContent) return; // stale response, input changed since request
                state.tokenEstimate = null;
            });
    },
});

export const { setInputContent, setOutputContent, useOutputAsInput, clearInput, clearOutput, setViewMode, clearTokenEstimate } = editorSlice.actions;

export default editorSlice.reducer;
