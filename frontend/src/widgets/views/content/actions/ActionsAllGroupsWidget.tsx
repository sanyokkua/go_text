import React, { useState } from 'react';
import { LogDebug } from '../../../../../wailsjs/runtime';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { processAction } from '../../../../store/state/state_thunks';
import { ActionGroupWidget } from './ActionGroupWidget';

const defaultActiveIndex = 0;

export const ActionsAllGroupsWidget: React.FC = () => {
    const dispatch = useAppDispatch();
    const actionGroups = useAppSelector((state) => state.state.actionGroups);
    const languageInputSelected = useAppSelector((state) => state.settingsState.languageInputSelected);
    const languageOutputSelected = useAppSelector((state) => state.settingsState.languageOutputSelected);
    const textEditorInputContent = useAppSelector((state) => state.state.textEditorInputContent);
    const textEditorOutputContent = useAppSelector((state) => state.state.textEditorOutputContent);
    const isProcessing = useAppSelector((state) => state.state.isProcessing);
    const [activeIndex, setActiveIndex] = useState(defaultActiveIndex);

    const tabNames = Object.keys(actionGroups);

    const handleTabClick = (index: number) => {
        setActiveIndex(index);
    };

    const onOperationBtnClick = (actionId: string) => {
        LogDebug(`Processing operation: ${actionId}`);
        dispatch(
            processAction({
                id: actionId,
                inputText: textEditorInputContent,
                outputText: textEditorOutputContent,
                inputLanguageId: languageInputSelected.itemId,
                outputLanguageId: languageOutputSelected.itemId,
            }),
        );
    };

    const renderTabContent = () => {
        return tabNames.map((groupName, index) => {
            const buttons = actionGroups[groupName] || [];
            return <ActionGroupWidget key={`${groupName}-${index}`} buttons={buttons} onBtnClick={onOperationBtnClick} disabled={isProcessing} />;
        });
    };

    return (
        <div className="tab-widget-container">
            <div className="tab-buttons-container">
                <div className="tab-buttons-container-buttons">
                    {tabNames.map((label, index) => (
                        <button
                            key={index}
                            className={`${activeIndex === index ? 'active' : ''}`}
                            onClick={() => handleTabClick(index)}
                            disabled={isProcessing}
                        >
                            {label}
                        </button>
                    ))}
                </div>
                <hr className="tab-buttons-container-underline" />
            </div>

            {renderTabContent().map((child, index) => (
                <div
                    key={`tab-panel-${index}`}
                    id={`tab-panel-${index}`}
                    className={`tab-content-container ${activeIndex === index ? 'tab-content-container-active' : 'tab-content-container-hidden'}`}
                >
                    {child}
                </div>
            ))}
        </div>
    );
};

ActionsAllGroupsWidget.displayName = 'ActionsAllGroupsWidget';
