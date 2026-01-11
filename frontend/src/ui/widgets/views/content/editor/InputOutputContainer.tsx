import { Box } from '@mui/material';
import React from 'react';
import { getLogger } from '../../../../../logic/adapter';
import { selectInputContent, selectIsAppBusy, selectOutputContent, useAppDispatch, useAppSelector } from '../../../../../logic/store';
import { getClipboardText, setClipboardText } from '../../../../../logic/store/clipboard';
import { clearInput, clearOutput, setInputContent, setOutputContent, useOutputAsInput } from '../../../../../logic/store/editor';
import { enqueueNotification } from '../../../../../logic/store/notifications';
import TextPanel from './TextPanel';

const logger = getLogger('InputOutputContainer');

// Common style configurations
const panelContainerStyle = {
    width: '50%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    minWidth: 0, // Prevent flex item overflow
};

/**
 * Input/Output Container - replaces the v1 InputOutputContainerWidget
 * Contains two side-by-side panels:
 * - Input panel (left) - 50% width, scrollable content
 * - Output panel (right) - 50% width, scrollable content
 *
 * Key Responsibilities:
 * - Managing input/output text content
 * - Providing clipboard integration (paste input, copy output)
 * - Handling text manipulation actions (clear, use as input)
 * - State management for editor content
 * - User notifications for clipboard operations
 *
 * Design Features:
 * - Equal 50/50 split layout
 * - Reusable TextPanel components for each side
 * - Disabled button states during processing
 * - Comprehensive error handling for clipboard operations
 */
const InputOutputContainer: React.FC = () => {
    const dispatch = useAppDispatch();
    const inputContent = useAppSelector(selectInputContent);
    const outputContent = useAppSelector(selectOutputContent);
    const isAppBusy = useAppSelector(selectIsAppBusy);

    // Input panel button handlers
    const handleInputClear = () => {
        dispatch(clearInput());
        logger.logInfo('Input cleared');
    };

    const handleInputPaste = async () => {
        try {
            logger.logInfo('Attempting to paste from clipboard');
            const clipboardText = await dispatch(getClipboardText()).unwrap();

            if (clipboardText) {
                dispatch(setInputContent(clipboardText));
                logger.logInfo('Pasted from clipboard successfully');
            } else {
                dispatch(enqueueNotification({ message: 'Clipboard is empty', severity: 'info' }));
            }
        } catch (error) {
            logger.logError(`Failed to paste from clipboard: ${error}`);
            dispatch(enqueueNotification({ message: 'Failed to paste from clipboard', severity: 'error' }));
        }
    };

    // Output panel button handlers
    const handleOutputClear = () => {
        dispatch(clearOutput());
        logger.logInfo('Output cleared');
    };

    const handleOutputCopy = async () => {
        try {
            if (!outputContent) {
                dispatch(enqueueNotification({ message: 'No content to copy', severity: 'info' }));
                return;
            }

            logger.logInfo('Attempting to copy to clipboard');
            const success = await dispatch(setClipboardText(outputContent)).unwrap();

            if (success) {
                dispatch(enqueueNotification({ message: 'Copied to clipboard', severity: 'success' }));
                logger.logInfo('Copied to clipboard successfully');
            } else {
                dispatch(enqueueNotification({ message: 'Failed to copy to clipboard', severity: 'error' }));
            }
        } catch (error) {
            logger.logError(`Failed to copy to clipboard: ${error}`);
            dispatch(enqueueNotification({ message: 'Failed to copy to clipboard', severity: 'error' }));
        }
    };

    const handleOutputUseAsInput = () => {
        if (outputContent) {
            dispatch(useOutputAsInput());
            logger.logInfo('Output used as input');
        }
    };

    return (
        <Box sx={{ width: '100%', height: '100%', display: 'flex', gap: 2, overflow: 'hidden', padding: 1, minHeight: 0 }}>
            {/* Input Panel - takes 50% width */}
            <Box sx={panelContainerStyle}>
                <TextPanel
                    title="Input"
                    headerColor="primary.main"
                    headerTextColor="primary.contrastText"
                    content={inputContent}
                    onContentChange={(value) => dispatch(setInputContent(value))}
                    placeholder="Enter text here..."
                    buttons={[
                        { label: 'Clear', onClick: handleInputClear, buttonColor: 'error', variant: 'text', disabled: isAppBusy },
                        { label: 'Paste', onClick: handleInputPaste, buttonColor: 'secondary', variant: 'text', disabled: isAppBusy },
                    ]}
                    isProcessing={isAppBusy}
                />
            </Box>

            {/* Output Panel - takes 50% width */}
            <Box sx={panelContainerStyle}>
                <TextPanel
                    title="Output"
                    headerColor="primary.main"
                    headerTextColor="primary.contrastText"
                    content={outputContent}
                    onContentChange={(value) => dispatch(setOutputContent(value))}
                    placeholder="Output will appear here..."
                    buttons={[
                        { label: 'Clear', onClick: handleOutputClear, buttonColor: 'error', variant: 'text', disabled: isAppBusy },
                        { label: 'Copy', onClick: handleOutputCopy, buttonColor: 'secondary', variant: 'text', disabled: isAppBusy },
                        {
                            label: 'Use as Input',
                            onClick: handleOutputUseAsInput,
                            buttonColor: 'secondary',
                            variant: 'text',
                            disabled: isAppBusy || !outputContent,
                        },
                    ]}
                    isProcessing={isAppBusy}
                    scrollToTop={true}
                />
            </Box>
        </Box>
    );
};

InputOutputContainer.displayName = 'InputOutputContainer';
export default InputOutputContainer;
