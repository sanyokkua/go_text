import { createAsyncThunk } from '@reduxjs/toolkit';
import { ActionHandlerAdapter, ChatCompletionRequest, getLogger, PromptActionRequest, Prompts, ProviderConfig } from '../../adapter';
import { parseError } from '../../utils/error_utils';
import { setOutputContent } from '../editor';
import { AppDispatch } from '../index';
import { parseError } from '../../utils/error_utils';
import { setOutputContent } from '../editor';
import { AppDispatch } from '../index';

const logger = getLogger('ActionsThunks');

// Thunk for getting completion response
export const getCompletionResponse = createAsyncThunk<string, ChatCompletionRequest, { rejectValue: string }>(
    'actions/getCompletionResponse',
    async (chatCompletionRequest: ChatCompletionRequest, { rejectWithValue }) => {
        try {
            logger.logInfo(`Attempting to get completion response for model: ${chatCompletionRequest.model}`);
            const result = await ActionHandlerAdapter.getCompletionResponse(chatCompletionRequest);
            logger.logInfo('Successfully retrieved completion response');
            return result;
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Failed to get completion response: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

// Thunk for getting completion response for specific provider
export const getCompletionResponseForProvider = createAsyncThunk<
    string,
    { providerConfig: ProviderConfig; chatCompletionRequest: ChatCompletionRequest },
    { rejectValue: string }
>(
    'actions/getCompletionResponseForProvider',
    async (
        { providerConfig, chatCompletionRequest }: { providerConfig: ProviderConfig; chatCompletionRequest: ChatCompletionRequest },
        { rejectWithValue },
    ) => {
        try {
            logger.logInfo(
                `Attempting to get completion response for provider: ${providerConfig.providerName}, model: ${chatCompletionRequest.model}`,
            );
            const result = await ActionHandlerAdapter.getCompletionResponseForProvider(providerConfig, chatCompletionRequest);
            logger.logInfo('Successfully retrieved completion response for provider');
            return result;
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Failed to get completion response for provider: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

// Thunk for getting models list
export const getModelsList = createAsyncThunk<Array<string>, void, { rejectValue: string }>(
    'actions/getModelsList',
    async (_, { rejectWithValue }) => {
        try {
            logger.logInfo('Attempting to get models list');
            const result = await ActionHandlerAdapter.getModelsList();
            logger.logInfo(`Successfully retrieved ${result.length} models`);
            return result;
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Failed to get models list: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

// Thunk for getting models list for specific provider
export const getModelsListForProvider = createAsyncThunk<Array<string>, ProviderConfig, { rejectValue: string }>(
    'actions/getModelsListForProvider',
    async (providerConfig: ProviderConfig, { rejectWithValue }) => {
        try {
            logger.logInfo(`Attempting to get models list for provider: ${providerConfig.providerName}`);
            const result = await ActionHandlerAdapter.getModelsListForProvider(providerConfig);
            logger.logInfo(`Successfully retrieved ${result.length} models for provider`);
            return result;
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Failed to get models list for provider: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

// Thunk for getting prompt groups
export const getPromptGroups = createAsyncThunk<Prompts, void, { rejectValue: string }>('actions/getPromptGroups', async (_, { rejectWithValue }) => {
    try {
        logger.logInfo('Attempting to get prompt groups');
        const result = await ActionHandlerAdapter.getPromptGroups();
        const groupCount = Object.keys(result.promptGroups).length;
        logger.logInfo(`Successfully retrieved ${groupCount} prompt groups`);
        return result;
    } catch (error: unknown) {
        const err = parseError(error);
        logger.logError(`Failed to get prompt groups: ${err.message}`);
        return rejectWithValue(err.message);
    }
});

// Thunk for processing prompt
export const processPrompt = createAsyncThunk<string, PromptActionRequest, { rejectValue: string; dispatch: AppDispatch }>(
    'actions/processPrompt',
    async (promptActionRequest: PromptActionRequest, { rejectWithValue, dispatch }) => {
        try {
            logger.logInfo(`Attempting to process prompt: ${promptActionRequest.id}`);
            const result = await ActionHandlerAdapter.processPrompt(promptActionRequest);
            logger.logInfo('Successfully processed prompt');

            // Dispatch the result to the editor slice
            dispatch(setOutputContent(result));

            return result;
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Failed to process prompt: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);
