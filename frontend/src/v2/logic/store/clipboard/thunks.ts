import { createAsyncThunk } from '@reduxjs/toolkit';
import { ClipboardServiceAdapter, getLogger } from '../../adapter';
import { parseError } from '../../utils/error_utils';

const logger = getLogger('ClipboardThunks');

// Thunk for getting clipboard text
export const getClipboardText = createAsyncThunk<string, void, { rejectValue: string }>('clipboard/getText', async (_, { rejectWithValue }) => {
    try {
        logger.logInfo('Attempting to get clipboard text');
        const result = await ClipboardServiceAdapter.getText();
        logger.logInfo('Successfully retrieved clipboard text');
        return result;
    } catch (error: unknown) {
        const err = parseError(error);
        logger.logError(`Failed to get clipboard text: ${err.message}`);
        return rejectWithValue(err.message);
    }
});

// Thunk for setting clipboard text
export const setClipboardText = createAsyncThunk<boolean, string, { rejectValue: string }>(
    'clipboard/setText',
    async (text: string, { rejectWithValue }) => {
        try {
            logger.logInfo(`Attempting to set clipboard text with length: ${text.length}`);
            const result = await ClipboardServiceAdapter.setText(text);
            logger.logInfo(`Successfully set clipboard text, result: ${result}`);
            return result;
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Failed to set clipboard text: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);
