import { Box } from '@mui/material';
import React, { useEffect } from 'react';
import { getLogger } from '../../../logic/adapter';
import { selectCurrentView, useAppDispatch, useAppSelector } from '../../../logic/store';
import { getPromptGroups } from '../../../logic/store/actions';
import { initializeSettingsState } from '../../../logic/store/settings';
import { setActiveActionsTab } from '../../../logic/store/ui';
import FlexContainer from '../../components/FlexContainer';
import { UI_HEIGHTS } from '../../styles/constants';
import AppBar from '../base/AppBar';
import StatusBar from '../base/StatusBar';
import MainContent from './MainContent';

const logger = getLogger('AppMainView');

/**
 * App Main View - Root component that organizes the main layout
 * Structure:
 * - AppBar (top)
 * - MainContent (middle) - shows either main content or settings
 * - StatusBar (bottom)
 *
 * Key Responsibilities:
 * - Application initialization (settings, prompt groups)
 * - Layout management with fixed and flexible height components
 * - Conditional rendering of status bar (hidden in settings view)
 * - State management for active actions tab
 */
const AppMainView: React.FC = () => {
    const dispatch = useAppDispatch();
    const view = useAppSelector(selectCurrentView);
    const showSettings = view === 'settings';

    // Initialize settings and prompt groups on mount
    useEffect(() => {
        const initializeApp = async () => {
            try {
                logger.logInfo('Initializing app state');

                // Initialize settings state
                await dispatch(initializeSettingsState()).unwrap();
                logger.logInfo('Settings initialized successfully');

                // Fetch prompt groups
                const promptGroupsResult = await dispatch(getPromptGroups()).unwrap();
                logger.logInfo('Prompt groups loaded successfully');

                // Set the first prompt group as active
                if (promptGroupsResult && Object.keys(promptGroupsResult.promptGroups).length > 0) {
                    const firstGroupId = Object.keys(promptGroupsResult.promptGroups)[0];
                    dispatch(setActiveActionsTab(firstGroupId));
                    logger.logInfo(`Set active actions tab to: ${firstGroupId}`);
                }
            } catch (error) {
                logger.logError(`Failed to initialize app: ${error}`);
            }
        };

        initializeApp();
    }, [dispatch]);

    return (
        <FlexContainer direction="column" overflowHidden sx={{ width: '100%', height: '100%', maxHeight: '100vh', minHeight: '100vh' }}>
            {/* Top App Bar */}
            <Box sx={{ height: UI_HEIGHTS.APP_BAR }}>
                <AppBar />
            </Box>

            {/* Main Content Area - Takes remaining space */}
            <FlexContainer grow overflowHidden>
                <MainContent />
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
