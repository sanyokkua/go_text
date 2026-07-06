import { createAsyncThunk } from '@reduxjs/toolkit';
import { apperr } from '../../../../../wailsjs/go/models';
import { getLogger, StackHandlerAdapter, unwrap } from '../../../adapter';
import { parseError } from '../../../utils/error_utils';

const logger = getLogger('StacksSavedThunks');

export const listStacks = createAsyncThunk<apperr.SavedStack[], void, { rejectValue: string }>(
    'stacksSaved/listStacks',
    async (_, { rejectWithValue }) => {
        try {
            return unwrap(await StackHandlerAdapter.listStacks()) ?? [];
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`listStacks failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

export const createStack = createAsyncThunk<apperr.SavedStack, apperr.SavedStack, { rejectValue: string }>(
    'stacksSaved/createStack',
    async (stack, { rejectWithValue }) => {
        try {
            const result = unwrap(await StackHandlerAdapter.createStack(stack));
            if (!result) throw new Error('No stack returned from createStack');
            return result;
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`createStack failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

export const deleteStack = createAsyncThunk<string, string, { rejectValue: string }>('stacksSaved/deleteStack', async (id, { rejectWithValue }) => {
    try {
        unwrap(await StackHandlerAdapter.deleteStack(id));
        return id;
    } catch (error: unknown) {
        const err = parseError(error);
        logger.logError(`deleteStack failed: ${err.message}`);
        return rejectWithValue(err.message);
    }
});

export const duplicateStack = createAsyncThunk<apperr.SavedStack, { id: string; newName: string }, { rejectValue: string }>(
    'stacksSaved/duplicateStack',
    async ({ id, newName }, { rejectWithValue }) => {
        try {
            const result = unwrap(await StackHandlerAdapter.duplicateStack(id, newName));
            if (!result) throw new Error('No stack returned from duplicateStack');
            return result;
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`duplicateStack failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

export const updateStack = createAsyncThunk<apperr.SavedStack, apperr.SavedStack, { rejectValue: string }>(
    'stacksSaved/updateStack',
    async (stack, { rejectWithValue }) => {
        try {
            const result = unwrap(await StackHandlerAdapter.updateStack(stack));
            if (!result) throw new Error('No stack returned from updateStack');
            return result;
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`updateStack failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);
