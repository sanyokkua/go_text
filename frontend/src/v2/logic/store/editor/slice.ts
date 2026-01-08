import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getLogger } from '../../adapter';
import { EditorState } from './types';

const logger = getLogger('EditorSlice');

// Initial state
const initialState: EditorState = { inputContent: '', outputContent: '' };

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
        clearAll: (state) => {
            logger.logInfo('Clearing all editor content');
            state.inputContent = '';
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
    },
    extraReducers: (builder) => {
        // No async thunks for editor - all updates are synchronous
    },
});

export const { setInputContent, setOutputContent, useOutputAsInput, clearAll, clearInput, clearOutput } = editorSlice.actions;

export default editorSlice.reducer;
