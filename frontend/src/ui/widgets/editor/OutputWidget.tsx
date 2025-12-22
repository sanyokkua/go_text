import React from 'react';
import EditorWidget from './EditorWidget';

type OutputWidgetWidgetProps = {
    content: string;
    onContentChange?: (content: string) => void;
    onCopy: () => void;
    onClear: () => void;
    onUseAsInput: () => void;
    disabled?: boolean;
};

const CLEAR = 'Clear';
const COPY = 'Copy';
const USE_AS_INPUT = 'Use as input';
const BTN_IDS = [CLEAR, COPY, USE_AS_INPUT];

const OutputWidget: React.FC<OutputWidgetWidgetProps> = (props) => {
    const { content = '', onContentChange = () => {}, onCopy, onClear, onUseAsInput } = props;

    const handleBtnClick = (btnId: string) => {
        if (btnId === CLEAR && onClear) {
            onClear();
            return;
        }
        if (btnId === COPY && onCopy) {
            onCopy();
            return;
        }
        if (btnId === USE_AS_INPUT && onUseAsInput) {
            onUseAsInput();
            return;
        }
    };

    return (
        <EditorWidget
            header="Output"
            content={content}
            onContentChange={onContentChange}
            buttons={BTN_IDS}
            onButtonClick={handleBtnClick}
            disabled={props.disabled ?? false}
        />
    );
};

OutputWidget.displayName = 'OutputWidget';
export default OutputWidget;
