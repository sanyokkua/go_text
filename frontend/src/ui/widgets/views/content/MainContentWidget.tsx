import { Box } from '@mui/material';
import React from 'react';
import FlexContainer from '../../../components/FlexContainer';
import { HEIGHT_UTILS, UI_HEIGHTS } from '../../../styles/constants';
import ActionsPanel from './actions/ActionsPanel';
import InputOutputContainer from './editor/InputOutputContainer';

/**
 * Main Content Widget - replaces the v1 ContentWidget
 * Contains two horizontal sections:
 * 1. Input/Output container (top) - takes most space
 * 2. Actions panel (bottom) - fixed height
 */
const MainContentWidget: React.FC = () => {
    return (
        <Box component="main" sx={{ width: '100%', height: '100%', padding: 0 }}>
            {/* Input/Output Container Section - takes most space */}
            <FlexContainer overflowHidden sx={{ height: HEIGHT_UTILS.editorsHeight() }}>
                <InputOutputContainer />
            </FlexContainer>

            {/* Actions Panel Section - fixed height */}
            <FlexContainer overflowHidden sx={{ spacing: 0, width: '100%', height: UI_HEIGHTS.ACTIONS_PANEL, boxSizing: 'content-box' }}>
                <ActionsPanel />
            </FlexContainer>
        </Box>
    );
};

MainContentWidget.displayName = 'MainContentWidget';
export default MainContentWidget;
