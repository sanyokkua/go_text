import React, { useEffect } from 'react';
import { initializeState } from '../store/state/state_thunks';
import { useAppDispatch } from '../store/hooks';

import AppMainView from './views/AppMainView';
import { initializeSettingsState } from '../store/cfg/settings_thunks';

const AppMainController: React.FC = () => {
    const dispatch = useAppDispatch();

    useEffect(() => {
        dispatch(initializeState());
        dispatch(initializeSettingsState());
    }, [dispatch]);

    return <AppMainView />;
};
AppMainController.displayName = 'AppMainController';

export default AppMainController;
