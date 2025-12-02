import React from 'react';
import { LogDebug } from '../../../../wailsjs/runtime';
import { appStateActionProcess, appStateProcessCopyToClipboard, appStateProcessPasteFromClipboard } from '../../../store/app/app_state_thunks';
import {
    setSelectedInputLanguage,
    setSelectedOutputLanguage,
    setTextEditorInputContent,
    setTextEditorOutputContent,
} from '../../../store/app/AppStateReducer';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import LoadingOverlay from '../../base/LoadingOverlay';
import { SelectItem } from '../../base/Select';
import ButtonsOnlyWidget from '../../tabs/ButtonsOnlyWidget';
import { TabWidget } from '../../tabs/common/TabWidget';
import TranslatingWidget from '../../tabs/TranslatingWidget';
import IOViewWidget from '../../text/IOViewWidget';

const ContentWidget: React.FC = () => {
    const dispatch = useAppDispatch();
    const buttonsForProofreading = useAppSelector((state) => state.appState.buttonsForProofreading);
    const buttonsForFormatting = useAppSelector((state) => state.appState.buttonsForFormatting);
    const buttonsForTranslating = useAppSelector((state) => state.appState.buttonsForTranslating);
    const buttonsForSummarization = useAppSelector((state) => state.appState.buttonsForSummarization);
    const buttonsForTransforming = useAppSelector((state) => state.appState.buttonsForTransforming);
    const textEditorInputContent = useAppSelector((state) => state.appState.textEditorInputContent);
    const textEditorOutputContent = useAppSelector((state) => state.appState.textEditorOutputContent);
    const selectedInputLanguage = useAppSelector((state) => state.appState.selectedInputLanguage);
    const selectedOutputLanguage = useAppSelector((state) => state.appState.selectedOutputLanguage);
    const availableInputLanguages = useAppSelector((state) => state.appState.availableInputLanguages);
    const availableOutputLanguages = useAppSelector((state) => state.appState.availableOutputLanguages);
    const isProcessing = useAppSelector((state) => state.appState.isProcessing);

    const onBtnInputPasteClick = () => {
        LogDebug('Pasting sample text');
        dispatch(appStateProcessPasteFromClipboard());
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
        dispatch(appStateProcessCopyToClipboard(textEditorOutputContent));
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
    const onSelectInputLanguageChanged = (item: SelectItem) => {
        LogDebug(`Input language changed to: ${item.displayText}`);
        dispatch(setSelectedInputLanguage(item));
    };
    const onSelectOutputLanguageChanged = (item: SelectItem) => {
        LogDebug(`Output language changed to: ${item.displayText}`);
        dispatch(setSelectedOutputLanguage(item));
    };
    const onOperationBtnClick = (actionId: string) => {
        LogDebug(`Processing operation: ${actionId}`);
        dispatch(
            appStateActionProcess({
                actionId: actionId,
                actionInput: textEditorInputContent,
                actionOutput: textEditorOutputContent,
                actionInputLanguage: selectedInputLanguage.itemId,
                actionOutputLanguage: selectedOutputLanguage.itemId,
            }),
        );
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

            <TabWidget tabs={['Proofreading', 'Formatting', 'Translating', 'Summarization', 'Transforming']} disabled={isProcessing}>
                <ButtonsOnlyWidget buttons={buttonsForProofreading} disabled={isProcessing} onBtnClick={onOperationBtnClick} />
                <ButtonsOnlyWidget buttons={buttonsForFormatting} disabled={isProcessing} onBtnClick={onOperationBtnClick} />
                <TranslatingWidget
                    buttons={buttonsForTranslating}
                    inputLanguages={availableInputLanguages}
                    outputLanguages={availableOutputLanguages}
                    selectedInputLanguage={selectedInputLanguage}
                    selectedOutputLanguage={selectedOutputLanguage}
                    disabled={isProcessing}
                    onBtnClick={onOperationBtnClick}
                    onInputLanguageChanged={onSelectInputLanguageChanged}
                    onOutputLanguageChanged={onSelectOutputLanguageChanged}
                />
                <ButtonsOnlyWidget buttons={buttonsForSummarization} disabled={isProcessing} onBtnClick={onOperationBtnClick} />
                <ButtonsOnlyWidget buttons={buttonsForTransforming} disabled={isProcessing} onBtnClick={onOperationBtnClick} />
            </TabWidget>
            <LoadingOverlay isLoading={isProcessing} />
        </div>
    );
};

ContentWidget.displayName = 'ContentWidget';
export default ContentWidget;
