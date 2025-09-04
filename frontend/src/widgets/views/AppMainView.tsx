import React from 'react';

import { LogDebug } from '../../../wailsjs/runtime';
import { initializeAppState } from '../../store/app/app_state_thunks';
import { setShowSettingsView } from '../../store/app/AppStateReducer';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import BottomBarWidget from './content/BottomBarWidget';
import ContentWidget from './content/ContentWidget';
import TopBarWidget from './content/TopBarWidget';
import SettingsWidget from './settings/SettingsWidget';

const AppMainView: React.FC = () => {
    const dispatch = useAppDispatch();
    const showSettingsView = useAppSelector((state) => state.appState.showSettingsView);

    const onSettingsClose = () => {
        LogDebug('onSettingsClose clicked');
        dispatch(setShowSettingsView(!showSettingsView));
        dispatch(initializeAppState());
    };

    const settingsWidget = <SettingsWidget onClose={onSettingsClose} />;
    const contentWidget = <ContentWidget />;
    const content = showSettingsView ? settingsWidget : contentWidget;

    return (
        <div className="app-main-container">
            <TopBarWidget />
            {content}
            <BottomBarWidget />
        </div>
    );
};

AppMainView.displayName = 'AppMainView';
export default AppMainView;
