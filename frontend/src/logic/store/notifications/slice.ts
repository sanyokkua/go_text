/**
 * Notifications State Management
 *
 * Handles user notification queue with automatic ID generation.
 * Provides a simple but effective notification system for user feedback.
 *
 * Features:
 * - Auto-generates unique notification IDs
 * - Maintains notification queue for display
 * - Supports different severity levels (success, error, info, warning)
 * - Synchronous operations only - no async thunks needed
 */
import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { getLogger } from '../../adapter';
import { Notification, NotificationsState } from './types';

const logger = getLogger('NotificationsSlice');

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
    },
    extraReducers: () => {},
});

export const { enqueueNotification, removeNotification } = notificationsSlice.actions;

export default notificationsSlice.reducer;
