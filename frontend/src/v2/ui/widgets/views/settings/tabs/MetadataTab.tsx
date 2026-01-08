import React from 'react';
import { Box, IconButton, Paper, Tooltip, Typography } from '@mui/material';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { SPACING } from '../../../../styles/constants';

interface MetadataTabProps {
    metadata: { settingsFolder: string; settingsFile: string };
}

/**
 * Metadata Tab Component
 * Shows global settings information with copy functionality
 */
const MetadataTab: React.FC<MetadataTabProps> = ({ metadata }) => {
    const handleCopy = (text: string) => {
        navigator.clipboard.writeText(text).then(() => {
            console.log('Copied to clipboard:', text);
        });
    };

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: SPACING.STANDARD }}>
            <Paper elevation={0} sx={{ padding: SPACING.STANDARD, flex: 1 }}>
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: SPACING.STANDARD }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: SPACING.SMALL }}>
                        <Typography variant="body2" sx={{ fontWeight: 'medium', minWidth: '150px' }}>
                            Settings Folder:
                        </Typography>
                        <Typography variant="body1" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {metadata.settingsFolder}
                        </Typography>
                        <Tooltip title="Copy settings folder path">
                            <IconButton size="small" onClick={() => handleCopy(metadata.settingsFolder)} aria-label="copy settings folder">
                                <ContentCopyIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: SPACING.SMALL }}>
                        <Typography variant="body2" sx={{ fontWeight: 'medium', minWidth: '150px' }}>
                            Settings File:
                        </Typography>
                        <Typography variant="body1" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {metadata.settingsFile}
                        </Typography>
                        <Tooltip title="Copy settings file path">
                            <IconButton size="small" onClick={() => handleCopy(metadata.settingsFile)} aria-label="copy settings file">
                                <ContentCopyIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>
            </Paper>
        </Box>
    );
};

MetadataTab.displayName = 'MetadataTab';
export default MetadataTab;
