import React, { useEffect } from 'react';
import { fetchCurrentSettings } from '../../../store/app/thunks';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';

const BottomBarWidget: React.FC = () => {
    const dispatch = useAppDispatch();
    const { currentTask, currentProvider, currentModelName, errorMessage } = useAppSelector((state) => state.appState);

    useEffect(() => {
        dispatch(fetchCurrentSettings());
    }, [dispatch]);

    return (
        <nav>
            <footer className="bottom-bar">
                <p>Provider: {currentProvider || 'N/A'}</p>
                <p>Model: {currentModelName || 'N/A'}</p>
                <p>Task: {currentTask || 'N/A'}</p>
                <p>Last Error: {errorMessage || 'N/A'}</p>
            </footer>
        </nav>
    );
};

BottomBarWidget.displayName = 'BottomBarWidget';
export default BottomBarWidget;
