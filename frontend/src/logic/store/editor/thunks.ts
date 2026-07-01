import { createAsyncThunk } from '@reduxjs/toolkit';

import { apperr } from '../../../../wailsjs/go/models';
import { ActionHandlerAdapter, getLogger, unwrap } from '../../adapter';
import { parseError } from '../../utils/error_utils';
import { AppDispatch, RootState } from '../index';

const logger = getLogger('EditorThunks');

export const previewTokenEstimate = createAsyncThunk<
    apperr.PromptPreview,
    apperr.PromptPreviewRequest,
    { dispatch: AppDispatch; state: RootState; rejectValue: string }
>('editor/previewTokenEstimate', async (req, { rejectWithValue }) => {
    try {
        const preview = unwrap(await ActionHandlerAdapter.previewPrompt(req));
        if (!preview) throw new Error('No preview data');
        return preview;
    } catch (error: unknown) {
        const err = parseError(error);
        logger.logDebug(`previewTokenEstimate failed: ${err.message}`);
        return rejectWithValue(err.message);
    }
});
