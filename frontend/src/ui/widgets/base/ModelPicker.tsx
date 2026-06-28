import React, { useState } from 'react';

import { useAppDispatch, useAppSelector } from '../../../logic/store';
import { selectCurrentProviderModelItems, selectModelConfig } from '../../../logic/store/settings/selectors';
import { getCurrentProviderConfig, updateModelConfig } from '../../../logic/store/settings/thunks';
import { Tooltip } from '../../primitives/Tooltip';
import { Select } from '../../primitives/Select';
import styles from './ModelPicker.module.css';

const ModelPicker: React.FC = () => {
    const dispatch = useAppDispatch();
    const modelConfig = useAppSelector(selectModelConfig);
    const modelItems = useAppSelector(selectCurrentProviderModelItems);
    const [refreshing, setRefreshing] = useState(false);

    if (!modelConfig) {
        return null;
    }

    const handleModelChange = (name: string): void => {
        void dispatch(updateModelConfig({ ...modelConfig, name }));
    };

    // TODO: No live model-discovery-and-persist thunk exists yet.
    // getCurrentProviderConfig re-fetches the stored provider and refreshes
    // customModels if the provider has them persisted from a previous sync.
    const handleRefresh = async (): Promise<void> => {
        setRefreshing(true);
        try {
            await dispatch(getCurrentProviderConfig()).unwrap();
        } finally {
            setRefreshing(false);
        }
    };

    return (
        <div className={styles.root}>
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
