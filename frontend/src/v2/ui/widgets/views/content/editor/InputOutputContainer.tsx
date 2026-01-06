import { Box, Paper } from '@mui/material';
import React from 'react';
import TextPanel from './TextPanel';
import { getLogger } from '../../../../../logic/adapter';

const logger = getLogger('InputOutputContainer');

// Common style configurations
const panelContainerStyle = {
    width: '50%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    minWidth: 0, // Prevent flex item overflow
};

/**
 * Input/Output Container - replaces the v1 InputOutputContainerWidget
 * Contains two side-by-side panels:
 * - Input panel (left) - 50% width, scrollable content
 * - Output panel (right) - 50% width, scrollable content
 */
const InputOutputContainer: React.FC = () => {
    // State management for both panels
    const [inputContent, setInputContent] = React.useState('');
    const [outputContent, setOutputContent] = React.useState('');
    const [isProcessing, setIsProcessing] = React.useState(false);

    // Input panel button handlers
    const handleInputClear = () => {
        setInputContent('');
        logger.logInfo('Input cleared');
    };

    const handleInputPaste = () => {
        // TODO: Implement clipboard paste functionality
        logger.logInfo('Paste from clipboard - will implement later');
    };

    // Output panel button handlers
    const handleOutputClear = () => {
        setOutputContent('');
        logger.logInfo('Output cleared');
    };

    const handleOutputCopy = () => {
        // TODO: Implement clipboard copy functionality
        logger.logInfo('Copy to clipboard - will implement later');
    };

    const handleOutputUseAsInput = () => {
        setInputContent(outputContent);
        logger.logInfo('Output used as input');
    };

    return (
        <Paper
            elevation={1}
            sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                gap: 1,
                overflow: 'hidden',
                padding: 0,
                minHeight: 0, // Important for flex children
            }}
        >
            {/* Input Panel - takes 50% width */}
            <Box sx={panelContainerStyle}>
                <TextPanel
                    title="Input"
                    headerColor="primary.main"
                    content={inputContent}
                    onContentChange={setInputContent}
                    placeholder="Enter text here..."
                    buttons={[
                        { label: 'Clear', onClick: handleInputClear, color: 'warning', disabled: isProcessing },
                        { label: 'Paste', onClick: handleInputPaste, disabled: isProcessing },
                    ]}
                    isProcessing={isProcessing}
                />
            </Box>

            {/* Output Panel - takes 50% width */}
            <Box sx={panelContainerStyle}>
                <TextPanel
                    title="Output"
                    headerColor="secondary.main"
                    content={outputContent}
                    onContentChange={setOutputContent}
                    placeholder="Output will appear here..."
                    buttons={[
                        { label: 'Clear', onClick: handleOutputClear, color: 'warning', disabled: isProcessing },
                        { label: 'Copy', onClick: handleOutputCopy, disabled: isProcessing },
                        { label: 'Use as Input', onClick: handleOutputUseAsInput, disabled: isProcessing || !outputContent },
                    ]}
                    isProcessing={isProcessing}
                />
            </Box>
        </Paper>
    );
};

InputOutputContainer.displayName = 'InputOutputContainer';
export default InputOutputContainer;
