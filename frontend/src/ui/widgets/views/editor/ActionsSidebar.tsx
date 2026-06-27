import React from 'react';
import { getLogger } from '../../../../logic/adapter';
import {
    selectActiveActionsTab, selectArmedActionId,
    selectCatalogByCategory, selectInferenceRunning,
    selectSidebarCollapsed, useAppDispatch, useAppSelector,
} from '../../../../logic/store';
import { armAction, setActiveActionsTab } from '../../../../logic/store/ui';
import styles from './ActionsSidebar.module.css';

const logger = getLogger('ActionsSidebar');

const ActionsSidebar: React.FC = () => {
    const dispatch = useAppDispatch();
    const collapsed = useAppSelector(selectSidebarCollapsed);
    const categories = useAppSelector(selectCatalogByCategory);
    const armedId = useAppSelector(selectArmedActionId);
    const activeTab = useAppSelector(selectActiveActionsTab);
    const inferenceRunning = useAppSelector(selectInferenceRunning);

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

    return (
        <aside className={styles.sidebar} aria-label="Actions sidebar">
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
                {activeGroup?.actions.map((action) => (
                    <button
                        key={action.id}
                        className={`${styles.actionRow} ${armedId === action.id ? styles.actionArmed : ''}`}
                        onClick={() => {
                            if (!inferenceRunning) {
                                dispatch(armAction(action.id));
                                logger.logInfo(`Armed action: ${action.id}`);
                            }
                        }}
                        disabled={inferenceRunning}
                        aria-pressed={armedId === action.id}
                        title={action.directive}
                    >
                        {armedId === action.id && <span className={styles.check}>✓</span>}
                        <span className={styles.actionName}>{action.name}</span>
                    </button>
                ))}
                {(!activeGroup || activeGroup.actions.length === 0) && (
                    <div className={styles.emptyState}>No actions loaded</div>
                )}
            </div>
        </aside>
    );
};

ActionsSidebar.displayName = 'ActionsSidebar';
export default ActionsSidebar;
