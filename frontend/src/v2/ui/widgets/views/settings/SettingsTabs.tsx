import React from 'react';
import { Tabs, Tab, Box } from '@mui/material';
import CloudIcon from '@mui/icons-material/Cloud';
import TimerIcon from '@mui/icons-material/Timer';
import ModelTrainingIcon from '@mui/icons-material/ModelTraining';
import TranslateIcon from '@mui/icons-material/Translate';
import InfoIcon from '@mui/icons-material/Info';

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