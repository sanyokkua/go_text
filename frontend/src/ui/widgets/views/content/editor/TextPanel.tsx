import { Box, Button, Paper, TextareaAutosize, Typography } from '@mui/material';
import React from 'react';
import { getLogger } from '../../../../../logic/adapter';
import { parseError } from '../../../../../logic/utils/error_utils';

const logger = getLogger('TextPanel');

/**
 * Button configuration interface
 */
interface TextPanelButton {
    label: string;
    onClick: () => void;
    buttonColor?: 'inherit' | 'primary' | 'secondary' | 'success' | 'error' | 'info' | 'warning';
    variant?: 'text' | 'outlined' | 'contained';
    disabled?: boolean;
}

/**
 * Text Panel Props interface
 */
interface TextPanelProps {
    title: string;
    headerColor: string;
    headerTextColor: string;
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
    headerTextColor,
    content,
    onContentChange,
    placeholder = '',
    buttons = [],
    isProcessing = false,
    scrollToTop = false,
}) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    // Scroll to the top when content changes and scrollToTop is enabled
    React.useEffect(() => {
        if (scrollToTop && textareaRef.current) {
            logger.logDebug(`Scrolling to top for ${title} panel, content length: ${content.length}`);

            // Try multiple approaches to ensure scrolling works
            const scrollToTopWithFallback = () => {
                if (textareaRef.current) {
                    try {
                        // First, try direct scrollTop
                        textareaRef.current.scrollTop = 0;

                        // If that doesn't work, try scrolling to top of parent container
                        const parent = textareaRef.current.parentElement;
                        if (parent) {
                            parent.scrollTop = 0;
                        }

                        logger.logDebug(`Scrolled to top successfully, scrollTop: ${textareaRef.current.scrollTop}`);
                    } catch (error: unknown) {
                        const err = parseError(error);
                        logger.logError(`Failed to scroll to top: ${err.message}`);
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
            sx={{ 'overflow': 'hidden', 'height': '100%', 'display': 'flex', 'flexDirection': 'column', '&:hover': { boxShadow: 6 } }}
        >
            {/* Header - Smaller */}
            <Box
                sx={{
                    backgroundColor: headerColor,
                    textAlign: 'center',
                    color: headerTextColor,
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
                    autoComplete="off"
                    autoCapitalize="off"
                    autoCorrect="off"
                    style={{
                        width: '100%',
                        height: '100%',
                        resize: 'none',
                        border: 'none',
                        fontFamily: 'monospace',
                        overflow: 'auto',
                        fontSize: '1rem',
                        backgroundColor: 'rgba(255, 255, 255, 0.5)',
                    }}
                />
            </Box>

            {/* Action Buttons - Smaller, Clear first with warning color */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', padding: '1px', gap: 2, backgroundColor: headerColor }}>
                {buttons.map((button, index) => (
                    <Button
                        key={index}
                        variant={button.variant || 'contained'}
                        size="small"
                        color={button.buttonColor || 'inherit'}
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
