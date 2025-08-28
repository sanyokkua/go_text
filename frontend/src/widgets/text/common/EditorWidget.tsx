import React from 'react';
import Button from '../.././base/Button';
import TextEditor from '../.././base/TextEditor';

type IOWidgetProps = {
    header: string;
    buttons: string[];
    content: string;
    onContentChange?: (content: string) => void;
    onButtonClick?: (btnId: string) => void;
    disabled?: boolean;
};

const EditorWidget: React.FC<IOWidgetProps> = (props) => {
    const { header = '', buttons = [], content = '', onContentChange, onButtonClick } = props;

    const btnClickHandler = (btnId: string) => {
        if (onButtonClick) {
            onButtonClick(btnId);
        }
    };

    const buttonsToRender = buttons.map((btnId) => {
        return (
            <Button
                key={btnId}
                text={btnId}
                size="tiny"
                variant="solid"
                colorStyle="tertiary-color"
                onClick={() => btnClickHandler(btnId)}
                disabled={props.disabled}
            />
        );
    });

    return (
        <div>
            <div className="io-horizontal-bar">
                <h4>{header}</h4>
                <div>{buttonsToRender}</div>
            </div>
            <TextEditor content={content} onContentChange={onContentChange} disabled={props.disabled} />
        </div>
    );
};

EditorWidget.displayName = 'EditorWidget';
export default EditorWidget;
