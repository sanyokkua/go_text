import CloseIcon from '@mui/icons-material/Close';
import InfoIcon from '@mui/icons-material/Info';
import SettingsIcon from '@mui/icons-material/Settings';
import { AppBar as MuiAppBar, Box, IconButton, Toolbar, Typography } from '@mui/material';
import React from 'react';
import { getLogger } from '../../../logic/adapter';
import { selectCurrentView, useAppDispatch, useAppSelector } from '../../../logic/store';
import { toggleInfoView, toggleSettingsView } from '../../../logic/store/ui';

const logger = getLogger('AppBar');

const AppBar: React.FC = () => {
    const dispatch = useAppDispatch();
    const view = useAppSelector(selectCurrentView);
    const showSettings = view === 'settings';
    const showInfo = view === 'info';
    const showMain = view === 'main';
    const title = 'Text Processor';

    const handleInfoClick = () => {
        logger.logInfo('Info button clicked');
        dispatch(toggleInfoView());
    };

    const handleRightButtonClick = () => {
        if (showSettings) {
            logger.logInfo('Closing settings');
            dispatch(toggleSettingsView());
        } else if (showInfo) {
            logger.logInfo('Closing information');
            dispatch(toggleInfoView());
        } else {
            logger.logInfo('Opening settings');
            dispatch(toggleSettingsView());
        }
    };

    const closeIcon = <CloseIcon color="inherit" fontSize="small" />;
    const settingsIcon = <SettingsIcon color="inherit" fontSize="small" />;
    const infoIcon = <InfoIcon color="inherit" fontSize="small" />;
    const rightIcon = showSettings || showInfo ? closeIcon : settingsIcon;

    return (
        <MuiAppBar position="static" sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <Toolbar sx={{ justifyContent: 'space-between', width: '100%' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    <Typography variant="h6" component="div" sx={{ lineHeight: 1 }}>
                        {title}
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', height: '100%' }}>
                    {showMain && (
                        <IconButton
                            color="inherit"
                            aria-label="information"
                            onClick={handleInfoClick}
                            sx={{ height: 'fit-content', width: 'fit-content', ...{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.5)' } } }}
                        >
                            {infoIcon}
                        </IconButton>
                    )}
                    <IconButton
                        color="inherit"
                        aria-label={showSettings ? 'close settings' : showInfo ? 'close information' : 'open settings'}
                        onClick={handleRightButtonClick}
                        sx={{ height: 'fit-content', width: 'fit-content', ...{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.5)' } } }}
                    >
                        {rightIcon}
                    </IconButton>
                </Box>
            </Toolbar>
        </MuiAppBar>
    );
};

AppBar.displayName = 'AppBar';
export default AppBar;
