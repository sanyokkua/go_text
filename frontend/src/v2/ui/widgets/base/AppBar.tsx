import SettingsIcon from '@mui/icons-material/Settings';
import { AppBar as MuiAppBar, Box, IconButton, Toolbar, Typography } from '@mui/material';
import React from 'react';
import { getLogger } from '../../../logic/adapter';

const logger = getLogger('AppBar');

const AppBar: React.FC = () => {
    // Hardcoded values - will be replaced with Redux later
    const title = 'Text Processor';

    const handleSettingsClick = () => {
        // TODO: Replace with Redux dispatch later
        logger.logInfo('Settings clicked - will connect to Redux later');
    };

    return (
        <MuiAppBar
            position="static"
            sx={{
                backgroundColor: 'primary.main',
                width: '100%',
                height: '100%',
                zIndex: (theme) => theme.zIndex.drawer + 1,
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
                    <Typography variant="h6" component="div" sx={{ fontWeight: 'bold', color: 'white', lineHeight: 1 }}>
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
                        <SettingsIcon />
                    </IconButton>
                </Box>
            </Toolbar>
        </MuiAppBar>
    );
};

AppBar.displayName = 'AppBar';
export default AppBar;
