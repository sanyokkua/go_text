import SettingsIcon from '@mui/icons-material/Settings';
import { AppBar as MuiAppBar, Box, IconButton, Toolbar, Typography } from '@mui/material';
import React, { useState } from 'react';
import { getLogger } from '../../../logic/adapter';

const logger = getLogger('AppBar');

interface AppBarProps {
    onSettingsClick: () => void;
    showSettings: boolean;
}

const AppBar: React.FC<AppBarProps> = ({ onSettingsClick, showSettings }) => {
    const title = 'Text Processor';

    const handleSettingsClick = () => {
        logger.logInfo('Settings button clicked');
        onSettingsClick();
    };

    return (
        <MuiAppBar
            position="static"
            sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
            }}
        >
            <Toolbar
                sx={{
                    justifyContent: 'space-between',
                    width: '100%',
                    height: '100%',
                    minHeight: '100%',
                    padding: '0 16px', // Ensure proper padding
                    boxSizing: 'border-box',
                }}
            >
                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', lineHeight: 1 }}>
                        {title}
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    <IconButton
                        color="inherit"
                        aria-label="settings"
                        onClick={handleSettingsClick}
                        sx={{ ml: 1, height: 'fit-content', width: 'fit-content' }}
                    >
                        <SettingsIcon color={showSettings ? 'primary' : 'inherit'} />
                    </IconButton>
                </Box>
            </Toolbar>
        </MuiAppBar>
    );
};

AppBar.displayName = 'AppBar';
export default AppBar;
