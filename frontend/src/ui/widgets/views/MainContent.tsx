import React from 'react';
import { useAppSelector } from '../../../logic/store';
import FlexContainer from '../../components/FlexContainer';
import MainContentWidget from './content/MainContentWidget';
import { SettingsView } from './settings';

/**
 * Main Content - Container for the main content area
 * Contains either the main content or settings view
 */
const MainContent: React.FC = () => {
    const view = useAppSelector((state) => state.ui.view);
    const showSettings = view === 'settings';

    return (
        <FlexContainer grow overflowHidden>
            {showSettings ? <SettingsView /> : <MainContentWidget />}
        </FlexContainer>
    );
};

MainContent.displayName = 'MainContent';
export default MainContent;
