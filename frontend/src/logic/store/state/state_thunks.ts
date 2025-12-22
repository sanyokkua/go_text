import { createAsyncThunk } from '@reduxjs/toolkit';
import { ActionService, ClipboardService, FrontActionRequest, FrontActions, LoggerServiceInstance as log, parseError } from '../../service';
import { AppDispatch } from '../store';
import { setCurrentTask } from './StateReducer';

export const initializeState = createAsyncThunk<{ frontActions: FrontActions }, void, { rejectValue: string }>(
    'state/initializeState',
    async (_, { rejectWithValue }) => {
        try {
            // Get all action groups in one call
            const frontActions = await ActionService.getActionGroups();

            return { frontActions };
        } catch (error: unknown) {
            const msg = parseError(error);
            log.warning('Failed state/initializeState with error: ' + msg.originalError);
            return rejectWithValue(msg.message);
        }
    },
);

export const processAction = createAsyncThunk<string, FrontActionRequest, { dispatch: AppDispatch; rejectValue: string }>(
    'state/processAction',
    async (actionRequest, { dispatch, rejectWithValue }) => {
        try {
            dispatch(setCurrentTask(actionRequest.id));
            return await ActionService.processAction(actionRequest);
        } catch (error: unknown) {
            const msg = parseError(error);
            log.warning('Failed state/processAction with error: ' + msg.originalError);
            return rejectWithValue(msg.message);
        }
    },
);

export const copyToClipboard = createAsyncThunk<void, string, { rejectValue: string }>(
    'state/copyToClipboard',
    async (textToCopy: string, { rejectWithValue }) => {
        try {
            await ClipboardService.clipboardSetText(textToCopy);
        } catch (error: unknown) {
            const msg = parseError(error);
            log.warning('Failed state/copyToClipboard with error: ' + msg.originalError);
            return rejectWithValue(msg.message);
        }
    },
);

export const pasteFromClipboard = createAsyncThunk<string, void, { rejectValue: string }>(
    'state/pasteFromClipboard',
    async (_, { rejectWithValue }) => {
        try {
            return await ClipboardService.clipboardGetText();
        } catch (error: unknown) {
            const msg = parseError(error);
            log.warning('Failed state/pasteFromClipboard with error: ' + msg.originalError);
            return rejectWithValue(msg.message);
        }
    },
);
