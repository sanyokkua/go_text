import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Box, IconButton, Tooltip, Typography } from '@mui/material';
import React from 'react';
import { useAppDispatch } from '../../../../../logic/store';
import { setClipboardText } from '../../../../../logic/store/clipboard';
import { enqueueNotification } from '../../../../../logic/store/notifications';
import { SPACING } from '../../../../styles/constants';

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
            const success = await dispatch(setClipboardText(text)).unwrap();
            if (success) {
                dispatch(enqueueNotification({ message: 'Path copied to clipboard', severity: 'success' }));
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
            dispatch(enqueueNotification({ message: 'Failed to copy path', severity: 'error' }));
        }
    };

    return (
        <Box sx={{ padding: SPACING.SMALL }}>
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
