import { Box, Button, Divider, Paper, TextareaAutosize, Typography } from '@mui/material';
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
    scrollToTop?: boolean; // New prop to control auto-scrolling
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
    scrollToTop = false,
}) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    // Scroll to top when content changes and scrollToTop is enabled
    React.useEffect(() => {
        if (scrollToTop && textareaRef.current) {
            logger.logDebug(`Scrolling to top for ${title} panel, content length: ${content.length}`);

            // Try multiple approaches to ensure scrolling works
            const scrollToTopWithFallback = () => {
                if (textareaRef.current) {
                    try {
                        // First try direct scrollTop
                        textareaRef.current.scrollTop = 0;

                        // If that doesn't work, try scrolling to top of parent container
                        const parent = textareaRef.current.parentElement;
                        if (parent) {
                            parent.scrollTop = 0;
                        }

                        logger.logDebug(`Scrolled to top successfully, scrollTop: ${textareaRef.current.scrollTop}`);
                    } catch (error) {
                        logger.logError(`Failed to scroll to top: ${error}`);
                    }
                }
            };

            // Use setTimeout to ensure DOM is fully updated
            const timeoutId = setTimeout(scrollToTopWithFallback, 50);

            return () => clearTimeout(timeoutId);
        }
    }, [content, scrollToTop]);
    const handleContentChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        logger.logDebug(`Content changed in ${title} panel, new length: ${event.target.value.length}`);
        onContentChange(event.target.value);
    };

    return (
        <Paper
            square={false}
            variant="elevation"
            elevation={1}
            sx={{
                'overflow': 'hidden',
                'height': '100%',
                'display': 'flex',
                'flexDirection': 'column',
                'borderRadius': '24px',
                '&:hover': { boxShadow: 3 },
            }}
        >
            {/* Header - Smaller */}
            <Box
                sx={{
                    // borderRadius: '16px 16px 0 0',
                    backgroundColor: headerColor,
                    textAlign: 'center',
                    color: 'white',
                    minHeight: 'unset', // Remove minimum height
                }}
            >
                <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: '0.875rem' }}>
                    {title}
                </Typography>
            </Box>

            {/* Text Area - Scrollable content */}
            <Box sx={{ flex: 1, padding: 0, overflow: 'auto' }}>
                <TextareaAutosize
                    ref={textareaRef}
                    value={content}
                    onChange={handleContentChange}
                    placeholder={placeholder}
                    style={{ width: '100%', height: '100%', resize: 'none', fontFamily: 'monospace', overflow: 'auto', fontSize: '0.875rem' }}
                />
            </Box>

            {/* Action Buttons - Smaller, Clear first with warning color */}
            <Divider />
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', padding: '10px', gap: 1 }}>
                {buttons.map((button, index) => (
                    <Button
                        key={index}
                        variant="contained"
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
