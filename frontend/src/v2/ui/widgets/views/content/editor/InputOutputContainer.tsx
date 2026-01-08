import { Box } from '@mui/material';
import React from 'react';
import { getLogger } from '../../../../../logic/adapter';
import TextPanel from './TextPanel';
import { useAppDispatch, useAppSelector } from '../../../../../logic/store';
import { clearInput, clearOutput, setInputContent, setOutputContent, useOutputAsInput } from '../../../../../logic/store/editor';
import { getClipboardText, setClipboardText } from '../../../../../logic/store/clipboard';
import { enqueueNotification } from '../../../../../logic/store/notifications';

const logger = getLogger('InputOutputContainer');

// Common style configurations
const panelContainerStyle = {
    width: '50%',
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    // overflow: 'hidden',
    minWidth: 0, // Prevent flex item overflow
};

/**
 * Input/Output Container - replaces the v1 InputOutputContainerWidget
 * Contains two side-by-side panels:
 * - Input panel (left) - 50% width, scrollable content
 * - Output panel (right) - 50% width, scrollable content
 */
const InputOutputContainer: React.FC = () => {
    const dispatch = useAppDispatch();
    const inputContent = useAppSelector((state) => state.editor.inputContent);
    const outputContent = useAppSelector((state) => state.editor.outputContent);
    const isAppBusy = useAppSelector((state) => state.ui.isAppBusy);

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
        <Box
            sx={{
                width: '100%',
                height: '100%',
                display: 'flex',
                gap: 2,
                overflow: 'hidden',
                padding: 1,
                minHeight: 0, // Important for flex children
            }}
        >
            {/* Input Panel - takes 50% width */}
            <Box sx={panelContainerStyle}>
                <TextPanel
                    title="Input"
                    headerColor="secondary.main"
                    content={inputContent}
                    onContentChange={(value) => dispatch(setInputContent(value))}
                    placeholder="Enter text here..."
                    buttons={[
                        { label: 'Clear', onClick: handleInputClear, color: 'error', disabled: isAppBusy },
                        { label: 'Paste', onClick: handleInputPaste, color: 'primary', disabled: isAppBusy },
                    ]}
                    isProcessing={isAppBusy}
                />
            </Box>

            {/* Output Panel - takes 50% width */}
            <Box sx={panelContainerStyle}>
                <TextPanel
                    title="Output"
                    headerColor="secondary.main"
                    content={outputContent}
                    onContentChange={(value) => dispatch(setOutputContent(value))}
                    placeholder="Output will appear here..."
                    buttons={[
                        { label: 'Clear', onClick: handleOutputClear, color: 'error', disabled: isAppBusy },
                        { label: 'Copy', onClick: handleOutputCopy, color: 'primary', disabled: isAppBusy },
                        { label: 'Use as Input', onClick: handleOutputUseAsInput, color: 'primary', disabled: isAppBusy || !outputContent },
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
