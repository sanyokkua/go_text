import React from 'react';
import IOWidget from "./IOWidget";

type InputWidgetProps = {
    content: string;
    onContentChange?: (content: string) => void;
    onPaste: () => void;
    onClear: () => void;
};

const CLEAR = 'Clear';
const PASTE = 'Paste'
const BTN_IDS = [CLEAR, PASTE];

const InputWidget: React.FC<InputWidgetProps> = (props) => {
    const {content = '', onContentChange = ()=>{}, onPaste, onClear} = props;

    const handleBtnClick = (btnId: string) => {
        if (btnId === CLEAR && onClear) {
            onClear();
            return;
        }
        if (btnId === PASTE && onPaste) {
            onPaste();
            return;
        }
    }

    return <IOWidget header='Input'
                     content={content}
                     onContentChange={onContentChange}
                     buttons={BTN_IDS}
                     onButtonClick={handleBtnClick}/>
};

InputWidget.displayName = 'InputWidget';
export default InputWidget;