import React from 'react';
import MainContentWidget from './content/MainContentWidget';
import FlexContainer from '../../components/FlexContainer';
import { SettingsView } from './settings';

interface MainContentProps {
    showSettings: boolean;
    onCloseSettings: () => void;
}

/**
 * Main Content - Container for the main content area
 * Contains either the main content or settings view
 */
const MainContent: React.FC<MainContentProps> = ({ showSettings, onCloseSettings }) => {
    return (
        <FlexContainer grow overflowHidden>
            {showSettings ? (
                <SettingsView onClose={onCloseSettings} />
            ) : (
                <MainContentWidget />
            )}
        </FlexContainer>
    );
};

MainContent.displayName = 'MainContent';
export default MainContent;
