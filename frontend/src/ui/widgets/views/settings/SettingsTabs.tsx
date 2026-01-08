import { Box, Tab, Tabs } from '@mui/material';
import React from 'react';

interface SettingsTabsProps {
    activeTab: number;
    onChange: (event: React.SyntheticEvent, newValue: number) => void;
}

/**
 * Settings Tabs Component
 * Navigation tabs for different settings sections
 */
const SettingsTabs: React.FC<SettingsTabsProps> = ({ activeTab, onChange }) => {
    return (
        <Box sx={{ width: '100%' }}>
            <Tabs value={activeTab} onChange={onChange} centered>
                <Tab label="Settings Info" />
                <Tab label="Provider Config" />
                <Tab label="Model Config" />
                <Tab label="Inference Config" />
                <Tab label="Language Config" />
            </Tabs>
        </Box>
    );
};

SettingsTabs.displayName = 'SettingsTabs';
export default SettingsTabs;
