import React from 'react';
import { useAppSelector } from '../../../store/hooks';

const NA = 'N/A';

const BottomBarWidget: React.FC = () => {
    const currentTask = useAppSelector((state) => state.appState.currentTask);
    const currentProvider = useAppSelector((state) => state.appState.currentProvider);
    const currentModelName = useAppSelector((state) => state.appState.currentModelName);
    const errorMessage = useAppSelector((state) => state.appState.errorMessage);

    return (
        <nav>
            <footer className="bottom-bar">
                <p>Provider: {currentProvider || NA}</p>
                <p>Model: {currentModelName || NA}</p>
                <p>Task: {currentTask || NA}</p>
                <p>Last Error: {errorMessage || NA}</p>
            </footer>
        </nav>
    );
};

BottomBarWidget.displayName = 'BottomBarWidget';
export default BottomBarWidget;
