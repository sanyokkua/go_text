import React from 'react';
import GlobalLoadingOverlay from './widgets/base/GlobalLoadingOverlay';
import NotificationContainer from './widgets/base/NotificationContainer';
import AppMainView from './widgets/views/AppMainView';

const AppLayout: React.FC = () => {
    return (
        <React.Fragment>
            <AppMainView />
            <GlobalLoadingOverlay />
            <NotificationContainer />
        </React.Fragment>
    );
};

AppLayout.displayName = 'AppLayout';
export default AppLayout;
