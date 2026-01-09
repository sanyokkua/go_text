import { Box, Button, Paper, Tab, Tabs, Typography } from '@mui/material';
import React from 'react';
import { getLogger } from '../../../../../logic/adapter';
import { useAppDispatch, useAppSelector } from '../../../../../logic/store';
import { processPrompt } from '../../../../../logic/store/actions';
import { enqueueNotification } from '../../../../../logic/store/notifications';
import { setActiveActionsTab, setAppBusy, setCurrentTask } from '../../../../../logic/store/ui';

const logger = getLogger('ActionsPanel');

/**
 * Actions Panel - replaces the v1 ActionsAllGroupsWidget
 * Contains:
 * - Tab navigation for different action groups (centered, scrollable)
 * - Action buttons for each group (wraps to new lines, scrollable)
 *
 * Key Responsibilities:
 * - Managing prompt group navigation via tabs
 * - Handling action button clicks with proper state management
 * - Preventing actions when app is busy or input is empty
 * - Error handling and user notifications
 * - Loading state management
 *
 * Design Features:
 * - Horizontal scrolling for tabs when many prompt groups exist
 * - Vertical scrolling for action buttons with wrap layout
 * - Disabled state for all buttons when app is busy
 * - Automatic tab correction when active tab is invalid
 */
const ActionsPanel: React.FC = () => {
    const dispatch = useAppDispatch();
    const promptGroups = useAppSelector((state) => state.actions.promptGroups);
    const activeTab = useAppSelector((state) => state.ui.activeActionsTab);
    const isAppBusy = useAppSelector((state) => state.ui.isAppBusy);
    const inputContent = useAppSelector((state) => state.editor.inputContent);
    const settings = useAppSelector((state) => state.settings.allSettings);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        const newTabName = tabNames[newValue];
        dispatch(setActiveActionsTab(newTabName));
        logger.logInfo(`Tab changed to ${newTabName}`);
    };

    const handleActionClick = async (actionId: string, promptName: string) => {
        if (isAppBusy || !inputContent) {
            logger.logInfo(`Action click prevented - app busy: ${isAppBusy}, input empty: ${!inputContent}`);
            return;
        }

        try {
            logger.logInfo(`Action clicked: ${actionId}`);

            // Set the current task
            dispatch(setCurrentTask(promptName));
            dispatch(setAppBusy(true));

            // Prepare the request
            const request = {
                id: actionId,
                inputText: inputContent,
                inputLanguageId: settings?.languageConfig.defaultInputLanguage || 'auto',
                outputLanguageId: settings?.languageConfig.defaultOutputLanguage || 'auto',
            };

            logger.logInfo(`Processing prompt with request: ${JSON.stringify(request)}`);

            // Process the prompt
            await dispatch(processPrompt(request)).unwrap();

            logger.logInfo('Prompt processed successfully');
        } catch (error) {
            logger.logError(`Failed to process prompt: ${error}`);
            dispatch(enqueueNotification({ message: `Failed to process prompt: ${error}`, severity: 'error' }));
        } finally {
            // Always reset the busy state and current task
            dispatch(setAppBusy(false));
            dispatch(setCurrentTask('N/A'));
        }
    };

    if (!promptGroups) {
        return (
            <Paper
                elevation={1}
                square={false}
                sx={{
                    'width': '100%',
                    'height': '90%',
                    'display': 'flex',
                    'flexDirection': 'column',
                    'overflow': 'hidden',
                    'borderRadius': '24px',
                    '&:hover': { boxShadow: 3 },
                }}
            >
                <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Typography variant="body1" color="text.secondary">
                        Loading prompt groups...
                    </Typography>
                </Box>
            </Paper>
        );
    }

    // Get all prompt groups and sort them by groupId
    const promptGroupsArray = Object.values(promptGroups.promptGroups);
    const sortedPromptGroups = [...promptGroupsArray].sort((a, b) => a.groupId.localeCompare(b.groupId));

    const tabNames = sortedPromptGroups.map((group) => group.groupId);

    // Ensure activeTab is set to the first tab if it's not found in tabNames
    const currentTabIndex = tabNames.indexOf(activeTab);
    if (currentTabIndex === -1 && tabNames.length > 0) {
        // This can happen if the activeTab was set before promptGroups were loaded
        // or if the activeTab is invalid
        logger.logError(`Active tab '${activeTab}' not found in tabNames, defaulting to first tab`);
        dispatch(setActiveActionsTab(tabNames[0]));
        return null; // Re-render with the correct tab
    }

    return (
        <Paper
            elevation={1}
            square={false}
            sx={{
                'width': '100%',
                'height': '90%',
                'display': 'flex',
                'flexDirection': 'column',
                'overflow': 'hidden',
                'borderRadius': '24px',
                '&:hover': { boxShadow: 3 },
            }}
        >
            {/* Tab Navigation - Centered with horizontal scrolling */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
                <Box sx={{ width: '100%', overflowX: 'auto', overflowY: 'hidden' }}>
                    <Tabs
                        value={tabNames.indexOf(activeTab)}
                        onChange={handleTabChange}
                        aria-label="action groups tabs"
                        variant="scrollable"
                        scrollButtons="auto"
                        allowScrollButtonsMobile
                        sx={{ '& .MuiTabs-flexContainer': { justifyContent: 'center' } }}
                    >
                        {sortedPromptGroups.map((group, index) => (
                            <Tab
                                key={`tab-${index}`}
                                label={group.groupName}
                                id={`tab-${index}`}
                                aria-controls={`tabpanel-${index}`}
                                disabled={isAppBusy}
                                sx={{ minWidth: 'auto' }}
                            />
                        ))}
                    </Tabs>
                </Box>
            </Box>

            {/* Action Buttons for Active Tab - Wraps to new lines, vertical scroll */}
            <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: 2 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                    {sortedPromptGroups.find((group) => group.groupId === activeTab)?.prompts &&
                        Object.entries(sortedPromptGroups.find((group) => group.groupId === activeTab)?.prompts || {}).map(([promptId, prompt]) => (
                            <Button
                                key={`action-${activeTab}-${promptId}`}
                                variant="contained"
                                color="secondary"
                                onClick={() => handleActionClick(prompt.id, prompt.name)}
                                disabled={isAppBusy}
                                sx={{ borderRadius: '8px', minWidth: '120px', textTransform: 'uppercase' }}
                            >
                                {prompt.name}
                            </Button>
                        ))}
                </Box>
            </Box>
        </Paper>
    );
};

ActionsPanel.displayName = 'ActionsPanel';
export default ActionsPanel;
