import { Box } from '@mui/material';
import React, { useState } from 'react';
import FlexContainer from '../../components/FlexContainer';
import { CONTAINER_STYLES, UI_HEIGHTS } from '../../styles/constants';
import AppBar from '../base/AppBar';
import StatusBar from '../base/StatusBar';
import MainContent from './MainContent';
import { getLogger } from '../../../logic/adapter';

const logger = getLogger('AppMainView');

/**
 * App Main View - Root component that organizes the main layout
 * Structure:
 * - AppBar (top)
 * - MainContent (middle) - shows either main content or settings
 * - StatusBar (bottom)
 */
const AppMainView: React.FC = () => {
    const [showSettings, setShowSettings] = useState(false);

    const handleSettingsClick = () => {
        setShowSettings(true);
        logger.logDebug('Settings clicked');
    };

    const handleCloseSettings = () => {
        setShowSettings(false);
    };

    return (
        <FlexContainer direction="column" overflowHidden sx={{ ...CONTAINER_STYLES.FULL_SIZE, maxHeight: '100vh', minHeight: '100vh' }}>
            {/* Top App Bar - Fixed height */}
            <Box sx={{ height: UI_HEIGHTS.APP_BAR }}>
                <AppBar onSettingsClick={handleSettingsClick} showSettings={showSettings} />
            </Box>

            {/* Main Content Area - Takes remaining space */}
            <FlexContainer grow overflowHidden>
                <MainContent showSettings={showSettings} onCloseSettings={handleCloseSettings} />
            </FlexContainer>

            {/* Bottom Status Bar - Fixed height */}
            {!showSettings && (
                <Box sx={{ height: UI_HEIGHTS.STATUS_BAR }}>
                    <StatusBar />
                </Box>
            )}
        </FlexContainer>
    );
};

AppMainView.displayName = 'AppMainView';
export default AppMainView;
