import React from 'react';
import { TooltipProvider } from './primitives/Tooltip';
import GlobalLoadingOverlay from './widgets/base/GlobalLoadingOverlay';
import NotificationContainer from './widgets/base/NotificationContainer';
import AppMainView from './widgets/views/AppMainView';

const AppLayout: React.FC = () => {
    return (
        <TooltipProvider>
            <AppMainView />
            <GlobalLoadingOverlay />
            <NotificationContainer />
        </TooltipProvider>
    );
};

AppLayout.displayName = 'AppLayout';
export default AppLayout;
