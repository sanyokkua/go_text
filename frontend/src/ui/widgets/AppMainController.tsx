import React, { useEffect } from 'react';
import { initializeState } from '../../logic/store/state/state_thunks';
import { useAppDispatch } from '../../logic/store/hooks';

import AppMainView from './views/AppMainView';
import { initializeSettingsState } from '../../logic/store/cfg/settings_thunks';

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
