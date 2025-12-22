import React from 'react';
import EditorWidget from './EditorWidget';

type InputWidgetProps = {
    content: string;
    onContentChange?: (content: string) => void;
    onPaste: () => void;
    onClear: () => void;
    disabled?: boolean;
};

const CLEAR = 'Clear';
const PASTE = 'Paste';
const BTN_IDS = [CLEAR, PASTE];

const InputWidget: React.FC<InputWidgetProps> = (props) => {
    const { content = '', onContentChange = () => {}, onPaste, onClear, disabled } = props;

    const handleBtnClick = (btnId: string) => {
        if (btnId === CLEAR && onClear) {
            onClear();
            return;
        }
        if (btnId === PASTE && onPaste) {
            onPaste();
            return;
        }
    };

    return (
        <EditorWidget
            header="Input"
            content={content}
            onContentChange={onContentChange}
            buttons={BTN_IDS}
            onButtonClick={handleBtnClick}
            disabled={disabled ?? false}
        />
    );
};

InputWidget.displayName = 'InputWidget';
export default InputWidget;
