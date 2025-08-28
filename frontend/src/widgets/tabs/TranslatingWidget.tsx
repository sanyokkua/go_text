import React from 'react';
import Select, { SelectItem } from '../base/Select';
import { TabButtonsWidget, TabContentBtn } from './common/TabButtonsWidget';

type TranslatingWidgetProps = {
    buttons: TabContentBtn[];
    onBtnClick: (btnId: string) => void;
    inputLanguages: SelectItem[];
    outputLanguages: SelectItem[];
    onInputLanguageChanged: (selectItem: SelectItem) => void;
    onOutputLanguageChanged: (selectItem: SelectItem) => void;
    selectedInputLanguage: SelectItem;
    selectedOutputLanguage: SelectItem;
    disabled?: boolean;
};

const TranslatingWidget: React.FC<TranslatingWidgetProps> = (props) => {
    return (
        <div className="content-container-grid-child">
            <div className="lang-select-grid-container">
                <Select
                    items={props.inputLanguages}
                    selectedItem={props.selectedInputLanguage}
                    onSelect={props.onInputLanguageChanged}
                    block={true}
                    colorStyle={'secondary-color'}
                    size={'small'}
                    disabled={props.disabled}
                />
                <Select
                    items={props.outputLanguages}
                    selectedItem={props.selectedOutputLanguage}
                    onSelect={props.onOutputLanguageChanged}
                    block={true}
                    colorStyle={'secondary-color'}
                    size={'small'}
                    disabled={props.disabled}
                />
            </div>
            <TabButtonsWidget buttons={props.buttons} onBtnClick={props.onBtnClick} disabled={props.disabled} />
        </div>
    );
};

TranslatingWidget.displayName = 'TranslatingWidget';
export default TranslatingWidget;
