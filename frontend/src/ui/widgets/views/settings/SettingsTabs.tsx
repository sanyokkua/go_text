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
            <Tabs value={activeTab} onChange={onChange} centered variant="fullWidth">
                <Tab wrapped label="Settings Info" />
                <Tab wrapped label="Provider Config" />
                <Tab wrapped label="Model Config" />
                <Tab wrapped label="Inference Config" />
                <Tab wrapped label="Language Config" />
                <Tab wrapped label="Factory Reset" />
            </Tabs>
        </Box>
    );
};

SettingsTabs.displayName = 'SettingsTabs';
export default SettingsTabs;
