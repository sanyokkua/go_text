import { createAsyncThunk } from '@reduxjs/toolkit';
import { apperr } from '../../../../wailsjs/go/models';
import { ActionHandlerAdapter, getLogger, tryUnwrap, unwrap } from '../../adapter';
import { parseError } from '../../utils/error_utils';
import { setOutputContent } from '../editor/slice';
import { AppDispatch } from '../index';

const logger = getLogger('RunThunks');

export const processPromptChain = createAsyncThunk<
    apperr.ChainResultEnv,
    apperr.ChainRequest,
    { rejectValue: string; dispatch: AppDispatch }
>('run/processPromptChain', async (req, { rejectWithValue, dispatch }) => {
    try {
        logger.logInfo(`Starting chain run: ${req.runId}`);
        const result = await ActionHandlerAdapter.processPromptChain(req);
        tryUnwrap(result); // dispatch WireError notification if present (partial or error)
        if (result.data?.finalText) {
            dispatch(setOutputContent(result.data.finalText));
        }
        return result;
    } catch (error: unknown) {
        const err = parseError(error);
        logger.logError(`processPromptChain failed: ${err.message}`);
        return rejectWithValue(err.message);
    }
});

export const cancelChain = createAsyncThunk<void, string, { rejectValue: string }>(
    'run/cancelChain',
    async (runId, { rejectWithValue }) => {
        try {
            logger.logInfo(`Cancelling chain run: ${runId}`);
            unwrap(await ActionHandlerAdapter.cancelChain(runId));
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`cancelChain failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

interface RunSingleActionArgs {
    actionId: string;
    inputText: string;
    settings: apperr.Settings | null;
}

export const runSingleAction = createAsyncThunk<
    void,
    RunSingleActionArgs,
    { rejectValue: string; dispatch: AppDispatch }
>('run/runSingleAction', async ({ actionId, inputText, settings }, { dispatch, rejectWithValue }) => {
    try {
        const req = new apperr.ChainRequest({
            runId: crypto.randomUUID(),
            inputText,
            steps: [new apperr.ChainStep({ actionId })],
            inputLanguageId: settings?.languageConfig?.defaultInputLanguage ?? 'auto',
            outputLanguageId: settings?.languageConfig?.defaultOutputLanguage ?? 'auto',
            useMarkdown: settings?.inferenceBaseConfig?.useMarkdownForOutput ?? false,
        });
        await dispatch(processPromptChain(req)).unwrap();
    } catch (error: unknown) {
        const err = parseError(error);
        return rejectWithValue(err.message);
    }
});
