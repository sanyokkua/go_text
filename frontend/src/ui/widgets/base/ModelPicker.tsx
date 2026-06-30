import { RefreshCw } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { useAppDispatch, useAppSelector } from '../../../logic/store';
import { selectCurrentProvider, selectCurrentProviderModelItems, selectModelConfig } from '../../../logic/store/settings/selectors';
import { discoverCurrentProviderModels, updateModelConfig } from '../../../logic/store/settings/thunks';
import { IconButton } from '../../components/IconButton';
import { Select } from '../../primitives/Select';
import { Tooltip } from '../../primitives/Tooltip';
import iconStyles from '../../components/IconButton.module.css';
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

    // The model pill stays plain (.sel look); only the active provider pill is accented.
    return (
        <div className={styles.root}>
            <Select value={modelConfig.name} onValueChange={handleModelChange} items={modelItems} keyLabel="Model" />
            <Tooltip content="Refresh model list" side="bottom">
                <IconButton
                    aria-label="Refresh model list"
                    compact
                    disabled={refreshing}
                    onClick={() => void handleRefresh()}
                    className={refreshing ? iconStyles.spinning : ''}
                >
                    <RefreshCw size={14} />
                </IconButton>
            </Tooltip>
        </div>
    );
};

ModelPicker.displayName = 'ModelPicker';
export default ModelPicker;
