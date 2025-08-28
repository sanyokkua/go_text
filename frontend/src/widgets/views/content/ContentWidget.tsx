import React from 'react';
import { SelectItem } from '../../base/Select';
import ButtonsOnlyWidget from '../../tabs/ButtonsOnlyWidget';
import { TabContentBtn } from '../../tabs/common/TabButtonsWidget';
import { TabWidget } from '../../tabs/common/TabWidget';
import TranslatingWidget from '../../tabs/TranslatingWidget';
import IOViewWidget from '../../text/IOViewWidget';

export interface ContentWidgetProps {
    proofreadingButtons: TabContentBtn[];
    formattingButtons: TabContentBtn[];
    translatingButtons: TabContentBtn[];
    summaryButtons: TabContentBtn[];
    inputContent: string;
    inputLanguages: SelectItem[];
    inputLanguage: SelectItem;
    outputContent: string;
    outputLanguages: SelectItem[];
    outputLanguage: SelectItem;
    onBtnInputPasteClick: () => void;
    onBtnInputClearClick: () => void;
    onBtnOutputCopyClick: () => void;
    onBtnOutputClearClick: () => void;
    onBtnOutputUseAsInputClick: () => void;
    onSelectInputLanguageChanged: (selectItem: SelectItem) => void;
    onSelectOutputLanguageChanged: (selectItem: SelectItem) => void;
    onInputContentChange: (content: string) => void;
    onOutputContentChange: (content: string) => void;
    onOperationBtnClick: (btnId: string) => void;
    disabled?: boolean;
}

const ContentWidget: React.FC<ContentWidgetProps> = (props) => {
    return (
        <div className="app-content-container">
            <IOViewWidget
                inputContent={props.inputContent}
                onInputContentChange={props.onInputContentChange}
                onInputPaste={props.onBtnInputPasteClick}
                onInputClear={props.onBtnInputClearClick}
                outputContent={props.outputContent}
                onOutputContentChange={props.onOutputContentChange}
                onOutputClear={props.onBtnOutputClearClick}
                onOutputCopy={props.onBtnOutputCopyClick}
                onOutputUseAsInput={props.onBtnOutputUseAsInputClick}
                disabled={props.disabled}
            />

            <TabWidget tabs={['Proofreading', 'Formatting', 'Translating', 'Summarization']} disabled={props.disabled}>
                <ButtonsOnlyWidget
                    buttons={props.proofreadingButtons}
                    onBtnClick={props.onOperationBtnClick}
                    disabled={props.disabled}
                />
                <ButtonsOnlyWidget
                    buttons={props.formattingButtons}
                    onBtnClick={props.onOperationBtnClick}
                    disabled={props.disabled}
                />
                <TranslatingWidget
                    buttons={props.translatingButtons}
                    onBtnClick={props.onOperationBtnClick}
                    inputLanguages={props.inputLanguages}
                    outputLanguages={props.outputLanguages}
                    selectedInputLanguage={props.inputLanguage}
                    selectedOutputLanguage={props.outputLanguage}
                    onInputLanguageChanged={props.onSelectInputLanguageChanged}
                    onOutputLanguageChanged={props.onSelectOutputLanguageChanged}
                    disabled={props.disabled}
                />
                <ButtonsOnlyWidget
                    buttons={props.summaryButtons}
                    onBtnClick={props.onOperationBtnClick}
                    disabled={props.disabled}
                />
            </TabWidget>
        </div>
    );
};

ContentWidget.displayName = 'ContentWidget';
export default ContentWidget;
