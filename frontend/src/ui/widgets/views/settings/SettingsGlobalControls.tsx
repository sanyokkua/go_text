import CloseIcon from '@mui/icons-material/Close';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { Box, Button } from '@mui/material';
import React from 'react';
import { SPACING } from '../../../styles/constants';

/**
 * Settings Global Controls Component
 * Note: All controls have been removed - settings can only be closed via App Bar button
 * Reset functionality is now in the dedicated Factory Reset tab
 */
const SettingsGlobalControls: React.FC = () => {
    return null;
    // Component kept for potential future use, but currently empty
    // All functionality has been moved to dedicated tabs
};

SettingsGlobalControls.displayName = 'SettingsGlobalControls';
export default SettingsGlobalControls;
