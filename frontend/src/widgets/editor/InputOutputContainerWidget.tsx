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
    onOutputUseAsInput: () => void;
    disabled?: boolean;
};

const InputOutputContainerWidget: React.FC<IOPaneWidgetProps> = (props) => {
    return (
        <div className="io-two-columns">
            <InputWidget
                content={props.inputContent}
                onPaste={props.onInputPaste}
                onClear={props.onInputClear}
                onContentChange={props.onInputContentChange}
                disabled={props.disabled}
            />
            <OutputWidget
                content={props.outputContent}
                onCopy={props.onOutputCopy}
                onClear={props.onOutputClear}
                onUseAsInput={props.onOutputUseAsInput}
                onContentChange={props.onOutputContentChange}
                disabled={props.disabled}
            />
        </div>
    );
};

InputOutputContainerWidget.displayName = 'InputOutputContainerWidget';
export default InputOutputContainerWidget;
