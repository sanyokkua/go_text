import React from 'react';
import { getLogger } from '../../../../../logic/adapter';
import { parseError } from '../../../../../logic/utils/error_utils';

const logger = getLogger('TextPanel');

interface TextPanelButton {
    label: string;
    onClick: () => void;
    disabled?: boolean;
}

interface TextPanelProps {
    title: string;
    content: string;
    onContentChange: (content: string) => void;
    placeholder?: string;
    buttons: TextPanelButton[];
    isProcessing?: boolean;
    scrollToTop?: boolean;
    /** Legacy props accepted for call-site compat; unused in stub */
    headerColor?: string;
    headerTextColor?: string;
}

const TextPanel: React.FC<TextPanelProps> = ({ title, content, onContentChange, placeholder = '', buttons = [], isProcessing = false, scrollToTop = false }) => {
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    React.useEffect(() => {
        if (scrollToTop && textareaRef.current) {
            const id = setTimeout(() => {
                try {
                    if (textareaRef.current) { textareaRef.current.scrollTop = 0; }
                } catch (error: unknown) {
                    const err = parseError(error);
                    logger.logError(`Failed to scroll to top: ${err.message}`);
                }
            }, 50);
            return () => clearTimeout(id);
        }
    }, [content, scrollToTop]);

    return (
        <div style={{ overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column', border: '1px solid var(--line)', borderRadius: 'var(--radius-lg)', background: 'var(--surface)' }}>
            <div style={{ background: 'var(--teal-dark)', color: '#fff', textAlign: 'center', padding: '2px 0', fontWeight: 'bold', fontSize: '0.875rem' }}>
                {title}
            </div>
            <div style={{ flex: 1, overflow: 'auto' }}>
                <textarea
                    ref={textareaRef}
                    value={content}
                    onChange={(e) => { logger.logDebug(`Content changed in ${title} panel`); onContentChange(e.target.value); }}
                    placeholder={placeholder}
                    autoComplete="off"
                    style={{ width: '100%', height: '100%', resize: 'none', border: 'none', fontFamily: 'var(--mono)', fontSize: '0.9rem', overflow: 'auto', background: 'transparent', color: 'var(--ink)', padding: 'var(--space-2)' }}
                />
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '2px var(--space-2)', gap: 'var(--space-2)', background: 'var(--teal-dark)' }}>
                {buttons.map((btn, i) => (
                    <button
                        key={i}
                        onClick={btn.onClick}
                        disabled={btn.disabled ?? isProcessing}
                        style={{ background: 'none', border: '1px solid rgba(255,255,255,0.5)', color: '#fff', cursor: btn.disabled ?? isProcessing ? 'not-allowed' : 'pointer', borderRadius: 'var(--radius-sm)', padding: '2px 10px', fontSize: '0.75rem', opacity: btn.disabled ?? isProcessing ? 0.5 : 1 }}
                    >
                        {btn.label}
                    </button>
                ))}
            </div>
        </div>
    );
};

TextPanel.displayName = 'TextPanel';
export default TextPanel;
