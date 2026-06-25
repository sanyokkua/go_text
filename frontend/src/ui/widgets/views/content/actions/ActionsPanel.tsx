import React from 'react';
import { getLogger } from '../../../../../logic/adapter';
import {
    selectActiveActionsTab,
    selectAllSettings,
    selectInputContent,
    selectIsAppBusy,
    selectPromptGroups,
    useAppDispatch,
    useAppSelector,
} from '../../../../../logic/store';
import { processPrompt } from '../../../../../logic/store/actions';
import { enqueueNotification } from '../../../../../logic/store/notifications';
import { setActiveActionsTab, setAppBusy, setCurrentTask } from '../../../../../logic/store/ui';
import { parseError } from '../../../../../logic/utils/error_utils';

const logger = getLogger('ActionsPanel');

const ActionsPanel: React.FC = () => {
    const dispatch = useAppDispatch();
    const promptGroups = useAppSelector(selectPromptGroups);
    const activeTab = useAppSelector(selectActiveActionsTab);
    const isAppBusy = useAppSelector(selectIsAppBusy);
    const inputContent = useAppSelector(selectInputContent);
    const settings = useAppSelector(selectAllSettings);

    const sortedGroups = promptGroups ? Object.values(promptGroups.promptGroups).sort((a, b) => a.groupId.localeCompare(b.groupId)) : [];
    const tabNames = sortedGroups.map((g) => g.groupId);

    React.useEffect(() => {
        if (promptGroups && tabNames.length > 0 && (!activeTab || !tabNames.includes(activeTab))) {
            logger.logInfo(`Initializing active tab to: ${tabNames[0]}`);
            dispatch(setActiveActionsTab(tabNames[0]));
        }
    }, [promptGroups, activeTab, tabNames, dispatch]);

    const handleActionClick = async (actionId: string, promptName: string) => {
        if (isAppBusy || !inputContent) {
            return;
        }
        try {
            logger.logInfo(`Action clicked: ${actionId}`);
            dispatch(setCurrentTask(promptName));
            dispatch(setAppBusy(true));
            const request = {
                id: actionId,
                inputText: inputContent,
                inputLanguageId: settings?.languageConfig.defaultInputLanguage || 'auto',
                outputLanguageId: settings?.languageConfig.defaultOutputLanguage || 'auto',
            };
            await dispatch(processPrompt(request)).unwrap();
            logger.logInfo('Prompt processed successfully');
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`Failed to process prompt: ${err.message}`);
            dispatch(enqueueNotification({ message: `Failed to process prompt: ${err.message}`, severity: 'error' }));
        } finally {
            dispatch(setAppBusy(false));
            dispatch(setCurrentTask('N/A'));
        }
    };

    if (!promptGroups || tabNames.length === 0) {
        return (
            <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--ink-3)' }}>
                Loading actions…
            </div>
        );
    }

    const activeGroup = sortedGroups.find((g) => g.groupId === activeTab);

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ display: 'flex', borderBottom: '1px solid var(--line)', overflowX: 'auto', flexShrink: 0 }}>
                {sortedGroups.map((group) => (
                    <button
                        key={group.groupId}
                        onClick={() => {
                            dispatch(setActiveActionsTab(group.groupId));
                            logger.logInfo(`Tab changed to ${group.groupId}`);
                        }}
                        disabled={isAppBusy}
                        style={{
                            padding: 'var(--space-2) var(--space-3)',
                            border: 'none',
                            borderBottom: group.groupId === activeTab ? '2px solid var(--teal)' : '2px solid transparent',
                            background: 'none',
                            cursor: isAppBusy ? 'not-allowed' : 'pointer',
                            color: group.groupId === activeTab ? 'var(--teal)' : 'var(--ink-2)',
                            fontWeight: group.groupId === activeTab ? 700 : 400,
                            whiteSpace: 'nowrap',
                            fontSize: '0.85rem',
                        }}
                    >
                        {group.groupName}
                    </button>
                ))}
            </div>
            <div
                style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: 'var(--space-2)',
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 'var(--space-2)',
                    alignContent: 'flex-start',
                }}
            >
                {activeGroup &&
                    Object.entries(activeGroup.prompts).map(([promptId, prompt]) => (
                        <button
                            key={promptId}
                            title={prompt.description}
                            onClick={() => handleActionClick(prompt.id, prompt.name)}
                            disabled={isAppBusy}
                            style={{
                                padding: 'var(--space-1) var(--space-3)',
                                border: '1px solid var(--teal)',
                                borderRadius: 'var(--radius-pill)',
                                background: 'none',
                                color: 'var(--teal)',
                                cursor: isAppBusy ? 'not-allowed' : 'pointer',
                                opacity: isAppBusy ? 0.5 : 1,
                                fontSize: '0.8rem',
                                textTransform: 'uppercase',
                                letterSpacing: '0.04em',
                                minWidth: 120,
                            }}
                        >
                            {prompt.name}
                        </button>
                    ))}
            </div>
        </div>
    );
};

ActionsPanel.displayName = 'ActionsPanel';
export default ActionsPanel;
