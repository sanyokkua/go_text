import React from 'react';
import { LogDebug } from '../../../../wailsjs/runtime';
import { setShowSettingsView } from '../../../store/app/AppStateReducer';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import Button from '../../base/Button';

const TopBarWidget: React.FC = () => {
    const dispatch = useAppDispatch();
    const showSettingsView = useAppSelector((state) => state.appState.showSettingsView);
    const isProcessing = useAppSelector((state) => state.appState.isProcessing);

    const onSettingsClick = () => {
        LogDebug('Settings clicked');
        dispatch(setShowSettingsView(!showSettingsView));
    };

    return (
        <nav className="app-bar">
            <h3 className="app-bar-title-link">Text Processor</h3>
            <div className="app-bar-spacing-stub" />

            <Button
                text={'Settings'}
                onClick={onSettingsClick}
                variant={'outlined'}
                colorStyle={'white-color'}
                size={'tiny'}
                disabled={isProcessing || showSettingsView}
            />
        </nav>
    );
};
TopBarWidget.displayName = 'TopBarWidget';
export default TopBarWidget;
