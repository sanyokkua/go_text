import React from 'react';
import { LogDebug } from '../../../../wailsjs/runtime';
import { processAction, copyToClipboard, pasteFromClipboard } from '../../../store/state/state_thunks';
import {
    setTextEditorInputContent,
    setTextEditorOutputContent,
} from '../../../store/state/StateReducer';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import LoadingOverlay from '../../base/LoadingOverlay';
import { SelectItem } from '../../base/Select';
import ButtonsOnlyWidget from '../../tabs/ButtonsOnlyWidget';
import { TabWidget } from '../../tabs/common/TabWidget';
import TranslatingWidget from '../../tabs/TranslatingWidget';
import IOViewWidget from '../../text/IOViewWidget';
import { setLanguageInputSelected, setLanguageOutputSelected } from '../../../store/cfg/SettingsStateReducer';

const ContentWidget: React.FC = () => {
    const dispatch = useAppDispatch();
    const actionGroups = useAppSelector((state) => state.state.actionGroups);
    const languages = useAppSelector((state) => state.settingsState.languageList);
    const languageInputSelected = useAppSelector((state) => state.settingsState.languageInputSelected);
    const languageOutputSelected = useAppSelector((state) => state.settingsState.languageOutputSelected);

    const textEditorInputContent = useAppSelector((state) => state.state.textEditorInputContent);
    const textEditorOutputContent = useAppSelector((state) => state.state.textEditorOutputContent);
    const isProcessing = useAppSelector((state) => state.state.isProcessing);

    // Dynamically extract all available group names from the backend response
    const availableGroupNames = Object.keys(actionGroups);
    
    // Use backend group names exactly as they are - no formatting or assumptions
    // The backend is responsible for providing user-friendly names
    const tabNames = availableGroupNames;
    
    // Check if a group is the translation group (needs special handling)
    // This is the ONLY business logic we need - everything else is just display
    const isTranslationGroup = (groupName: string): boolean => {
        return groupName.toLowerCase() === 'translate';
    };

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
    const onSelectInputLanguageChanged = (item: SelectItem) => {
        LogDebug(`Input language changed to: ${item.displayText}`);
        dispatch(setLanguageInputSelected(item));
    };
    const onSelectOutputLanguageChanged = (item: SelectItem) => {
        LogDebug(`Output language changed to: ${item.displayText}`);
        dispatch(setLanguageOutputSelected(item));
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
        return availableGroupNames.map((groupName, index) => {
            const buttons = actionGroups[groupName] || [];
            
            if (isTranslationGroup(groupName)) {
                // Special handling for translation group with language selectors
                return (
                    <TranslatingWidget
                        key={`${groupName}-${index}`}
                        buttons={buttons}
                        inputLanguages={languages}
                        outputLanguages={languages}
                        selectedInputLanguage={languageInputSelected}
                        selectedOutputLanguage={languageOutputSelected}
                        disabled={isProcessing}
                        onBtnClick={onOperationBtnClick}
                        onInputLanguageChanged={onSelectInputLanguageChanged}
                        onOutputLanguageChanged={onSelectOutputLanguageChanged}
                    />
                );
            } else {
                // Standard button-only widget for other groups
                return (
                    <ButtonsOnlyWidget
                        key={`${groupName}-${index}`}
                        buttons={buttons}
                        disabled={isProcessing}
                        onBtnClick={onOperationBtnClick}
                    />
                );
            }
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
