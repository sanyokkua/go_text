import CloseIcon from '@mui/icons-material/Close';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import { Box, Button } from '@mui/material';
import React from 'react';
import { SPACING } from '../../../styles/constants';

interface SettingsGlobalControlsProps {
    onClose: () => void;
    onResetToDefault: () => void;
}

/**
 * Settings Global Controls Component
 * Close and Reset to Default buttons for the settings dialog
 */
const SettingsGlobalControls: React.FC<SettingsGlobalControlsProps> = ({ onClose, onResetToDefault }) => {
    return (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: SPACING.LARGE, paddingTop: SPACING.SMALL }}>
            <Button variant="outlined" color="error" startIcon={<RestartAltIcon />} onClick={onResetToDefault}>
                Reset To Default
            </Button>
            <Button variant="contained" startIcon={<CloseIcon />} onClick={onClose}>
                Close
            </Button>
        </Box>
    );
};

SettingsGlobalControls.displayName = 'SettingsGlobalControls';
export default SettingsGlobalControls;
