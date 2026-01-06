import { ThemeProvider } from '@mui/material';
import CssBaseline from '@mui/material/CssBaseline';
import React from 'react';
import theme from './theme';
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
            </React.Fragment>
        </ThemeProvider>
    );
};

AppLayout.displayName = 'AppLayout';
export default AppLayout;
