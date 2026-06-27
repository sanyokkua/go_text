// frontend/src/ui/widgets/base/NotificationContainer.tsx
import React from 'react';
import { ToastProvider, ToastRegion } from '../../primitives/Toast';
import type { ToastItem, ToastVariant } from '../../primitives/Toast';
import { selectNotificationsQueue, useAppDispatch, useAppSelector } from '../../../logic/store';
import { removeNotification } from '../../../logic/store/notifications';
import type { Severity } from '../../../logic/store/notifications/types';

const SEVERITY_TO_VARIANT: Record<Severity, ToastVariant> = {
    success: 'success',
    error: 'error',
    warning: 'warning',
    info: 'info',
};

const LONG_DURATION_MS = 7000;

const NotificationContainer: React.FC = () => {
    const dispatch = useAppDispatch();
    const queue = useAppSelector(selectNotificationsQueue);

    const toastItems: ToastItem[] = queue
        .filter((n) => n.surface !== 'inline')
        .map((n): ToastItem => ({
            id: n.id,
            variant: SEVERITY_TO_VARIANT[n.severity],
            ...(n.title === undefined ? {} : { title: n.title }),
            message: n.message,
            duration: n.severity === 'warning' || n.severity === 'info' ? LONG_DURATION_MS : 5000,
        }));

    return (
        <ToastProvider>
            <ToastRegion items={toastItems} onDismiss={(id) => dispatch(removeNotification(id))} />
        </ToastProvider>
    );
};

NotificationContainer.displayName = 'NotificationContainer';
export default NotificationContainer;
