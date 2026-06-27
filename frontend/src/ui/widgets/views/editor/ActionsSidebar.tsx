import React from 'react';
import { getLogger } from '../../../../logic/adapter';
import {
    selectActiveActionsTab, selectArmedActionId,
    selectBuildMode,
    selectBuilderActionAvailability,
    selectCatalogByCategory, selectInferenceRunning,
    selectSavedStacks,
    selectSidebarCollapsed, useAppDispatch, useAppSelector,
} from '../../../../logic/store';
import { addStep } from '../../../../logic/store/stacks/builder/slice';
import { armAction, enterBuildMode, setActiveActionsTab, setCurrentView } from '../../../../logic/store/ui';
import styles from './ActionsSidebar.module.css';

const logger = getLogger('ActionsSidebar');

const ActionsSidebar: React.FC = () => {
    const dispatch = useAppDispatch();
    const collapsed = useAppSelector(selectSidebarCollapsed);
    const categories = useAppSelector(selectCatalogByCategory);
    const armedId = useAppSelector(selectArmedActionId);
    const activeTab = useAppSelector(selectActiveActionsTab);
    const inferenceRunning = useAppSelector(selectInferenceRunning);
    const buildMode = useAppSelector(selectBuildMode);
    const savedStacks = useAppSelector(selectSavedStacks);
    const actionAvailability = useAppSelector(selectBuilderActionAvailability);

    if (collapsed) {
        return (
            <aside className={styles.iconStrip} aria-label="Actions sidebar (collapsed)">
                {categories.map(({ category }) => (
                    <button
                        key={category}
                        className={styles.iconBtn}
                        onClick={() => dispatch(setActiveActionsTab(category))}
                        aria-label={category}
                        title={category}
                    >
                        {category.charAt(0).toUpperCase()}
                    </button>
                ))}
            </aside>
        );
    }

    const activeGroup = categories.find((g) => g.category === activeTab) ?? categories[0] ?? null;

    const handleEnterBuildMode = () => {
        dispatch(enterBuildMode());
        logger.logInfo('Entered build mode');
    };

    const handleManage = () => {
        dispatch(setCurrentView('stacks'));
    };

    return (
        <aside className={styles.sidebar} aria-label="Actions sidebar">
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
                {savedStacks.map((stack) => (
                    <div key={stack.id} className={styles.stackRow}>
                        <span className={styles.stackIcon}>{stack.icon}</span>
                        <span className={styles.stackName}>{stack.name}</span>
                        <span className={styles.stackCount}>{stack.steps.length}</span>
                    </div>
                ))}
                <button
                    className={styles.buildStackBtn}
                    onClick={handleEnterBuildMode}
                    disabled={inferenceRunning}
                    aria-label="Build a stack"
                >
                    ＋ Build a stack
                </button>
            </div>

            {/* Build mode hint */}
            {buildMode && (
                <div className={styles.buildHint}>⌕ click to add a step…</div>
            )}

            {/* Category tabs */}
            <div className={styles.tabs}>
                {categories.map(({ category }) => (
                    <button
                        key={category}
                        className={`${styles.tab} ${activeTab === category ? styles.tabActive : ''}`}
                        onClick={() => {
                            dispatch(setActiveActionsTab(category));
                            logger.logInfo(`Sidebar tab: ${category}`);
                        }}
                        disabled={inferenceRunning}
                    >
                        {category}
                    </button>
                ))}
            </div>

            {/* Action rows */}
            <div className={styles.list}>
                {activeGroup?.actions.map((action) => {
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
                            {buildMode && avail?.addsNewInference && !avail.selected && (
                                <span className={styles.inferenceHint}>+1</span>
                            )}
                        </button>
                    );
                })}
                {(!activeGroup || activeGroup.actions.length === 0) && (
                    <div className={styles.emptyState}>No actions loaded</div>
                )}
            </div>
        </aside>
    );
};

ActionsSidebar.displayName = 'ActionsSidebar';
export default ActionsSidebar;
