import { Box, Button, Divider, Paper, TextField, Typography } from '@mui/material';
import React from 'react';
import { getLogger } from '../../../../../logic/adapter';

const logger = getLogger('TextPanel');

/**
 * Button configuration interface
 */
interface TextPanelButton {
    label: string;
    onClick: () => void;
    color?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
    disabled?: boolean;
}

/**
 * Text Panel Props interface
 */
interface TextPanelProps {
    title: string;
    headerColor: string;
    content: string;
    onContentChange: (content: string) => void;
    placeholder?: string;
    buttons: TextPanelButton[];
    isProcessing?: boolean;
}

/**
 * Text Panel - A configurable panel component that can be used as both Input and Output panels
 * Contains:
 * - Header with title (configurable color)
 * - Text area for content (controlled via props)
 * - Action buttons (configurable)
 */
const TextPanel: React.FC<TextPanelProps> = ({
    title,
    headerColor,
    content,
    onContentChange,
    placeholder = '',
    buttons = [],
    isProcessing = false,
}) => {
    const handleContentChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        logger.logDebug(`Content changed in ${title} panel, new length: ${event.target.value.length}`);
        onContentChange(event.target.value);
    };

    return (
        <Paper
            elevation={0}
            sx={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden', border: '1px solid', borderColor: 'divider' }}
        >
            {/* Header - Smaller */}
            <Box
                sx={{
                    padding: '1px 12px', // Reduced padding
                    backgroundColor: headerColor,
                    color: 'white',
                    minHeight: 'unset', // Remove minimum height
                }}
            >
                <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>
                    {title}
                </Typography>
            </Box>

            {/* Text Area - Scrollable content */}
            <Box
                sx={{
                    flex: 1,
                    padding: 1,
                    overflow: 'auto',
                    minHeight: 0, // Important for flex children
                }}
            >
                <TextField
                    value={content}
                    onChange={handleContentChange}
                    placeholder={placeholder}
                    multiline
                    fullWidth
                    sx={{
                        '& .MuiOutlinedInput-root': {
                            '& fieldset': { border: 'none' },
                            '&:hover fieldset': { border: 'none' },
                            '&.Mui-focused fieldset': { border: 'none' },
                            // Make TextField take full height
                            'height': '100%',
                            'display': 'flex',
                            'flexDirection': 'column',
                        },
                        '& .MuiInputBase-inputMultiline': { height: '100%', overflow: 'auto' },
                    }}
                    inputProps={{ style: { padding: '8px', fontFamily: 'Roboto, sans-serif', fontSize: '14px', height: '100%' } }}
                />
            </Box>

            {/* Action Buttons - Smaller, Clear first with warning color */}
            <Divider />
            <Box sx={{ display: 'flex', justifyContent: 'flex-start', padding: '4px', gap: 1 }}>
                {buttons.map((button, index) => (
                    <Button
                        key={index}
                        variant="outlined"
                        size="small"
                        color={button.color || 'inherit'}
                        onClick={button.onClick}
                        disabled={button.disabled !== undefined ? button.disabled : isProcessing}
                        sx={{ minWidth: '80px' }} // Smaller minimum width
                    >
                        {button.label}
                    </Button>
                ))}
            </Box>
        </Paper>
    );
};

TextPanel.displayName = 'TextPanel';
export default TextPanel;
