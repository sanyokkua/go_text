import React from 'react';
import { TabContentBtn, TabContentWidget } from './common/TabContentWidget';
import Select, { SelectItem } from '../inputs/Select';

type TranslatingWidgetProps = {
    buttons: TabContentBtn[];
    onBtnClick: (btnId: string) => void;

    inputLanguages: SelectItem[];
    outputLanguages: SelectItem[];
    onInputLanguageChanged: (selectItem: SelectItem) => void;
    onOutputLanguageChanged: (selectItem: SelectItem) => void;
    selectedInputLanguage: SelectItem;
    selectedOutputLanguage: SelectItem;
};


const TranslatingWidget: React.FC<TranslatingWidgetProps> = (props) => {
    const { inputLanguages, outputLanguages, buttons, onBtnClick, selectedInputLanguage, selectedOutputLanguage, onOutputLanguageChanged, onInputLanguageChanged } = props;

    return <div className='content-container-grid-child'>
        <div>
            <Select items={inputLanguages} selectedItem={selectedInputLanguage} onSelect={onInputLanguageChanged}/>
            <Select items={outputLanguages} selectedItem={selectedOutputLanguage} onSelect={onOutputLanguageChanged}/>
        </div>
        <TabContentWidget buttons={buttons} onBtnClick={onBtnClick} columns={2}/>
    </div>
};

TranslatingWidget.displayName = 'TranslatingWidget';
export default TranslatingWidget;