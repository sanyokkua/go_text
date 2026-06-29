import React, { useEffect, useState } from 'react';

import { useAppDispatch, useAppSelector } from '../../../logic/store';
import { selectCurrentProvider, selectCurrentProviderModelItems, selectModelConfig } from '../../../logic/store/settings/selectors';
import { discoverCurrentProviderModels, updateModelConfig } from '../../../logic/store/settings/thunks';
import { Tooltip } from '../../primitives/Tooltip';
import { Select } from '../../primitives/Select';
import styles from './ModelPicker.module.css';

const ModelPicker: React.FC = () => {
    const dispatch = useAppDispatch();
    const modelConfig = useAppSelector(selectModelConfig);
    const modelItems = useAppSelector(selectCurrentProviderModelItems);
    const currentProvider = useAppSelector(selectCurrentProvider);
    const [refreshing, setRefreshing] = useState(false);

    const providerId = currentProvider?.providerId ?? '';

    // Auto-discover the current provider's models on first mount and whenever the
    // provider changes, so the dropdown is switchable without a manual refresh.
    // Keyed on providerId only — discovery writes discoveredModels, which is not a
    // dependency here, so there is no refetch loop.
    useEffect(() => {
        if (providerId) {
            void dispatch(discoverCurrentProviderModels(providerId));
        }
    }, [dispatch, providerId]);

    if (!modelConfig) {
        return null;
    }

    const handleModelChange = (name: string): void => {
        void dispatch(updateModelConfig({ ...modelConfig, name }));
    };

    // Discovery never rejects (the thunk swallows errors and resolves with []),
    // so no .unwrap() — the spinner toggles regardless and no error reaches the UI.
    const handleRefresh = async (): Promise<void> => {
        if (!providerId) return;
        setRefreshing(true);
        try {
            await dispatch(discoverCurrentProviderModels(providerId));
        } finally {
            setRefreshing(false);
        }
    };

    const ready = modelConfig.name.trim() !== '';

    return (
        <div className={styles.root}>
            <span
                className={styles.readyDot}
                data-ready={ready}
                aria-label={ready ? 'Model selected' : 'No model selected'}
                title={ready ? 'Model selected' : 'No model selected'}
            />
            <Select
                value={modelConfig.name}
                onValueChange={handleModelChange}
                items={modelItems}
                keyLabel="Model"
                accent
            />
            <Tooltip content="Refresh model list" side="bottom">
                <button
                    aria-label="Refresh model list"
                    className={styles.refreshBtn}
                    data-spinning={refreshing}
                    disabled={refreshing}
                    onClick={() => void handleRefresh()}
                >
                    ⟳
                </button>
            </Tooltip>
        </div>
    );
};

ModelPicker.displayName = 'ModelPicker';
export default ModelPicker;
