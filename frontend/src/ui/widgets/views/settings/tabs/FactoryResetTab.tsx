import { Box, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Typography } from '@mui/material';
import React, { useState } from 'react';
import { getLogger } from '../../../../../logic/adapter';
import { useAppDispatch } from '../../../../../logic/store';
import { enqueueNotification } from '../../../../../logic/store/notifications';
import { resetSettingsToDefault } from '../../../../../logic/store/settings';
import { setAppBusy } from '../../../../../logic/store/ui';
import { SPACING } from '../../../../styles/constants';

const logger = getLogger('FactoryResetTab');

/**
 * Factory Reset Tab Component
 * Dedicated tab for resetting all settings to factory defaults
 */
const FactoryResetTab: React.FC = () => {
    const dispatch = useAppDispatch();
    const [confirmationOpen, setConfirmationOpen] = useState(false);

    const handleFactoryReset = async () => {
        try {
            logger.logInfo('Initiating factory reset - all settings will be reset to defaults');
            dispatch(setAppBusy(true));
            await dispatch(resetSettingsToDefault()).unwrap();
            logger.logInfo('Factory reset completed successfully - all settings restored to factory defaults');
            dispatch(enqueueNotification({ message: 'All settings have been reset to factory defaults', severity: 'success' }));
        } catch (error) {
            logger.logError(`Factory reset failed: ${error}`);
            dispatch(enqueueNotification({ message: `Failed to reset settings: ${error}`, severity: 'error' }));
        } finally {
            dispatch(setAppBusy(false));
            setConfirmationOpen(false);
        }
    };

    const handleOpenConfirmation = () => {
        logger.logWarning('User requested factory reset - showing confirmation dialog');
        setConfirmationOpen(true);
    };

    const handleCloseConfirmation = () => {
        logger.logInfo('Factory reset confirmation dialog closed - operation cancelled');
        setConfirmationOpen(false);
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: SPACING.STANDARD }}>
            <Box sx={{ padding: SPACING.STANDARD, flex: 1 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: SPACING.SMALL, height: '100%' }}>
                    {/* Warning Header */}
                    <Typography variant="h6" color="error.main" gutterBottom>
                        Factory Reset
                    </Typography>

                    {/* Description */}
                    <Typography variant="body1" paragraph>
                        This operation will reset ALL settings to their original factory defaults. This includes:
                    </Typography>

                    <Box sx={{ pl: SPACING.LARGE, mb: SPACING.SMALL }}>
                        <Typography variant="body2" component="ul" sx={{ listStyleType: 'disc', pl: SPACING.STANDARD }}>
                            <li>Provider configurations</li>
                            <li>Model settings</li>
                            <li>Inference parameters</li>
                            <li>Language configurations</li>
                            <li>All other custom settings</li>
                        </Typography>
                    </Box>

                    {/* Warning Message */}
                    <Box sx={{ p: SPACING.SMALL, backgroundColor: 'error.light', borderRadius: '8px' }}>
                        <Typography variant="body2" fontWeight="bold">
                            WARNING: This action cannot be undone!
                        </Typography>
                        <Typography variant="body2" sx={{ mt: SPACING.SMALL }}>
                            Make sure you have backed up any important configurations before proceeding.
                        </Typography>
                    </Box>

                    {/* Reset Button */}
                    <Box sx={{ display: 'flex', justifyContent: 'center', marginTop: 'auto', paddingTop: SPACING.LARGE }}>
                        <Button variant="contained" color="error" size="large" onClick={handleOpenConfirmation} sx={{ minWidth: '200px' }}>
                            Factory Reset
                        </Button>
                    </Box>
                </Box>
            </Box>

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
