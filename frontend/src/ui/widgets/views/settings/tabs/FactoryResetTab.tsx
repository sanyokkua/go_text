import { Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Paper, Typography } from '@mui/material';
import React, { useState } from 'react';
import { SPACING } from '../../../../styles/constants';
import { useAppDispatch } from '../../../../../logic/store';
import { resetSettingsToDefault } from '../../../../../logic/store/settings';
import { setAppBusy } from '../../../../../logic/store/ui';
import { enqueueNotification } from '../../../../../logic/store/notifications';

/**
 * Factory Reset Tab Component
 * Dedicated tab for resetting all settings to factory defaults
 */
const FactoryResetTab: React.FC = () => {
    const dispatch = useAppDispatch();
    const [confirmationOpen, setConfirmationOpen] = useState(false);

    const handleFactoryReset = async () => {
        try {
            dispatch(setAppBusy(true));
            await dispatch(resetSettingsToDefault()).unwrap();
            dispatch(enqueueNotification({ 
                message: 'All settings have been reset to factory defaults', 
                severity: 'success' 
            }));
        } catch (error) {
            dispatch(enqueueNotification({ 
                message: `Failed to reset settings: ${error}`, 
                severity: 'error' 
            }));
        } finally {
            dispatch(setAppBusy(false));
            setConfirmationOpen(false);
        }
    };

    const handleOpenConfirmation = () => {
        setConfirmationOpen(true);
    };

    const handleCloseConfirmation = () => {
        setConfirmationOpen(false);
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: SPACING.STANDARD }}>
            <Paper elevation={0} sx={{ padding: SPACING.STANDARD, flex: 1 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: SPACING.STANDARD, height: '100%' }}>
                    {/* Warning Header */}
                    <Typography variant="h6" color="error.main" gutterBottom>
                        Factory Reset
                    </Typography>

                    {/* Description */}
                    <Typography variant="body1" paragraph>
                        This operation will reset ALL settings to their original factory defaults. This includes:
                    </Typography>

                    <Box sx={{ pl: SPACING.STANDARD, mb: SPACING.STANDARD }}>
                        <Typography variant="body2" component="ul" sx={{ listStyleType: 'disc', pl: SPACING.STANDARD }}>
                            <li>Provider configurations</li>
                            <li>Model settings</li>
                            <li>Inference parameters</li>
                            <li>Language configurations</li>
                            <li>All other custom settings</li>
                        </Typography>
                    </Box>

                    {/* Warning */}
                    <Box sx={{ 
                        p: SPACING.STANDARD, 
                        backgroundColor: 'error.light',
                        borderRadius: '4px',
                        borderLeft: `4px solid`,
                        borderColor: 'error.main'
                    }}>
                        <Typography variant="body2" color="error.main" fontWeight="bold">
                            WARNING: This action cannot be undone!
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mt: SPACING.SMALL }}>
                            Make sure you have backed up any important configurations before proceeding.
                        </Typography>
                    </Box>

                    {/* Reset Button */}
                    <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'center', 
                        marginTop: 'auto',
                        paddingTop: SPACING.LARGE
                    }}>
                        <Button
                            variant="contained"
                            color="error"
                            size="large"
                            onClick={handleOpenConfirmation}
                            sx={{ minWidth: '200px' }}
                        >
                            Factory Reset
                        </Button>
                    </Box>
                </Box>
            </Paper>

            {/* Confirmation Dialog */}
            <Dialog
                open={confirmationOpen}
                onClose={handleCloseConfirmation}
                aria-labelledby="factory-reset-confirmation-title"
                aria-describedby="factory-reset-confirmation-description"
            >
                <DialogTitle id="factory-reset-confirmation-title" color="error">
                    Confirm Factory Reset
                </DialogTitle>
                <DialogContent>
                    <DialogContentText id="factory-reset-confirmation-description" sx={{ mt: SPACING.SMALL }}>
                        Are you sure you want to reset ALL settings to factory defaults?
                        <Box component="span" sx={{ display: 'block', mt: SPACING.STANDARD, fontWeight: 'bold' }}>
                            This action cannot be undone!
                        </Box>
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseConfirmation} color="primary">
                        Cancel
                    </Button>
                    <Button onClick={handleFactoryReset} color="error" variant="contained" autoFocus>
                        Confirm Reset
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

FactoryResetTab.displayName = 'FactoryResetTab';
export default FactoryResetTab;