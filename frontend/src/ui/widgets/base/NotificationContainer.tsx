import {Alert, Snackbar} from '@mui/material';
import React from 'react';
import {selectNotificationsQueue, useAppDispatch, useAppSelector} from '../../../logic/store';
import {removeNotification} from '../../../logic/store/notifications';

/**
 * Notification Container - Shows notifications from the Redux store
 * This component should be placed at the top level of the app layout
 */
const NotificationContainer: React.FC = () => {
    const dispatch = useAppDispatch();
    const notifications = useAppSelector(selectNotificationsQueue);

    const handleClose = (id: string) => {
        dispatch(removeNotification(id));
    };

    // Only show the oldest notification (first in queue)
    const currentNotification = notifications[0];

    if (!currentNotification) {
        return null;
    }

    return (
        <Snackbar
            open={true}
            autoHideDuration={6000}
            onClose={() => handleClose(currentNotification.id)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
            sx={{ zIndex: (theme) => theme.zIndex.snackbar }}
        >
            <Alert
                onClose={() => handleClose(currentNotification.id)}
                severity={currentNotification.severity}
                variant="filled"
                sx={{ width: '100%' }}
            >
                {currentNotification.message}
            </Alert>
        </Snackbar>
    );
};

NotificationContainer.displayName = 'NotificationContainer';
export default NotificationContainer;
