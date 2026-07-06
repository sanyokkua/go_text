import { createAsyncThunk } from '@reduxjs/toolkit';

import { apperr } from '../../../../wailsjs/go/models';
import { ActionHandlerAdapter, getLogger, getSuggestedStacks, unwrap } from '../../adapter';
import { parseError } from '../../utils/error_utils';
import { AppDispatch, RootState } from '../index';

const logger = getLogger('AboutThunks');

export const previewPromptForInspector = createAsyncThunk<
    apperr.PromptPreview,
    apperr.PromptPreviewRequest,
    { dispatch: AppDispatch; state: RootState; rejectValue: string }
>('about/previewPromptForInspector', async (req, { rejectWithValue }) => {
    try {
        const preview = unwrap(await ActionHandlerAdapter.previewPrompt(req));
        if (!preview) throw new Error('No preview data');
        return preview;
    } catch (error: unknown) {
        const err = parseError(error);
        logger.logError(`previewPromptForInspector failed: ${err.message}`);
        return rejectWithValue(err.message);
    }
});

export const fetchSuggestedStacks = createAsyncThunk<apperr.SuggestedStack[], void, { dispatch: AppDispatch; state: RootState; rejectValue: string }>(
    'about/fetchSuggestedStacks',
    async (_, { rejectWithValue }) => {
        try {
            return await getSuggestedStacks();
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`fetchSuggestedStacks failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);
