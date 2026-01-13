import { Box, Button, Skeleton, Tab, Tabs, Tooltip, Typography } from '@mui/material';
import React from 'react';
import { getLogger } from '../../../../../logic/adapter';
import {
    selectActiveActionsTab,
    selectAllSettings,
    selectInputContent,
    selectIsAppBusy,
    selectPromptGroups,
    useAppDispatch,
    useAppSelector,
} from '../../../../../logic/store';
import { processPrompt } from '../../../../../logic/store/actions';
import { enqueueNotification } from '../../../../../logic/store/notifications';
import { setActiveActionsTab, setAppBusy, setCurrentTask } from '../../../../../logic/store/ui';
import { parseError } from '../../../../../logic/utils/error_utils';

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
 * - Preventing actions when the app is busy or input is empty
 * - Error handling and user notifications
 * - Loading state management
 *
 * Design Features:
 * - Horizontal scrolling for tabs when many prompt groups exist
 * - Vertical scrolling for action buttons with wrap layout
 * - Disabled state for all buttons when the app is busy
 * - Automatic tab correction when the active tab is invalid
 */
const ActionsPanel: React.FC = () => {
    const dispatch = useAppDispatch();
    const promptGroups = useAppSelector(selectPromptGroups);
    const activeTab = useAppSelector(selectActiveActionsTab);
    const isAppBusy = useAppSelector(selectIsAppBusy);
    const inputContent = useAppSelector(selectInputContent);
    const settings = useAppSelector(selectAllSettings);

    // Get all prompt groups and sort them by groupId for tab correction logic
    const promptGroupsArray = promptGroups ? Object.values(promptGroups.promptGroups) : [];
    const sortedPromptGroups = [...promptGroupsArray].sort((a, b) => a.groupId.localeCompare(b.groupId));
    const tabNames = sortedPromptGroups.map((group) => group.groupId);

    // Use useEffect to handle tab initialization and correction after render
    React.useEffect(() => {
        if (promptGroups && tabNames.length > 0) {
            const currentTabIndex = tabNames.indexOf(activeTab);

            // Initialize active tab if it's empty or invalid
            if (!activeTab || currentTabIndex === -1) {
                logger.logInfo(`Initializing active tab to first available tab: ${tabNames[0]}`);
                dispatch(setActiveActionsTab(tabNames[0]));
            }
        }
    }, [promptGroups, activeTab, tabNames, dispatch]);

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
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Failed to process prompt: ${err.message}`);
            dispatch(enqueueNotification({ message: `Failed to process prompt: ${err.message}`, severity: 'error' }));
        } finally {
            // Always reset the busy state and current task
            dispatch(setAppBusy(false));
            dispatch(setCurrentTask('N/A'));
        }
    };

    if (!promptGroups) {
        logger.logDebug('Prompts are not loaded yet. Showing Skeleton');
        return (
            <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
                    <Skeleton animation="wave" />
                </Box>
            </Box>
        );
    }

    // Safety check for empty tabNames
    if (tabNames.length === 0) {
        return (
            <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
                    <Skeleton animation="wave" />
                </Box>
                <Box sx={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                    <Typography>No action groups available</Typography>
                </Box>
            </Box>
        );
    }

    const tabs = (
        /* Tab Navigation - Centered with horizontal scrolling */
        <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', justifyContent: 'center', overflow: 'hidden' }}>
            {/* Wrapper for the tabs to stretch the whole line */}
            <Box sx={{ width: '100%', overflowX: 'auto', overflowY: 'hidden' }}>
                <Tabs
                    value={Math.max(0, tabNames.indexOf(activeTab))}
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
    );

    const actionButtons = (
        /* Action Buttons for Active Tab - Wraps to new lines, vertical scroll */
        <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: 1 }}>
            {/* Wrapper for the action buttons */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                {sortedPromptGroups.find((group) => group.groupId === activeTab)?.prompts &&
                    Object.entries(sortedPromptGroups.find((group) => group.groupId === activeTab)?.prompts || {}).map(([promptId, prompt]) => (
                        <Tooltip key={`tooltip-${activeTab}-${promptId}`} title={prompt.description} arrow>
                            <Button
                                key={`action-${activeTab}-${promptId}`}
                                variant="outlined"
                                color="primary"
                                onClick={() => handleActionClick(prompt.id, prompt.name)}
                                disabled={isAppBusy}
                                sx={{ borderRadius: '16px', border: '1px solid', minWidth: '150px', textTransform: 'uppercase' }}
                            >
                                {prompt.name}
                            </Button>
                        </Tooltip>
                    ))}
            </Box>
        </Box>
    );

    return (
        <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {tabs}
            {actionButtons}
        </Box>
    );
};

ActionsPanel.displayName = 'ActionsPanel';
export default ActionsPanel;
