import React, { useEffect } from 'react';
import { initializeAppState } from '../store/app/app_state_thunks';
import { useAppDispatch } from '../store/hooks';
import { initializeSettingsState } from '../store/settings/settings_thunks';
import AppMainView from './views/AppMainView';

const AppMainController: React.FC = () => {
    const dispatch = useAppDispatch();

    useEffect(() => {
        dispatch(initializeAppState());
        dispatch(initializeSettingsState());
    }, [dispatch]);

    return <AppMainView />;
};
AppMainController.displayName = 'AppMainController';

export default AppMainController;
