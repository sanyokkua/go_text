import React, { useMemo, useState } from 'react';
import { getLogger } from '../../../../logic/adapter';
import {
    selectArmedActionId,
    selectBuildMode,
    selectBuilderActionAvailability,
    selectCatalogByCategory,
    selectInferenceRunning,
    selectSavedStacks,
    selectSidebarCollapsed,
    useAppDispatch,
    useAppSelector,
} from '../../../../logic/store';
import { addStep } from '../../../../logic/store/stacks/builder/slice';
import { armAction, enterBuildMode, setCurrentView } from '../../../../logic/store/ui';
import { StackGlyph } from '../../../components/StackGlyph';
import styles from './ActionsSidebar.module.css';

const logger = getLogger('ActionsSidebar');

const ActionsSidebar: React.FC = () => {
    const dispatch = useAppDispatch();
    const collapsed = useAppSelector(selectSidebarCollapsed);
    const categories = useAppSelector(selectCatalogByCategory);
    const armedId = useAppSelector(selectArmedActionId);
    const inferenceRunning = useAppSelector(selectInferenceRunning);
    const buildMode = useAppSelector(selectBuildMode);
    const savedStacks = useAppSelector(selectSavedStacks);
    const actionAvailability = useAppSelector(selectBuilderActionAvailability);

    const [query, setQuery] = useState('');

    const normalizedQuery = query.trim().toLowerCase();

    const filteredStacks = useMemo(() => {
        if (normalizedQuery === '') return savedStacks;
        return savedStacks.filter((s) => s.name.toLowerCase().includes(normalizedQuery));
    }, [savedStacks, normalizedQuery]);

    const filteredGroups = useMemo(() => {
        if (normalizedQuery === '') return categories;
        return categories
            .map((group) => ({
                ...group,
                actions: group.actions.filter((a) => a.name.toLowerCase().includes(normalizedQuery)),
            }))
            .filter((group) => group.actions.length > 0);
    }, [categories, normalizedQuery]);

    // Collapsed: render nothing — the sidebar is fully hidden until reopened from the AppBar hamburger.
    if (collapsed) {
        return null;
    }

    const handleEnterBuildMode = () => {
        dispatch(enterBuildMode());
        logger.logInfo('Entered build mode');
    };

    const handleManage = () => {
        dispatch(setCurrentView('stacks'));
    };

    return (
        <aside className={styles.sidebar} aria-label="Actions sidebar">
            {/* Search */}
            <div className={styles.searchWrap}>
                <input
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search actions & stacks…"
                    aria-label="Search actions and stacks"
                    className={styles.searchBox}
                />
            </div>

            <div className={styles.scrollArea}>
                {/* My Stacks section */}
                <div className={styles.stacksSection}>
                    <div className={styles.stacksHeader}>
                        <span className={styles.stacksTitle}>My Stacks</span>
                        {savedStacks.length > 0 && (
                            <button className={styles.manageLink} onClick={handleManage} aria-label="Manage stacks">
                                Manage ›
                            </button>
                        )}
                    </div>
                    {filteredStacks.map((stack) => (
                        <div key={stack.id} className={styles.stackRow}>
                            <StackGlyph icon={stack.icon} className={styles.stackIcon} />
                            <span className={styles.stackName}>{stack.name}</span>
                            <span className={styles.stackCount}>{stack.steps.length}</span>
                        </div>
                    ))}
                    {normalizedQuery === '' && (
                        <button className={styles.buildStackBtn} onClick={handleEnterBuildMode} disabled={inferenceRunning} aria-label="Build a stack">
                            ＋ Build a stack
                        </button>
                    )}
                </div>

                {/* Build mode hint */}
                {buildMode && <div className={styles.buildHint}>⌕ click to add a step…</div>}

                {/* Action groups — every family is shown as its own section */}
                {filteredGroups.map((group) => (
                    <div key={group.category} className={styles.group}>
                        <div className={styles.groupHeader}>
                            <span className={styles.groupTitle}>{group.category}</span>
                            <span className={styles.groupCount}>{group.actions.length}</span>
                        </div>
                        <div className={styles.list}>
                            {group.actions.map((action) => {
                                const avail = buildMode
                                    ? (actionAvailability[action.id] ?? { selected: false, disabled: false, disabledReason: '', addsNewInference: false })
                                    : null;
                                const isSelected = buildMode ? avail?.selected : armedId === action.id;
                                const isDisabled = buildMode ? (avail?.disabled ?? false) || inferenceRunning : inferenceRunning;
                                const titleText = buildMode && avail?.disabledReason ? avail.disabledReason : action.directive;

                                return (
                                    <button
                                        key={action.id}
                                        className={`${styles.actionRow} ${isSelected ? styles.actionArmed : ''} ${isDisabled && !isSelected ? styles.actionDisabled : ''}`}
                                        onClick={() => {
                                            if (isDisabled || isSelected) return;
                                            if (buildMode) {
                                                dispatch(addStep(action.id));
                                                logger.logInfo(`Build: added step ${action.id}`);
                                            } else {
                                                dispatch(armAction(action.id));
                                                logger.logInfo(`Armed action: ${action.id}`);
                                            }
                                        }}
                                        disabled={isDisabled && !isSelected}
                                        aria-pressed={isSelected ?? false}
                                        title={titleText}
                                    >
                                        {isSelected && <span className={styles.check}>✓</span>}
                                        <span className={styles.actionName}>{action.name}</span>
                                        {buildMode && avail?.addsNewInference && !avail.selected && <span className={styles.inferenceHint}>+1</span>}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}

                {filteredGroups.length === 0 && <div className={styles.emptyState}>No actions found</div>}
            </div>
        </aside>
    );
};

ActionsSidebar.displayName = 'ActionsSidebar';
export default ActionsSidebar;
