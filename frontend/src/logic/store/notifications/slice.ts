import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getLogger } from '../../adapter';
import { Notification, NotificationsState } from './types';

const logger = getLogger('NotificationsSlice');

// Initial state
const initialState: NotificationsState = { queue: [] };

const notificationsSlice = createSlice({
    name: 'notifications',
    initialState,
    reducers: {
        enqueueNotification: (state, action: PayloadAction<Omit<Notification, 'id'>>) => {
            const id = Math.random().toString(36).substring(2, 9);
            logger.logInfo(`Enqueuing ${action.payload.severity} notification: ${action.payload.message}`);
            state.queue.push({ id, ...action.payload });
        },
        removeNotification: (state, action: PayloadAction<string>) => {
            logger.logDebug(`Removing notification with id: ${action.payload}`);
            state.queue = state.queue.filter((notification) => notification.id !== action.payload);
        },
        clearQueue: (state) => {
            logger.logInfo(`Clearing notification queue (${state.queue.length} notifications)`);
            state.queue = [];
        },
    },
    extraReducers: () => {
        // No async thunks for notifications - all updates are synchronous
    },
});

export const { enqueueNotification, removeNotification, clearQueue } = notificationsSlice.actions;

export default notificationsSlice.reducer;
