import { createAsyncThunk } from '@reduxjs/toolkit';
import { apperr } from '../../../../wailsjs/go/models';
import { getLogger, HistoryHandlerAdapter, unwrap } from '../../adapter';
import { parseError } from '../../utils/error_utils';
import { ListHistoryArgs, ListHistoryResult } from './types';

const logger = getLogger('HistoryThunks');

export const listHistory = createAsyncThunk<ListHistoryResult, ListHistoryArgs, { rejectValue: string }>(
    'history/listHistory',
    async ({ page, pageSize }, { rejectWithValue }) => {
        try {
            const entries = unwrap(await HistoryHandlerAdapter.listHistory(page, pageSize));
            return { entries, hasMore: entries.length === pageSize };
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`listHistory failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

export const deleteHistoryEntry = createAsyncThunk<string, string, { rejectValue: string }>(
    'history/deleteHistoryEntry',
    async (id, { rejectWithValue }) => {
        try {
            unwrap(await HistoryHandlerAdapter.deleteHistoryEntry(id));
            return id;
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`deleteHistoryEntry failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

export const clearHistory = createAsyncThunk<void, void, { rejectValue: string }>('history/clearHistory', async (_, { rejectWithValue }) => {
    try {
        unwrap(await HistoryHandlerAdapter.clearHistory());
    } catch (error: unknown) {
        const err = parseError(error);
        logger.logError(`clearHistory failed: ${err.message}`);
        return rejectWithValue(err.message);
    }
});

export const getHistoryEntry = createAsyncThunk<apperr.HistoryEntry, string, { rejectValue: string }>(
    'history/getHistoryEntry',
    async (id, { rejectWithValue }) => {
        try {
            const entry = unwrap(await HistoryHandlerAdapter.getHistoryEntry(id));
            if (!entry) {
                throw new Error(`History entry not found: ${id}`);
            }
            return entry;
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`getHistoryEntry failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);
