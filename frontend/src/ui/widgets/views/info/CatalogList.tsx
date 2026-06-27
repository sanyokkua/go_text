import React, { memo, useMemo, useState } from 'react';

import { apperr } from '../../../../../wailsjs/go/models';
import {
    selectAboutPreviewInputEnabled,
    selectAboutSelectedItemId,
    selectCatalogByCategory,
    selectInputContent,
    selectSavedStacks,
    useAppDispatch,
    useAppSelector,
} from '../../../../logic/store';
import { selectAboutItem } from '../../../../logic/store/about/slice';
import { previewPromptForInspector } from '../../../../logic/store/about/thunks';
import { selectAllSettings } from '../../../../logic/store/settings/selectors';
import styles from './CatalogList.module.css';

const CatalogList: React.FC = memo(function CatalogList() {
    const dispatch = useAppDispatch();
    const [query, setQuery] = useState('');

    const catalogByCategory = useAppSelector(selectCatalogByCategory);
    const savedStacks = useAppSelector(selectSavedStacks);
    const selectedId = useAppSelector(selectAboutSelectedItemId);
    const settings = useAppSelector(selectAllSettings);
    const previewInputEnabled = useAppSelector(selectAboutPreviewInputEnabled);
    const inputContent = useAppSelector(selectInputContent);

    const q = query.toLowerCase().trim();

    const filteredStacks = useMemo(
        () => (q ? savedStacks.filter((s) => s.name.toLowerCase().includes(q)) : savedStacks),
        [savedStacks, q],
    );

    const filteredCatalog = useMemo(
        () =>
            catalogByCategory
                .map(({ category, actions }) => ({
                    category,
                    actions: q
                        ? actions.filter(
                              (a) =>
                                  a.name.toLowerCase().includes(q) ||
                                  a.category.toLowerCase().includes(q),
                          )
                        : actions,
                }))
                .filter((g) => g.actions.length > 0),
        [catalogByCategory, q],
    );

    const handleSelect = (id: string, type: 'action' | 'stack') => {
        dispatch(selectAboutItem({ id, type }));
        const req = new apperr.PromptPreviewRequest({
            ...(type === 'action' ? { actionId: id } : { stackId: id }),
            useMarkdown: settings?.inferenceBaseConfig?.useMarkdownForOutput ?? false,
            inputLanguageId: settings?.languageConfig?.defaultInputLanguage ?? 'auto',
            outputLanguageId: settings?.languageConfig?.defaultOutputLanguage ?? 'auto',
            ...(previewInputEnabled && inputContent ? { sampleInput: inputContent } : {}),
        });
        dispatch(previewPromptForInspector(req));
    };

    const isEmpty = filteredStacks.length === 0 && filteredCatalog.length === 0;

    return (
        <div className={styles.root}>
            <input
                className={styles.search}
                placeholder="Search actions and stacks…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Filter actions and stacks"
            />
            <div className={styles.list} role="list">
                {filteredStacks.length > 0 && (
                    <div className={styles.group} role="group" aria-label="My Stacks">
                        <div className={styles.groupLabel}>My Stacks</div>
                        {filteredStacks.map((s) => (
                            <button
                                key={s.id}
                                className={`${styles.item} ${selectedId === s.id ? styles.selected : ''}`}
                                onClick={() => handleSelect(s.id, 'stack')}
                                aria-pressed={selectedId === s.id}
                                type="button"
                            >
                                {s.icon && (
                                    <span className={styles.icon} aria-hidden="true">
                                        {s.icon}
                                    </span>
                                )}
                                {s.name}
                            </button>
                        ))}
                    </div>
                )}

                {filteredCatalog.map(({ category, actions }) => (
                    <div key={category} className={styles.group} role="group" aria-label={category}>
                        <div className={styles.groupLabel}>{category}</div>
                        {actions.map((a) => (
                            <button
                                key={a.id}
                                className={`${styles.item} ${selectedId === a.id ? styles.selected : ''}`}
                                onClick={() => handleSelect(a.id, 'action')}
                                aria-pressed={selectedId === a.id}
                                type="button"
                            >
                                {a.name}
                            </button>
                        ))}
                    </div>
                ))}

                {isEmpty && (
                    <div className={styles.empty}>
                        {q ? `No results for "${query}"` : 'No actions available'}
                    </div>
                )}
            </div>
        </div>
    );
});

CatalogList.displayName = 'CatalogList';
export default CatalogList;
