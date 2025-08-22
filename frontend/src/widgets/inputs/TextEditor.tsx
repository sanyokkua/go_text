import React, {ChangeEvent} from 'react';

type TextEditorProps = {
    content?: string;
    mono?: boolean;
    rows?: number;
    onContentChange?: (content: string) => void;
};

const TextEditor: React.FC<TextEditorProps> = (props) => {
    const {content = '', rows = 3, onContentChange, mono = false} = props;

    const handleChangeEvent = (e: ChangeEvent<HTMLTextAreaElement>) => {
        if (onContentChange) {
            onContentChange(e.target.value);
        }
    };

    const styles: string[] = [];
    styles.push('text-editor');
    if (mono) {
        styles.push('text-font-mono');
    }
    const finalStyles = styles.join(' ').trim();

    return <textarea value={content} onChange={handleChangeEvent} rows={rows} className={finalStyles}/>;
};

TextEditor.displayName = 'TextEditor';
export default TextEditor;