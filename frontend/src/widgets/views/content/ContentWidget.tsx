import React from 'react';
import { LogDebug } from '../../../../wailsjs/runtime';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import { copyToClipboard, pasteFromClipboard, processAction } from '../../../store/state/state_thunks';
import { setTextEditorInputContent, setTextEditorOutputContent } from '../../../store/state/StateReducer';
import LoadingOverlay from '../../base/LoadingOverlay';
import ButtonsOnlyWidget from '../../tabs/ButtonsOnlyWidget';
import { TabWidget } from '../../tabs/common/TabWidget';
import IOViewWidget from '../../text/IOViewWidget';

const ContentWidget: React.FC = () => {
    const dispatch = useAppDispatch();
    const actionGroups = useAppSelector((state) => state.state.actionGroups);
    const languageInputSelected = useAppSelector((state) => state.settingsState.languageInputSelected);
    const languageOutputSelected = useAppSelector((state) => state.settingsState.languageOutputSelected);
    const textEditorInputContent = useAppSelector((state) => state.state.textEditorInputContent);
    const textEditorOutputContent = useAppSelector((state) => state.state.textEditorOutputContent);
    const isProcessing = useAppSelector((state) => state.state.isProcessing);
    const tabNames = Object.keys(actionGroups);

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
    const onOperationBtnClick = (actionId: string) => {
        LogDebug(`Processing operation: ${actionId}`);
        dispatch(
            processAction({
                id: actionId,
                inputText: textEditorInputContent,
                outputText: textEditorOutputContent,
                inputLanguageId: languageInputSelected.itemId,
                outputLanguageId: languageOutputSelected.itemId,
            }),
        );
    };

    // Dynamically render tab content based on available groups
    const renderTabContent = () => {
        return tabNames.map((groupName, index) => {
            const buttons = actionGroups[groupName] || [];
            return <ButtonsOnlyWidget key={`${groupName}-${index}`} buttons={buttons} disabled={isProcessing} onBtnClick={onOperationBtnClick} />;
        });
    };

    return (
        <div className="app-content-container">
            <IOViewWidget
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

            <TabWidget tabs={tabNames} disabled={isProcessing}>
                {renderTabContent()}
            </TabWidget>
            <LoadingOverlay isLoading={isProcessing} />
        </div>
    );
};

ContentWidget.displayName = 'ContentWidget';
export default ContentWidget;
