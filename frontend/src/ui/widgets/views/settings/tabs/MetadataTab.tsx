import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import React from 'react';
import { ClipboardServiceAdapter, getLogger } from '../../../../../logic/adapter';
import { useAppDispatch } from '../../../../../logic/store';
import { enqueueNotification } from '../../../../../logic/store/notifications';
import { SPACING } from '../../../../styles/constants';

const logger = getLogger('MetadataTab');

interface MetadataTabProps {
    metadata: { settingsFolder: string; settingsFile: string };
}

/**
 * Helper component for displaying a metadata row with label, path, and copy button
 */
interface MetadataRowProps {
    label: string;
    path: string;
    tooltip: string;
    ariaLabel: string;
    onCopy: (text: string) => void;
}

const MetadataRow: React.FC<MetadataRowProps> = ({ label, path, tooltip, ariaLabel, onCopy }) => {
    return (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: SPACING.SMALL }}>
            <Typography variant="body2" sx={{ fontWeight: 'medium', minWidth: '150px' }}>
                {label}:
            </Typography>
            <Typography variant="body1" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {path}
            </Typography>
            <Tooltip title={tooltip}>
                <IconButton size="small" onClick={() => onCopy(path)} aria-label={ariaLabel}>
                    <ContentCopyIcon fontSize="small" color="primary" />
                </IconButton>
            </Tooltip>
        </Box>
    );
};

/**
 * Metadata Tab Component
 * Shows global settings information with copy functionality
 */
const MetadataTab: React.FC<MetadataTabProps> = ({ metadata }) => {
    const dispatch = useAppDispatch();

    const handleCopy = async (text: string) => {
        try {
            logger.logDebug(`Attempting to copy path to clipboard: ${text}`);
            const success = await ClipboardServiceAdapter.setText(text);
            if (success) {
                logger.logInfo('Path copied to clipboard successfully');
                dispatch(enqueueNotification({ message: 'Path copied to clipboard', severity: 'success' }));
            }
        } catch (error) {
            logger.logError(`Failed to copy path to clipboard: ${error}`);
            dispatch(enqueueNotification({ message: 'Failed to copy path', severity: 'error' }));
        }
    };

    return (
        <Box sx={{ padding: SPACING.SMALL }}>
            {/* Tab Description */}
            <Box sx={{ marginBottom: SPACING.STANDARD }}>
                <Typography variant="body2" color="text.secondary" component="div" gutterBottom>
                    This tab displays the file system locations where your application settings are stored.
                </Typography>
                <Typography variant="body2" color="text.secondary" component="div" gutterBottom>
                    Settings are automatically saved when you make changes in other tabs. You can copy these paths to locate your configuration files
                    if needed for backup or manual editing.
                </Typography>
                <Typography variant="body2" color="text.secondary" component="div" gutterBottom>
                    <strong>Note:</strong> Manual file editing is not recommended as it may cause configuration inconsistencies.
                </Typography>
            </Box>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: SPACING.STANDARD }}>
                {/* Folder */}
                <MetadataRow
                    label="Settings Folder"
                    path={metadata.settingsFolder}
                    tooltip="Copy settings folder path"
                    ariaLabel="copy settings folder"
                    onCopy={handleCopy}
                />

                {/* File */}
                <MetadataRow
                    label="Settings File"
                    path={metadata.settingsFile}
                    tooltip="Copy settings file path"
                    ariaLabel="copy settings file"
                    onCopy={handleCopy}
                />
            </Box>
        </Box>
    );
};

MetadataTab.displayName = 'MetadataTab';
export default MetadataTab;
