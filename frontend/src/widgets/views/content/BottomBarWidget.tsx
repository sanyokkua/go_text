import React from 'react';
import { useAppSelector } from '../../../store/hooks';

const NA = 'N/A';

const BottomBarWidget: React.FC = () => {
    const currentTask = useAppSelector((state) => state.appState.currentTask);
    const currentProvider = useAppSelector((state) => state.settingsState.loadedSettingsEditable.currentProviderConfig.providerName);
    const currentModelName = useAppSelector((state) => state.settingsState.loadedSettingsEditable.modelConfig.modelName);

    return (
        <nav>
            <footer className="bottom-bar">
                <p>Provider: {currentProvider || NA}</p>
                <p>Model: {currentModelName || NA}</p>
                <p>Task: {currentTask || NA}</p>
            </footer>
        </nav>
    );
};

BottomBarWidget.displayName = 'BottomBarWidget';
export default BottomBarWidget;
