import { RootState } from '../index';
import { Notification } from './types';

// Basic selectors
export const selectNotificationsQueue = (state: RootState): Notification[] => state.notifications.queue;

export const selectHasNotifications = (state: RootState): boolean => state.notifications.queue.length > 0;

// Derived selectors
export const selectErrorNotifications = (state: RootState): Notification[] => state.notifications.queue.filter((n) => n.severity === 'error');

export const selectSuccessNotifications = (state: RootState): Notification[] => state.notifications.queue.filter((n) => n.severity === 'success');

export const selectInfoNotifications = (state: RootState): Notification[] => state.notifications.queue.filter((n) => n.severity === 'info');

export const selectWarningNotifications = (state: RootState): Notification[] => state.notifications.queue.filter((n) => n.severity === 'warning');

export const selectLatestNotification = (state: RootState): Notification | null =>
    state.notifications.queue.length > 0 ? state.notifications.queue[state.notifications.queue.length - 1] : null;
