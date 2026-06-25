import React from 'react';
import { ClipboardServiceAdapter, getLogger } from '../../../../../logic/adapter';
import { selectInputContent, selectIsAppBusy, selectOutputContent, useAppDispatch, useAppSelector } from '../../../../../logic/store';
import { clearInput, clearOutput, setInputContent, setOutputContent, useOutputAsInput } from '../../../../../logic/store/editor';
import { enqueueNotification } from '../../../../../logic/store/notifications';
import { parseError } from '../../../../../logic/utils/error_utils';
import TextPanel from './TextPanel';

const logger = getLogger('InputOutputContainer');

const panelStyle: React.CSSProperties = { width: '50%', height: '100%', display: 'flex', flexDirection: 'column', minWidth: 0 };

const InputOutputContainer: React.FC = () => {
    const dispatch = useAppDispatch();
    const inputContent = useAppSelector(selectInputContent);
    const outputContent = useAppSelector(selectOutputContent);
    const isAppBusy = useAppSelector(selectIsAppBusy);

    const handleInputClear = () => {
        dispatch(clearInput());
        logger.logInfo('Input cleared');
    };

    const handleInputPaste = async () => {
        try {
            logger.logInfo('Attempting to paste from clipboard');
            const text = await ClipboardServiceAdapter.getText();
            if (text) {
                dispatch(setInputContent(text));
                logger.logInfo('Pasted from clipboard successfully');
            } else {
                dispatch(enqueueNotification({ message: 'Clipboard is empty', severity: 'info' }));
            }
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Failed to paste from clipboard: ${err.message}`);
            dispatch(enqueueNotification({ message: 'Failed to paste from clipboard', severity: 'error' }));
        }
    };

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
            const success = await ClipboardServiceAdapter.setText(outputContent);
            if (success) {
                dispatch(enqueueNotification({ message: 'Copied to clipboard', severity: 'success' }));
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
        <div style={{ width: '100%', height: '100%', display: 'flex', gap: '16px', overflow: 'hidden', padding: '8px', minHeight: 0 }}>
            <div style={panelStyle}>
                <TextPanel
                    title="Input"
                    content={inputContent}
                    onContentChange={(v) => dispatch(setInputContent(v))}
                    placeholder="Enter text here..."
                    buttons={[
                        { label: 'Clear', onClick: handleInputClear, disabled: isAppBusy },
                        { label: 'Paste', onClick: handleInputPaste, disabled: isAppBusy },
                    ]}
                    isProcessing={isAppBusy}
                />
            </div>
            <div style={panelStyle}>
                <TextPanel
                    title="Output"
                    content={outputContent}
                    onContentChange={(v) => dispatch(setOutputContent(v))}
                    placeholder="Output will appear here..."
                    buttons={[
                        { label: 'Clear', onClick: handleOutputClear, disabled: isAppBusy },
                        { label: 'Copy', onClick: handleOutputCopy, disabled: isAppBusy },
                        { label: 'Use as Input', onClick: handleOutputUseAsInput, disabled: isAppBusy || !outputContent },
                    ]}
                    isProcessing={isAppBusy}
                    scrollToTop={true}
                />
            </div>
        </div>
    );
};

InputOutputContainer.displayName = 'InputOutputContainer';
export default InputOutputContainer;
