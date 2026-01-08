export type Severity = 'success' | 'error' | 'info' | 'warning';

export interface Notification {
    id: string;
    message: string;
    severity: Severity;
}

export interface NotificationsState {
    queue: Notification[];
}
