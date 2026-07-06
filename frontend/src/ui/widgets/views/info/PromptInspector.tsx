import React, { memo } from 'react';
import { apperr } from '../../../../../wailsjs/go/models';
import { ClipboardServiceAdapter, getLogger } from '../../../../logic/adapter';
import {
    selectAboutInspectorData,
    selectAboutInspectorError,
    selectAboutInspectorLoading,
    selectAboutPreviewInputEnabled,
    selectAboutSelectedItemId,
    selectAboutSelectedItemType,
    selectActionCatalog,
    selectSavedStacks,
    useAppDispatch,
    useAppSelector,
} from '../../../../logic/store';
import { togglePreviewInput } from '../../../../logic/store/about/slice';
import type { AboutItemType } from '../../../../logic/store/about/types';
import { enqueueNotification } from '../../../../logic/store/notifications/slice';
import { parseError } from '../../../../logic/utils/error_utils';
import styles from './PromptInspector.module.css';

const logger = getLogger('PromptInspector');

/**
 * Builds the badge list for an inference group's parameters, omitting optional
 * fields (temperature, input/output language) when the backend leaves them unset.
 */
interface ParameterBadge {
    label: string;
    value: string;
}

function buildParameterBadges(params: apperr.PreviewParams): ParameterBadge[] {
    const optional: ParameterBadge[] = [];
    if (params.temperature !== undefined) {
        optional.push({ label: 'temperature', value: String(params.temperature) });
    }
    if (params.contextWindow !== undefined) {
        optional.push({ label: 'context', value: params.contextWindow.toLocaleString('en-US') });
    }
    if (params.inputLang) {
        optional.push({ label: 'input', value: params.inputLang });
    }
    if (params.outputLang) {
        optional.push({ label: 'output', value: params.outputLang });
    }

    return [
        { label: 'model', value: params.model },
        ...optional.filter((b) => b.label === 'temperature' || b.label === 'context'),
        { label: 'format', value: params.format },
        ...optional.filter((b) => b.label === 'input' || b.label === 'output'),
        { label: '', value: params.tokenParam },
        { label: 'stream', value: String(params.stream) },
    ];
}

/**
 * Resolves the human-readable name for the selected catalog item. Actions resolve
 * against the action catalog; stacks resolve against the saved-stacks list. Falls
 * back to the raw id when no match is found (e.g. a stale selection).
 */
function resolveDisplayName(id: string, type: AboutItemType | null, catalog: apperr.ActionMeta[], stacks: apperr.SavedStack[]): string {
    if (type === 'stack') {
        return stacks.find((s) => s.id === id)?.name ?? id;
    }
    return catalog.find((a) => a.id === id)?.name ?? id;
}

function titleCase(value: string): string {
    return value.length === 0 ? value : value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Joins every inference group's system/user prompt into one plain-text block so
 * "Copy all" can place the full composed preview on the clipboard in one shot.
 */
function buildFullPromptText(groups: apperr.PreviewGroup[]): string {
    return groups.map((g) => `Inference ${g.index + 1} — ${titleCase(g.family)}\nSystem:\n${g.systemPrompt}\n\nUser:\n${g.userPrompt}`).join('\n\n');
}

const PromptInspector: React.FC = memo(function PromptInspector() {
    const dispatch = useAppDispatch();
    const selectedId = useAppSelector(selectAboutSelectedItemId);
    const selectedType = useAppSelector(selectAboutSelectedItemType);
    const loading = useAppSelector(selectAboutInspectorLoading);
    const data = useAppSelector(selectAboutInspectorData);
    const error = useAppSelector(selectAboutInspectorError);
    const previewInputEnabled = useAppSelector(selectAboutPreviewInputEnabled);
    const catalog = useAppSelector(selectActionCatalog);
    const savedStacks = useAppSelector(selectSavedStacks);

    if (!selectedId) {
        return (
            <div className={styles.empty}>
                <p>Select an action or stack to preview its prompt</p>
            </div>
        );
    }

    const displayName = resolveDisplayName(selectedId, selectedType, catalog, savedStacks);

    const handleCopyAll = async () => {
        if (!data) return;
        try {
            const ok = await ClipboardServiceAdapter.setText(buildFullPromptText(data.groups));
            if (ok) {
                dispatch(enqueueNotification({ message: 'Copied full prompt to clipboard', severity: 'success' }));
            }
        } catch (copyError: unknown) {
            const err = parseError(copyError);
            logger.logError(`Copy all failed: ${err.message}`);
            dispatch(enqueueNotification({ message: 'Failed to copy prompt', severity: 'error' }));
        }
    };

    return (
        <div className={styles.root}>
            <div className={styles.titleRow}>
                <span className={styles.badge}>{selectedType}</span>
                <div className={styles.titleText}>
                    <span className={styles.itemName}>{displayName}</span>
                    <span className={styles.itemId}>{selectedId}</span>
                </div>
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
                        <button className={styles.copyAllBtn} onClick={handleCopyAll} type="button">
                            Copy all
                        </button>
                    </div>

                    {data.groups.map((g, i) => (
                        <div key={i} className={styles.group}>
                            <div className={styles.groupHeader}>
                                <span>Inference {g.index + 1}</span>
                                <span className={styles.familyChip}>{titleCase(g.family)}</span>
                                {g.appliedActions.map((a) => (
                                    <span key={a.id} className={styles.actionChip}>
                                        {a.name}
                                    </span>
                                ))}
                            </div>

                            <div className={styles.promptCards}>
                                <section className={styles.promptCard} aria-label="System prompt">
                                    <div className={styles.promptLabel}>System</div>
                                    <pre className={styles.promptText}>{g.systemPrompt}</pre>
                                </section>

                                <section className={styles.promptCard} aria-label="User prompt">
                                    <div className={styles.promptLabel}>User</div>
                                    <pre className={styles.promptText}>{g.userPrompt}</pre>
                                </section>
                            </div>

                            <div className={styles.params}>
                                <div className={styles.paramsCaption}>Parameters</div>
                                <div className={styles.paramsRow}>
                                    {buildParameterBadges(g.parameters).map((badge) => (
                                        <span key={`${badge.label}-${badge.value}`} className={styles.paramBadge}>
                                            {badge.label ? `${badge.label} ` : ''}
                                            <strong>{badge.value}</strong>
                                        </span>
                                    ))}
                                </div>
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
