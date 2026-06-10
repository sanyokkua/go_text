import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Box, Button, Checkbox, FormControlLabel, IconButton, TextField, Tooltip, Typography } from '@mui/material';
import React, { useEffect, useState } from 'react';
import { AppBehaviorConfig, AppSettingsMetadata, ClipboardServiceAdapter, getLogger, Settings } from '../../../../../logic/adapter';
import { useAppDispatch, useAppSelector } from '../../../../../logic/store';
import { enqueueNotification } from '../../../../../logic/store/notifications';
import { selectAppBehaviorConfig } from '../../../../../logic/store/settings/selectors';
import { updateAppBehaviorConfig } from '../../../../../logic/store/settings/thunks';
import { setAppBusy } from '../../../../../logic/store/ui';
import { parseError } from '../../../../../logic/utils/error_utils';
import { SPACING } from '../../../../styles/constants';

const logger = getLogger('AppBehaviorTab');

interface AppBehaviorTabProps {
    settings: Settings;
    metadata: AppSettingsMetadata;
}

const AppBehaviorTab: React.FC<AppBehaviorTabProps> = ({ settings, metadata }) => {
    const dispatch = useAppDispatch();
    const currentConfig = useAppSelector(selectAppBehaviorConfig);

    const resolvedConfig: AppBehaviorConfig = currentConfig ?? settings.appBehaviorConfig;

    const [logDirectoryInput, setLogDirectoryInput] = useState(resolvedConfig.logDirectory);

    // Keep local text input in sync when the persisted config changes (e.g. after Reset)
    useEffect(() => {
        setLogDirectoryInput(resolvedConfig.logDirectory);
    }, [resolvedConfig.logDirectory]);

    const dispatchUpdate = async (config: AppBehaviorConfig) => {
        try {
            dispatch(setAppBusy(true));
            await dispatch(updateAppBehaviorConfig(config)).unwrap();
            dispatch(enqueueNotification({ message: 'App behavior settings updated successfully', severity: 'success' }));
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Failed to update app behavior config: ${err.message}`);
            dispatch(enqueueNotification({ message: `Failed to update app behavior settings: ${err.message}`, severity: 'error' }));
        } finally {
            dispatch(setAppBusy(false));
        }
    };

    const handleToggleLogging = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.checked;
        logger.logDebug(`Task logging toggled: ${newValue}`);
        await dispatchUpdate({ enableTaskLogging: newValue, logDirectory: resolvedConfig.logDirectory });
    };

    const handleLogDirectoryBlur = async () => {
        if (logDirectoryInput === resolvedConfig.logDirectory) {
            return;
        }
        logger.logDebug(`Log directory changed to: ${logDirectoryInput}`);
        await dispatchUpdate({ enableTaskLogging: resolvedConfig.enableTaskLogging, logDirectory: logDirectoryInput });
    };

    const handleReset = async () => {
        logger.logDebug('Resetting log directory to default');
        setLogDirectoryInput('');
        await dispatchUpdate({ enableTaskLogging: resolvedConfig.enableTaskLogging, logDirectory: '' });
    };

    const handleCopyLogsFolder = async () => {
        try {
            logger.logDebug(`Attempting to copy logs folder path: ${metadata.logsFolder}`);
            const success = await ClipboardServiceAdapter.setText(metadata.logsFolder);
            if (success) {
                logger.logInfo('Logs folder path copied to clipboard');
                dispatch(enqueueNotification({ message: 'Logs folder path copied to clipboard', severity: 'success' }));
            }
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Failed to copy logs folder path: ${err.message}`);
            dispatch(enqueueNotification({ message: 'Failed to copy logs folder path', severity: 'error' }));
        }
    };

    return (
        <Box sx={{ padding: SPACING.SMALL, flex: 1 }}>
            <Box sx={{ marginBottom: SPACING.STANDARD }}>
                <Typography variant="body2" color="text.secondary" component="div" gutterBottom>
                    This tab configures task input/output logging. When enabled, each completed prompt action is written to a log file for review.
                </Typography>
                <Typography variant="body2" color="text.secondary" component="div" gutterBottom>
                    <strong>Log Directory:</strong> Leave empty to use the OS default location shown below. Provide an absolute path to override it.
                </Typography>
                <Typography variant="body2" color="text.secondary" component="div" gutterBottom>
                    <strong>Note:</strong> The resolved logs folder path reflects the current OS default and is updated only after the app restarts or
                    settings are reloaded.
                </Typography>
            </Box>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: SPACING.STANDARD }}>
                <FormControlLabel
                    control={<Checkbox checked={resolvedConfig.enableTaskLogging} onChange={handleToggleLogging} />}
                    label="Enable Task Logging"
                />

                <TextField
                    label="Log Directory"
                    value={logDirectoryInput}
                    onChange={(e) => setLogDirectoryInput(e.target.value)}
                    onBlur={handleLogDirectoryBlur}
                    placeholder="Leave empty for default"
                    helperText="Absolute path to the log directory. Leave empty to use the OS default."
                    fullWidth
                    size="small"
                />

                <Box sx={{ display: 'flex', alignItems: 'center', gap: SPACING.SMALL }}>
                    <Typography variant="body2" sx={{ fontWeight: 'medium', minWidth: '150px' }}>
                        Resolved Logs Folder:
                    </Typography>
                    <Typography variant="body1" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {metadata.logsFolder}
                    </Typography>
                    <Tooltip title="Copy logs folder path">
                        <IconButton size="small" onClick={handleCopyLogsFolder} aria-label="copy logs folder path">
                            <ContentCopyIcon fontSize="small" color="primary" />
                        </IconButton>
                    </Tooltip>
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginTop: SPACING.LARGE }}>
                    <Button variant="outlined" color="secondary" onClick={handleReset}>
                        Reset to Default
                    </Button>
                </Box>
            </Box>
        </Box>
    );
};

AppBehaviorTab.displayName = 'AppBehaviorTab';
export default AppBehaviorTab;
