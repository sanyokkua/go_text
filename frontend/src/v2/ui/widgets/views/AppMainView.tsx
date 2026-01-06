import { Box } from '@mui/material';
import React from 'react';
import FlexContainer from '../../components/FlexContainer';
import { CONTAINER_STYLES, UI_HEIGHTS } from '../../styles/constants';
import AppBar from '../base/AppBar';
import StatusBar from '../base/StatusBar';
import MainContent from './MainContent';

/**
 * App Main View - Root component that organizes the main layout
 * Structure:
 * - AppBar (top)
 * - MainContent (middle)
 * - StatusBar (bottom)
 */
const AppMainView: React.FC = () => {
    return (
        <FlexContainer direction="column" overflowHidden sx={{ ...CONTAINER_STYLES.FULL_SIZE, maxHeight: '100vh', minHeight: '100vh' }}>
            {/* Top App Bar - Fixed height */}
            <Box sx={{ height: UI_HEIGHTS.APP_BAR }}>
                <AppBar />
            </Box>

            {/* Main Content Area - Takes remaining space */}
            <FlexContainer grow overflowHidden>
                <MainContent />
            </FlexContainer>

            {/* Bottom Status Bar - Fixed height */}
            <Box sx={{ height: UI_HEIGHTS.STATUS_BAR }}>
                <StatusBar />
            </Box>
        </FlexContainer>
    );
};

AppMainView.displayName = 'AppMainView';
export default AppMainView;
