import React from 'react';
import { selectNotificationsQueue, useAppDispatch, useAppSelector } from '../../../logic/store';
import { removeNotification } from '../../../logic/store/notifications';

const colorMap: Record<string, string> = { error: 'var(--err)', warning: 'var(--warn)', success: 'var(--ok)', info: 'var(--teal)' };

const NotificationContainer: React.FC = () => {
    const dispatch = useAppDispatch();
    const notifications = useAppSelector(selectNotificationsQueue);
    const current = notifications[0];

    if (!current) {
        return null;
    }

    return (
        <div
            role="alert"
            style={{
                position: 'fixed',
                bottom: 'var(--space-4)',
                right: 'var(--space-4)',
                zIndex: 'var(--z-toast)' as React.CSSProperties['zIndex'],
                background: colorMap[current.severity] ?? 'var(--teal)',
                color: '#fff',
                padding: 'var(--space-3) var(--space-4)',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                boxShadow: 'var(--shadow)',
                maxWidth: 400,
            }}
        >
            <span style={{ flex: 1 }}>{current.message}</span>
            <button
                aria-label="dismiss"
                onClick={() => dispatch(removeNotification(current.id))}
                style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontWeight: 700 }}
            >
                ✕
            </button>
        </div>
    );
};

NotificationContainer.displayName = 'NotificationContainer';
export default NotificationContainer;
