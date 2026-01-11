import CloseIcon from '@mui/icons-material/Close';
import SettingsIcon from '@mui/icons-material/Settings';
import { AppBar as MuiAppBar, Box, IconButton, Toolbar, Typography } from '@mui/material';
import React from 'react';
import { getLogger } from '../../../logic/adapter';
import { selectCurrentView, useAppDispatch, useAppSelector } from '../../../logic/store';
import { toggleSettingsView } from '../../../logic/store/ui';

const logger = getLogger('AppBar');

const AppBar: React.FC = () => {
    const dispatch = useAppDispatch();
    const view = useAppSelector(selectCurrentView);
    const showSettings = view === 'settings';
    const title = 'Text Processor';

    const handleSettingsClick = () => {
        logger.logInfo('Settings button clicked');
        dispatch(toggleSettingsView());
    };

    const closeIcon = <CloseIcon color="inherit" fontSize="small" />;
    const settingsIcon = <SettingsIcon color="inherit" fontSize="small" />;
    const iconToShow = showSettings ? closeIcon : settingsIcon;

    return (
        <MuiAppBar position="static" sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Toolbar sx={{ justifyContent: 'space-between', width: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    <Typography variant="h6" component="div" sx={{ lineHeight: 1 }}>
                        {title}
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    <IconButton
                        color="inherit"
                        aria-label={showSettings ? 'close settings' : 'open settings'}
                        onClick={handleSettingsClick}
                        sx={{ height: 'fit-content', width: 'fit-content', ...{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.5)' } } }}
                    >
                        {iconToShow}
                    </IconButton>
                </Box>
            </Toolbar>
        </MuiAppBar>
    );
};

AppBar.displayName = 'AppBar';
export default AppBar;
