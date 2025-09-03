import React, { useEffect, useState } from 'react';
import { LogDebug } from '../../wailsjs/runtime';
import { setInputContent, setInputLanguage, setOutputContent, setOutputLanguage } from '../store/app/AppStateReducer';
import {
    actionProcessAction,
    appStateDefaultInputLanguageGet,
    appStateDefaultOutputLanguageGet,
    appStateFormattingButtonsGet,
    appStateInputLanguagesGet,
    appStateOutputLanguagesGet,
    appStateProofreadingButtonsGet,
    appStateSummaryButtonsGet,
    appStateTranslateButtonsGet,
    fetchCurrentSettings,
    processCopyToClipboard,
    processPasteFromClipboard,
} from '../store/app/thunks';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { SelectItem } from './base/Select';
import AppMainView from './views/AppMainView';

const AppMainController: React.FC = () => {
    const dispatch = useAppDispatch();
    const {
        buttonsForProofreading,
        buttonsForFormatting,
        buttonsForTranslating,
        buttonsForSummarization,

        textEditorInputContent,
        textEditorOutputContent,
        selectedInputLanguage,
        selectedOutputLanguage,
        availableInputLanguages,
        availableOutputLanguages,
        currentTask,
        currentProvider,
        currentModelName,
        isProcessing,
    } = useAppSelector((state) => state.appState);

    // Local state management
    const [showSettings, setShowSettings] = useState(false);

    useEffect(() => {
        dispatch(appStateProofreadingButtonsGet());
        dispatch(appStateFormattingButtonsGet());
        dispatch(appStateTranslateButtonsGet());
        dispatch(appStateSummaryButtonsGet());

        dispatch(appStateDefaultInputLanguageGet());
        dispatch(appStateDefaultOutputLanguageGet());

        dispatch(appStateInputLanguagesGet());
        dispatch(appStateOutputLanguagesGet());
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
        dispatch(processCopyToClipboard(textEditorOutputContent));
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
        dispatch(setInputContent(textEditorOutputContent));
        dispatch(setOutputContent(''));
    };

    // Operation handlers
    const onOperationBtnClick = (op: string) => {
        LogDebug(`Processing operation: ${op}`);
        dispatch(
            actionProcessAction({
                actionId: op,
                actionInput: textEditorInputContent,
                actionOutput: textEditorOutputContent,
                actionInputLanguage: selectedInputLanguage.itemId,
                actionOutputLanguage: selectedOutputLanguage.itemId,
            }),
        );
    };

    return (
        <AppMainView
            proofreadingButtons={buttonsForProofreading}
            formattingButtons={buttonsForFormatting}
            translatingButtons={buttonsForTranslating}
            summaryButtons={buttonsForSummarization}
            currentProviderName={currentProvider}
            currentModelName={currentModelName}
            currentTaskName={currentTask}
            inputContent={textEditorInputContent}
            inputLanguages={availableInputLanguages}
            inputLanguage={selectedInputLanguage}
            outputContent={textEditorOutputContent}
            outputLanguages={availableOutputLanguages}
            outputLanguage={selectedOutputLanguage}
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
