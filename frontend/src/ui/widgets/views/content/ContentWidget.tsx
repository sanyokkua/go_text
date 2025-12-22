import React from 'react';
import { LogDebug } from '../../../../../wailsjs/runtime';
import { useAppDispatch, useAppSelector } from '../../../../logic/store/hooks';
import { copyToClipboard, pasteFromClipboard } from '../../../../logic/store/state/state_thunks';
import { setTextEditorInputContent, setTextEditorOutputContent } from '../../../../logic/store/state/StateReducer';
import LoadingOverlay from '../../base/LoadingOverlay';
import { ActionsAllGroupsWidget } from './actions/ActionsAllGroupsWidget';
import InputOutputContainerWidget from '../../editor/InputOutputContainerWidget';

const ContentWidget: React.FC = () => {
    const dispatch = useAppDispatch();
    const textEditorInputContent = useAppSelector((state) => state.state.textEditorInputContent);
    const textEditorOutputContent = useAppSelector((state) => state.state.textEditorOutputContent);
    const isProcessing = useAppSelector((state) => state.state.isProcessing);

    const onBtnInputPasteClick = () => {
        LogDebug('Pasting sample text');
        dispatch(pasteFromClipboard());
    };
    const onBtnInputClearClick = () => {
        LogDebug('Clearing input');
        dispatch(setTextEditorInputContent(''));
    };
    const onInputContentChange = (content: string) => {
        LogDebug('Input content changed to: ' + content);
        dispatch(setTextEditorInputContent(content));
    };
    const onBtnOutputCopyClick = () => {
        LogDebug('Copying output to clipboard');
        dispatch(copyToClipboard(textEditorOutputContent));
    };
    const onBtnOutputClearClick = () => {
        LogDebug('Clearing output');
        dispatch(setTextEditorOutputContent(''));
    };
    const onOutputContentChange = (content: string) => {
        LogDebug('Output content changed to: ' + content);
        dispatch(setTextEditorOutputContent(content));
    };
    const onBtnOutputUseAsInputClick = () => {
        LogDebug('Using output as input');
        dispatch(setTextEditorInputContent(textEditorOutputContent));
        dispatch(setTextEditorOutputContent(''));
    };

    return (
        <div className="app-content-container">
            <InputOutputContainerWidget
                inputContent={textEditorInputContent}
                outputContent={textEditorOutputContent}
                disabled={isProcessing}
                onInputContentChange={onInputContentChange}
                onInputPaste={onBtnInputPasteClick}
                onInputClear={onBtnInputClearClick}
                onOutputContentChange={onOutputContentChange}
                onOutputClear={onBtnOutputClearClick}
                onOutputCopy={onBtnOutputCopyClick}
                onOutputUseAsInput={onBtnOutputUseAsInputClick}
            />

            <ActionsAllGroupsWidget />
            <LoadingOverlay isLoading={isProcessing} />
        </div>
    );
};

ContentWidget.displayName = 'ContentWidget';
export default ContentWidget;
