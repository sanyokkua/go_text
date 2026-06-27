import React, { memo } from 'react';
import {
    selectAboutInspectorData,
    selectAboutInspectorError,
    selectAboutInspectorLoading,
    selectAboutPreviewInputEnabled,
    selectAboutSelectedItemId,
    selectAboutSelectedItemType,
    useAppDispatch,
    useAppSelector,
} from '../../../../logic/store';
import { togglePreviewInput } from '../../../../logic/store/about/slice';
import styles from './PromptInspector.module.css';

const PromptInspector: React.FC = memo(function PromptInspector() {
    const dispatch = useAppDispatch();
    const selectedId = useAppSelector(selectAboutSelectedItemId);
    const selectedType = useAppSelector(selectAboutSelectedItemType);
    const loading = useAppSelector(selectAboutInspectorLoading);
    const data = useAppSelector(selectAboutInspectorData);
    const error = useAppSelector(selectAboutInspectorError);
    const previewInputEnabled = useAppSelector(selectAboutPreviewInputEnabled);

    if (!selectedId) {
        return (
            <div className={styles.empty}>
                <p>Select an action or stack to preview its prompt</p>
            </div>
        );
    }

    return (
        <div className={styles.root}>
            <div className={styles.titleRow}>
                <span className={styles.badge}>{selectedType}</span>
                <span className={styles.itemId}>{selectedId}</span>
            </div>

            {loading && (
                <div className={styles.spinner} aria-live="polite" aria-label="Loading preview">
                    Loading preview…
                </div>
            )}

            {!loading && error && (
                <div className={styles.error} role="alert">
                    {error}
                </div>
            )}

            {!loading && !error && data && (
                <div className={styles.body}>
                    <div className={styles.meta}>
                        <span className={styles.metaBadge}>
                            {data.inferences} inference{data.inferences !== 1 ? 's' : ''}
                        </span>
                        <span className={styles.metaBadge}>{data.kind}</span>
                    </div>

                    {data.groups.map((g, i) => (
                        <div key={i} className={styles.group}>
                            <div className={styles.groupHeader}>
                                <span>
                                    Inference {g.index + 1} — {g.family}
                                </span>
                                {g.appliedActions.map((a) => (
                                    <span key={a.id} className={styles.actionChip}>
                                        {a.name}
                                    </span>
                                ))}
                            </div>

                            <div className={styles.promptBlock}>
                                <div className={styles.promptLabel}>System</div>
                                <pre className={styles.promptText}>{g.systemPrompt}</pre>
                            </div>

                            <div className={styles.promptBlock}>
                                <div className={styles.promptLabel}>User</div>
                                <pre className={styles.promptText}>{g.userPrompt}</pre>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className={styles.footer}>
                <label className={styles.toggle}>
                    <input
                        type="checkbox"
                        checked={previewInputEnabled}
                        onChange={() => dispatch(togglePreviewInput())}
                        aria-label="Use current input for preview"
                    />
                    Use current input
                </label>
            </div>
        </div>
    );
});

PromptInspector.displayName = 'PromptInspector';
export default PromptInspector;
