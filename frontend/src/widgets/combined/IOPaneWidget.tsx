import React from 'react';
import InputWidget from './InputWidget';
import OutputWidget from './OutputWidget';

type IOPaneWidgetProps = {
    inputContent: string;
    onInputContentChange?: (content: string) => void;
    onInputPaste: () => void;
    onInputClear: () => void;

    outputContent: string;
    onOutputContentChange?: (content: string) => void;
    onOutputClear: () => void;
    onOutputCopy: () => void;
};

const IOPaneWidget: React.FC<IOPaneWidgetProps> = (props) => {
    const {inputContent,onInputContentChange,onInputPaste,onInputClear,outputContent,onOutputContentChange,onOutputClear,onOutputCopy } = props;

    return <div className="io-two-columns">
        <InputWidget content={inputContent} onPaste={onInputPaste} onClear={onInputClear} onContentChange={onInputContentChange} />
        <OutputWidget content={outputContent} onCopy={onOutputCopy} onClear={onOutputClear} onContentChange={onOutputContentChange} />
    </div>

};

IOPaneWidget.displayName = 'IOPaneWidget';
export default IOPaneWidget;
