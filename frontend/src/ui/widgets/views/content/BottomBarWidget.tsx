import React from 'react';
import { useAppSelector } from '../../../../logic/store/hooks';

const NA = 'N/A';

const BottomBarWidget: React.FC = () => {
    const currentTask = useAppSelector((state) => state.state.currentTask);
    const currentProvider = useAppSelector((state) => state.settingsState.loadedSettingsEditable.currentProviderConfig.providerName);
    const currentModelName = useAppSelector((state) => state.settingsState.loadedSettingsEditable.modelConfig.modelName);

    return (
        <footer className="bottom-bar">
            <p>Provider: {currentProvider || NA}</p>
            <p>Model: {currentModelName || NA}</p>
            <p>Task: {currentTask || NA}</p>
        </footer>
    );
};

BottomBarWidget.displayName = 'BottomBarWidget';
export default BottomBarWidget;
