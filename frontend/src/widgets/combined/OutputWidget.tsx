import React from 'react';
import IOWidget from "./IOWidget";

type OutputWidgetWidgetProps = {
    content: string;
    onContentChange?: (content: string) => void;
    onCopy: () => void;
    onClear: () => void;
};

const CLEAR = 'Clear';
const COPY = 'Copy'
const BTN_IDS = [CLEAR, COPY];

const OutputWidget: React.FC<OutputWidgetWidgetProps> = (props) => {
    const {content = '', onContentChange = ()=>{}, onCopy, onClear} = props;

    const handleBtnClick = (btnId: string) => {
        if (btnId === CLEAR && onClear) {
            onClear();
            return;
        }
        if (btnId === COPY && onCopy) {
            onCopy();
            return;
        }
    }

    return <IOWidget header='Output'
                     content={content}
                     onContentChange={onContentChange}
                     buttons={BTN_IDS}
                     onButtonClick={handleBtnClick}/>
};

OutputWidget.displayName = 'OutputWidget';
export default OutputWidget;