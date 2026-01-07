import React from 'react';
import { Box, Button, Paper, Tab, Tabs } from '@mui/material';
import { getLogger } from '../../../../../logic/adapter';

const logger = getLogger('ActionsPanel');

/**
 * Actions Panel - replaces the v1 ActionsAllGroupsWidget
 * Contains:
 * - Tab navigation for different action groups (centered, scrollable)
 * - Action buttons for each group (wraps to new lines, scrollable)
 */
const ActionsPanel: React.FC = () => {
    // Hardcoded values - will be replaced with Redux later
    const [activeTab, setActiveTab] = React.useState(0);
    const isProcessing = false;
    // TODO: Replace with Redux state later
    const actionGroups = {
        'Text Processing': [
            'Format',
            'Clean',
            'Transform Pretty long TEXT TEST 666',
            'Format',
            'Clean',
            'Format',
            'Clean',
            'Format',
            'Clean',
            'Format',
            'Clean',
            'Format',
            'Clean',
            'Clean',
            'Clean',
            'Clean',
            'Clean',
            'Clean',
            'Clean',
            'Clean',
            'Clean',
            'Clean',
            'Clean',
            'Format',
            'Clean',
            'Format',
            'Clean',
        ],
        'Translation': ['Translate', 'Detect Language'],
        'Analysis': ['Summarize', 'Extract Keywords'],
    };

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        // TODO: Replace with Redux dispatch later
        setActiveTab(newValue);
        logger.logInfo(`Tab changed to ${newValue} - will connect to Redux later`);
    };

    const handleActionClick = (actionId: string) => {
        // TODO: Replace with Redux dispatch later
        logger.logInfo(`Action clicked: ${actionId} - will connect to Redux later`);
    };

    const tabNames = Object.keys(actionGroups) as Array<keyof typeof actionGroups>;

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
                        value={activeTab}
                        onChange={handleTabChange}
                        aria-label="action groups tabs"
                        variant="scrollable"
                        scrollButtons="auto"
                        allowScrollButtonsMobile
                        sx={{ '& .MuiTabs-flexContainer': { justifyContent: 'center' } }}
                    >
                        {tabNames.map((tabName, index) => (
                            <Tab
                                key={`tab-${index}`}
                                label={tabName}
                                id={`tab-${index}`}
                                aria-controls={`tabpanel-${index}`}
                                disabled={isProcessing}
                                sx={{
                                    minWidth: 'auto',
                                }}
                            />
                        ))}
                    </Tabs>
                </Box>
            </Box>

            {/* Action Buttons for Active Tab - Wraps to new lines, vertical scroll */}
            <Box sx={{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', padding: 2 }}>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, justifyContent: 'center' }}>
                    {actionGroups[tabNames[activeTab]]?.map((actionId, index) => (
                        <Button
                            key={`action-${activeTab}-${index}`}
                            variant="outlined"
                            color="primary"
                            onClick={() => handleActionClick(actionId)}
                            disabled={isProcessing}
                            sx={{
                                borderRadius: '8px',
                                minWidth: '120px',
                                textTransform: 'uppercase',
                            }}
                        >
                            {actionId}
                        </Button>
                    ))}
                </Box>
            </Box>
        </Paper>
    );
};

ActionsPanel.displayName = 'ActionsPanel';
export default ActionsPanel;
