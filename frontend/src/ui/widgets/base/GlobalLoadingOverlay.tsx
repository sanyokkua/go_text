import { Box, CircularProgress, Typography } from '@mui/material';
import React from 'react';
import { selectCurrentView, selectIsAppBusy, useAppSelector } from '../../../logic/store';
import { UI_HEIGHTS } from '../../styles/constants';

/**
 * Global Loading Overlay - Shows a loading spinner when the app is busy
 * This component should be placed at the top level of the app layout
 */
const GlobalLoadingOverlay: React.FC = () => {
    const isAppBusy = useAppSelector(selectIsAppBusy);
    const settings = useAppSelector(selectCurrentView);
    const isSettings = settings == 'settings';

    if (!isAppBusy) {
        return null;
    }

    return (
        <Box
            sx={{
                position: 'fixed',
                zIndex: (theme) => theme.zIndex.modal + 1,
                top: UI_HEIGHTS.APP_BAR,
                right: 0,
                bottom: isSettings ? 0 : UI_HEIGHTS.STATUS_BAR,
                left: 0,
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
        </Box>
    );
};

GlobalLoadingOverlay.displayName = 'GlobalLoadingOverlay';
export default GlobalLoadingOverlay;
