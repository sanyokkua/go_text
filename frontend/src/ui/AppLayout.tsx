import { ThemeProvider } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import React from 'react';
import theme from './theme';
import GlobalLoadingOverlay from './widgets/base/GlobalLoadingOverlay';
import NotificationContainer from './widgets/base/NotificationContainer';
import AppMainView from './widgets/views/AppMainView';

/**
 * App Layout - Root layout component
 * Wraps the entire application with theme and provides the main structure
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
