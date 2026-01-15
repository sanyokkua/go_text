import { RootState } from '../index';
import { Notification } from './types';

export const selectNotificationsQueue = (state: RootState): Notification[] => state.notifications.queue;
