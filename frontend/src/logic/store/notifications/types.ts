export type Severity = 'success' | 'error' | 'info' | 'warning';
export type NotificationSurface = 'toast' | 'inline';

export interface Notification {
    id: string;
    severity: Severity;
    message: string;
    title?: string;
    details?: Record<string, string>;
    surface?: NotificationSurface;
}

export interface NotificationsState {
    queue: Notification[];
}
