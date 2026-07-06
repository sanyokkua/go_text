import React, { useEffect } from 'react';
import { apperr } from '../../../../../wailsjs/go/models';
import { ClipboardServiceAdapter, getLogger } from '../../../../logic/adapter';
import {
    selectArmedTarget,
    selectInferenceBaseConfig,
    selectInferenceRunning,
    selectInputContent,
    selectLanguageConfig,
    selectModelConfig,
    selectTokenEstimate,
    useAppDispatch,
    useAppSelector,
} from '../../../../logic/store';
import { clearInput, clearTokenEstimate, previewTokenEstimate, setInputContent } from '../../../../logic/store/editor';
import { enqueueNotification } from '../../../../logic/store/notifications/slice';
import { parseError } from '../../../../logic/utils/error_utils';
import styles from './InputPane.module.css';

const logger = getLogger('InputPane');

const TOKEN_ESTIMATE_DEBOUNCE_MS = 350;
const CONTEXT_WINDOW_WARN_RATIO = 0.8;

const wordCount = (text: string): number => (text.trim() === '' ? 0 : text.trim().split(/\s+/).length);

const tokenEstimateClassName = (tokenEstimate: number | null, useContextWindow: boolean, contextWindow: number): string => {
    if (tokenEstimate === null || !useContextWindow || contextWindow <= 0) return styles.tokenEstimate;
    const ratio = tokenEstimate / contextWindow;
    if (ratio >= 1) return `${styles.tokenEstimate} ${styles.tokenEstimateErr}`;
    if (ratio >= CONTEXT_WINDOW_WARN_RATIO) return `${styles.tokenEstimate} ${styles.tokenEstimateWarn}`;
    return styles.tokenEstimate;
};

const InputPane: React.FC = () => {
    const dispatch = useAppDispatch();
    const content = useAppSelector(selectInputContent);
    const inferenceRunning = useAppSelector(selectInferenceRunning);
    const armedTarget = useAppSelector(selectArmedTarget);
    const tokenEstimate = useAppSelector(selectTokenEstimate);
    const modelConfig = useAppSelector(selectModelConfig);
    const languageConfig = useAppSelector(selectLanguageConfig);
    const inferenceBaseConfig = useAppSelector(selectInferenceBaseConfig);

    const armedKind = armedTarget.kind;
    const armedId = armedTarget.kind === 'none' ? undefined : armedTarget.id;
    const inputLanguageId = languageConfig?.defaultInputLanguage ?? 'auto';
    const outputLanguageId = languageConfig?.defaultOutputLanguage ?? 'auto';
    const useMarkdown = inferenceBaseConfig?.useMarkdownForOutput ?? false;

    useEffect(() => {
        if (armedKind === 'none' || !armedId) {
            dispatch(clearTokenEstimate());
            return;
        }
        const timeoutId = setTimeout(() => {
            const req = new apperr.PromptPreviewRequest({
                ...(armedKind === 'action' ? { actionId: armedId } : { stackId: armedId }),
                sampleInput: content,
                inputLanguageId,
                outputLanguageId,
                useMarkdown,
            });
            dispatch(previewTokenEstimate(req));
        }, TOKEN_ESTIMATE_DEBOUNCE_MS);
        return () => clearTimeout(timeoutId);
    }, [dispatch, content, armedKind, armedId, inputLanguageId, outputLanguageId, useMarkdown]);

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
                    {tokenEstimate !== null && (
                        <span
                            className={tokenEstimateClassName(tokenEstimate, modelConfig?.useContextWindow ?? false, modelConfig?.contextWindow ?? 0)}
                        >
                            {' '}
                            · ~{tokenEstimate.toLocaleString()} tokens
                        </span>
                    )}
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
