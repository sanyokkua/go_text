import React, { ChangeEvent } from 'react';

type TextEditorProps = { content?: string; onContentChange?: (content: string) => void; disabled?: boolean };

const TextEditor: React.FC<TextEditorProps> = (props) => {
    const { content = '', onContentChange } = props;

    const handleChangeEvent = (e: ChangeEvent<HTMLTextAreaElement>) => {
        if (onContentChange) {
            onContentChange(e.target.value);
        }
    };
    return (
        <div className="text-editor-wrapper">
            <textarea value={content} onChange={handleChangeEvent} className="text-editor" disabled={props.disabled} />
        </div>
    );
};

TextEditor.displayName = 'TextEditor';
export default TextEditor;
