import { ThemeProvider } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import React from 'react';
import theme from './theme';
import GlobalLoadingOverlay from './widgets/base/GlobalLoadingOverlay';
import NotificationContainer from './widgets/base/NotificationContainer';
import AppMainView from './widgets/views/AppMainView';

/**
 * App Layout - Root layout component
 *
 * Wraps the entire application with Material-UI theme and provides the main structure.
 * Handles theme provider setup and global component organization.
 *
 * Structure:
 * - ThemeProvider (wraps entire app)
 * - AppMainView (main content)
 * - GlobalLoadingOverlay (busy indicators)
 * - NotificationContainer (user notifications)
 */
const AppLayout: React.FC = () => {
    return (
        <ThemeProvider theme={theme}>
            <React.Fragment>
                <CssBaseline />
                <AppMainView />
                <GlobalLoadingOverlay />
                <NotificationContainer />
            </React.Fragment>
        </ThemeProvider>
    );
};

AppLayout.displayName = 'AppLayout';
export default AppLayout;
