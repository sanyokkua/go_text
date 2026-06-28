import React from 'react';
import { ClipboardServiceAdapter, getLogger } from '../../../../logic/adapter';
import { selectInferenceRunning, selectInputContent, useAppDispatch, useAppSelector } from '../../../../logic/store';
import { clearInput, setInputContent } from '../../../../logic/store/editor';
import { enqueueNotification } from '../../../../logic/store/notifications/slice';
import { parseError } from '../../../../logic/utils/error_utils';
import styles from './InputPane.module.css';

const logger = getLogger('InputPane');

const wordCount = (text: string): number => (text.trim() === '' ? 0 : text.trim().split(/\s+/).length);

const InputPane: React.FC = () => {
    const dispatch = useAppDispatch();
    const content = useAppSelector(selectInputContent);
    const inferenceRunning = useAppSelector(selectInferenceRunning);

    const handlePaste = async () => {
        try {
            const text = await ClipboardServiceAdapter.getText();
            if (text) {
                dispatch(setInputContent(text));
            } else {
                dispatch(enqueueNotification({ message: 'Clipboard is empty', severity: 'info' }));
            }
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Paste failed: ${err.message}`);
            dispatch(enqueueNotification({ message: 'Failed to paste', severity: 'error' }));
        }
    };

    const handleClear = () => {
        dispatch(clearInput());
    };

    return (
        <div className={styles.pane}>
            <div className={styles.header}>
                <span className={styles.title}>
                    Input <span className={styles.wordCount}>· {wordCount(content)} words</span>
                </span>
                <div className={styles.headerActions}>
                    <button
                        className={styles.iconBtn}
                        onClick={handlePaste}
                        disabled={inferenceRunning}
                        aria-label="Paste from clipboard"
                        title="Paste from clipboard"
                    >
                        📋
                    </button>
                    <button
                        className={styles.iconBtn}
                        onClick={handleClear}
                        disabled={inferenceRunning || !content}
                        aria-label="Clear input"
                        title="Clear input"
                    >
                        ✕
                    </button>
                </div>
            </div>
            <div className={styles.body}>
                <textarea
                    className={styles.textarea}
                    value={content}
                    onChange={(e) => dispatch(setInputContent(e.target.value))}
                    placeholder="Paste or type text here…"
                    disabled={inferenceRunning}
                    aria-label="Input text"
                />
            </div>
        </div>
    );
};

InputPane.displayName = 'InputPane';
export default InputPane;
