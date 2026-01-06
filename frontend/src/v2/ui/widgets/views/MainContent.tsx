import React from 'react';
import MainContentWidget from './content/MainContentWidget';
import FlexContainer from '../../components/FlexContainer';

/**
 * Main Content - Container for the main content area
 * Contains the Input/Output panels and Actions panel
 */
const MainContent: React.FC = () => {
    return (
        <FlexContainer grow overflowHidden>
            <MainContentWidget />
        </FlexContainer>
    );
};

MainContent.displayName = 'MainContent';
export default MainContent;
