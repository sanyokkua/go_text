import React from 'react';
import { selectCurrentView, useAppSelector } from '../../../logic/store';
import FlexContainer from '../../components/FlexContainer';
import MainContentWidget from './content/MainContentWidget';
import { SettingsView } from './settings';

/**
 * Main Content - Container for the main content area
 * Contains either the main content or settings view
 */
const MainContent: React.FC = () => {
    const view = useAppSelector(selectCurrentView);
    const showSettings = view === 'settings';

    return (
        <FlexContainer grow overflowHidden>
            {showSettings ? <SettingsView /> : <MainContentWidget />}
        </FlexContainer>
    );
};

MainContent.displayName = 'MainContent';
export default MainContent;
