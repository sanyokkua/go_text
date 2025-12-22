import React from 'react';

import { LogDebug } from '../../../wailsjs/runtime';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { initializeState } from '../../store/state/state_thunks';
import { setShowSettingsView } from '../../store/state/StateReducer';
import BottomBarWidget from './content/BottomBarWidget';
import ContentWidget from './content/ContentWidget';
import TopBarWidget from './content/TopBarWidget';
import SettingsWidget from './settings/SettingsWidget';

const AppMainView: React.FC = () => {
    const dispatch = useAppDispatch();
    const showSettingsView = useAppSelector((state) => state.state.showSettingsView);
    const errorMessage = useAppSelector((state) => state.state.errorMessage);

    const onSettingsClose = () => {
        LogDebug('onSettingsClose clicked');
        dispatch(setShowSettingsView(!showSettingsView));
        dispatch(initializeState());
    };

    const settingsWidget = <SettingsWidget onClose={onSettingsClose} />;
    const contentWidget = <ContentWidget />;
    const content = showSettingsView ? settingsWidget : contentWidget;

    return (
        <div className="app-main-container">
            <TopBarWidget />
            <div className="error-msg">{errorMessage && <p>{errorMessage}</p>}</div>
            {content}
            <BottomBarWidget />
        </div>
    );
};

AppMainView.displayName = 'AppMainView';
export default AppMainView;
