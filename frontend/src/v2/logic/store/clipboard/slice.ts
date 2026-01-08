import { createSlice } from '@reduxjs/toolkit';
import { getLogger } from '../../adapter';
import { getClipboardText, setClipboardText } from './thunks';
import { ClipboardState } from './types';

const logger = getLogger('ClipboardSlice');

// Initial state
const initialState: ClipboardState = { loading: false, lastActionSuccess: null, error: null };

const clipboardSlice = createSlice({
    name: 'clipboard',
    initialState,
    reducers: {
        // Synchronous reducers can be added here if needed
        clearError: (state) => {
            state.error = null;
        },
        resetClipboardState: (state) => {
            state.loading = false;
            state.lastActionSuccess = null;
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(getClipboardText.pending, (state) => {
                logger.logInfo('Getting clipboard text...');
                state.loading = true;
                state.error = null;
            })
            .addCase(getClipboardText.fulfilled, (state) => {
                logger.logInfo('Clipboard text retrieved successfully');
                state.loading = false;
                state.lastActionSuccess = true;
                state.error = null;
            })
            .addCase(getClipboardText.rejected, (state, action) => {
                logger.logError(`Failed to get clipboard text: ${action.payload || 'Unknown error'}`);
                state.loading = false;
                state.lastActionSuccess = false;
                state.error = action.payload || 'Failed to get clipboard text';
            })

            .addCase(setClipboardText.pending, (state) => {
                logger.logInfo('Setting clipboard text...');
                state.loading = true;
                state.error = null;
            })
            .addCase(setClipboardText.fulfilled, (state, action) => {
                logger.logInfo(`Clipboard text set successfully (success: ${action.payload})`);
                state.loading = false;
                state.lastActionSuccess = action.payload;
                state.error = null;
            })
            .addCase(setClipboardText.rejected, (state, action) => {
                logger.logError(`Failed to set clipboard text: ${action.payload || 'Unknown error'}`);
                state.loading = false;
                state.lastActionSuccess = false;
                state.error = action.payload || 'Failed to set clipboard text';
            });
    },
});

export const { clearError, resetClipboardState } = clipboardSlice.actions;
export default clipboardSlice.reducer;
