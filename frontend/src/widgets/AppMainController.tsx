import React, { useEffect, useState } from 'react';
import { LogDebug } from '../../wailsjs/runtime';
import { setInputContent, setInputLanguage, setOutputContent, setOutputLanguage } from '../store/app/AppStateReducer';
import {
    fetchCurrentSettings,
    fetchDefaultInputLanguage,
    fetchDefaultOutputLanguage,
    fetchFormattingButtons,
    fetchInputLanguages,
    fetchOutputLanguages,
    fetchProofreadingButtons,
    fetchSummaryButtons,
    fetchTranslateButtons,
    processCopyToClipboard,
    processOperation,
    processPasteFromClipboard,
} from '../store/app/thunks';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { SelectItem } from './base/Select';
import AppMainView from './views/AppMainView';

const AppMainController: React.FC = () => {
    const dispatch = useAppDispatch();
    const {
        proofreadingButtons,
        formattingButtons,
        summaryButtons,
        translateButtons,
        isProcessing,
        currentTask,
        inputLanguages,
        inputLanguage,
        outputLanguages,
        outputLanguage,
        outputContent,
        inputContent,
        currentModelName,
        currentProvider,
    } = useAppSelector((state) => state.appState);

    // Local state management
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        dispatch(fetchInputLanguages());
        dispatch(fetchOutputLanguages());
        dispatch(fetchProofreadingButtons());
        dispatch(fetchSummaryButtons());
        dispatch(fetchTranslateButtons());
        dispatch(fetchFormattingButtons());
        dispatch(fetchDefaultInputLanguage());
        dispatch(fetchDefaultOutputLanguage());
        dispatch(fetchCurrentSettings());
    }, [dispatch]);

    const onSettingsClick = () => {
        LogDebug('Settings clicked');
        setShowSettings(!showSettings);
    };

    // Input operations
    const onInputPasteBtnClick = () => {
        LogDebug('Pasting sample text');
        dispatch(processPasteFromClipboard());
    };
    const onBtnInputClearClick = () => {
        LogDebug('Clearing input');
        dispatch(setInputContent(''));
    };
    const onInputContentChange = (content: string) => {
        dispatch(setInputContent(content));
    };
    const onInputLanguageChanged = (item: SelectItem) => {
        LogDebug(`Input language changed to: ${item.displayText}`);
        dispatch(setInputLanguage(item));
    };

    // Output operations
    const onBtnOutputCopyClick = () => {
        LogDebug('Copying output to clipboard');
        dispatch(processCopyToClipboard(outputContent));
    };
    const onBtnOutputClearClick = () => {
        LogDebug('Clearing output');
        dispatch(setOutputContent(''));
    };
    const onOutputContentChange = (content: string) => {
        dispatch(setOutputContent(content));
    };
    const onOutputLanguageChanged = (item: SelectItem) => {
        LogDebug(`Output language changed to: ${item.displayText}`);
        dispatch(setOutputLanguage(item));
    };
    const onBtnUseOutputAsInputClick = () => {
        LogDebug('Using output as input');
        dispatch(setInputContent(outputContent));
        dispatch(setOutputContent(''));
    };

    // Operation handlers
    const onOperationBtnClick = (op: string) => {
        LogDebug(`Processing operation: ${op}`);
        dispatch(
            processOperation({
                actionId: op,
                actionInput: inputContent,
                actionOutput: outputContent,
                actionInputLanguage: inputLanguage.itemId,
                actionOutputLanguage: outputLanguage.itemId,
            }),
        );
    };

    return (
        <AppMainView
            proofreadingButtons={proofreadingButtons}
            formattingButtons={formattingButtons}
            translatingButtons={translateButtons}
            summaryButtons={summaryButtons}
            currentProviderName={currentProvider}
            currentModelName={currentModelName}
            currentTaskName={currentTask}
            inputContent={inputContent}
            inputLanguages={inputLanguages}
            inputLanguage={inputLanguage}
            outputContent={outputContent}
            outputLanguages={outputLanguages}
            outputLanguage={outputLanguage}
            onBtnSettingsClick={onSettingsClick}
            onBtnInputPasteClick={onInputPasteBtnClick}
            onBtnInputClearClick={onBtnInputClearClick}
            onBtnOutputCopyClick={onBtnOutputCopyClick}
            onBtnOutputClearClick={onBtnOutputClearClick}
            onInputLanguageChanged={onInputLanguageChanged}
            onOutputLanguageChanged={onOutputLanguageChanged}
            onInputContentChange={onInputContentChange}
            onOutputContentChange={onOutputContentChange}
            onBtnOutputUseAsInputClick={onBtnUseOutputAsInputClick}
            onOperationBtnClick={onOperationBtnClick}
            disabled={isProcessing}
            showSettings={showSettings}
        />
    );
};
AppMainController.displayName = 'AppMainController';

export default AppMainController;
