import { Backdrop, CircularProgress, Typography } from '@mui/material';
import React from 'react';
import { useAppSelector } from '../../../logic/store';

/**
 * Global Loading Overlay - Shows a loading spinner when the app is busy
 * This component should be placed at the top level of the app layout
 */
const GlobalLoadingOverlay: React.FC = () => {
    const isAppBusy = useAppSelector((state) => state.ui.isAppBusy);

    if (!isAppBusy) {
        return null;
    }

    return (
        <Backdrop
            open={isAppBusy}
            sx={{
                position: 'fixed',
                zIndex: (theme) => theme.zIndex.modal + 1,
                backgroundColor: 'rgba(0, 0, 0, 0.1)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
            }}
        >
            <CircularProgress size={60} thickness={4} color="primary" />
            <Typography variant="h6" color="text.primary" sx={{ mt: 2 }}>
                Processing...
            </Typography>
        </Backdrop>
    );
};

GlobalLoadingOverlay.displayName = 'GlobalLoadingOverlay';
export default GlobalLoadingOverlay;
