import React from 'react';

import { SelectItem } from '../base/Select';
import { TabContentBtn } from '../tabs/common/TabButtonsWidget';
import BottomBarWidget from './content/BottomBarWidget';
import ContentWidget from './content/ContentWidget';
import TopBarWidget from './content/TopBarWidget';

export interface AppMainWidgetProps {
    proofreadingButtons: TabContentBtn[];
    formattingButtons: TabContentBtn[];
    translatingButtons: TabContentBtn[];
    summaryButtons: TabContentBtn[];
    currentProviderName: string;
    currentModelName: string;
    currentTaskName: string;
    inputContent: string;
    inputLanguages: SelectItem[];
    inputLanguage: SelectItem;
    outputContent: string;
    outputLanguages: SelectItem[];
    outputLanguage: SelectItem;
    onBtnSettingsClick: () => void;
    onBtnInputPasteClick: () => void;
    onBtnInputClearClick: () => void;
    onBtnOutputCopyClick: () => void;
    onBtnOutputClearClick: () => void;
    onBtnOutputUseAsInputClick: () => void;
    onInputLanguageChanged: (selectItem: SelectItem) => void;
    onOutputLanguageChanged: (selectItem: SelectItem) => void;
    onInputContentChange: (content: string) => void;
    onOutputContentChange: (content: string) => void;
    onOperationBtnClick: (btnId: string) => void;
    disabled?: boolean;
}

const AppMainView: React.FC<AppMainWidgetProps> = (props) => {
    return (
        <div className="app-main-container">
            <TopBarWidget onButtonClick={props.onBtnSettingsClick} disabled={props.disabled} />

            <ContentWidget
                proofreadingButtons={props.proofreadingButtons}
                formattingButtons={props.formattingButtons}
                translatingButtons={props.translatingButtons}
                summaryButtons={props.summaryButtons}
                inputContent={props.inputContent}
                inputLanguages={props.inputLanguages}
                inputLanguage={props.inputLanguage}
                outputContent={props.outputContent}
                outputLanguages={props.outputLanguages}
                outputLanguage={props.outputLanguage}
                onBtnInputPasteClick={props.onBtnInputPasteClick}
                onBtnInputClearClick={props.onBtnInputClearClick}
                onBtnOutputCopyClick={props.onBtnOutputCopyClick}
                onBtnOutputClearClick={props.onBtnOutputClearClick}
                onBtnOutputUseAsInputClick={props.onBtnOutputUseAsInputClick}
                onSelectInputLanguageChanged={props.onInputLanguageChanged}
                onSelectOutputLanguageChanged={props.onOutputLanguageChanged}
                onInputContentChange={props.onInputContentChange}
                onOutputContentChange={props.onOutputContentChange}
                onOperationBtnClick={props.onOperationBtnClick}
                disabled={props.disabled}
            />

            <BottomBarWidget
                task={props.currentTaskName}
                model={props.currentModelName}
                provider={props.currentProviderName}
            />
        </div>
    );
};

AppMainView.displayName = 'AppMainView';
export default AppMainView;
