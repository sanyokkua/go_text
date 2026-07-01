import React, { useState } from 'react';

import { ProviderConfig } from '../../../../../logic/adapter/models';
import { useSettingsToast } from '../../../../../logic/hooks/useSettingsToast';
import { useAppDispatch, useAppSelector } from '../../../../../logic/store';
import { selectAllSettings, selectProviderPresets, selectSettingsMetadata } from '../../../../../logic/store/settings/selectors';
import {
    createProviderConfig,
    deleteProviderConfig,
    setAsCurrentProviderConfig,
    updateProviderConfig,
} from '../../../../../logic/store/settings/thunks';
import ProviderForm, { BLANK_PROVIDER } from './components/ProviderForm';
import ProviderList from './components/ProviderList';
import styles from './ProviderManagementTab.module.css';

const NEW_ID = '__new__';

const ProviderManagementTab: React.FC = () => {
    const dispatch = useAppDispatch();
    const runWithToast = useSettingsToast();
    const settings = useAppSelector(selectAllSettings);
    const metadata = useAppSelector(selectSettingsMetadata);
    const presets = useAppSelector(selectProviderPresets);

    const [selectedId, setSelectedId] = useState<string | null>(null);

    if (!settings) {
        return <div className={styles.loading}>Loading…</div>;
    }

    const providers = settings.availableProviderConfigs;
    const currentId = settings.currentProviderConfig?.providerId ?? '';
    const authTypes = metadata?.authTypes ?? ['none', 'bearer', 'apiKey'];
    const providerTypes = metadata?.providerTypes ?? ['openai', 'azure', 'anthropic', 'google', 'ollama', 'lmstudio'];

    const selectedProvider: ProviderConfig | null = (() => {
        if (selectedId === null) return null;
        if (selectedId === NEW_ID) return BLANK_PROVIDER;
        return providers.find((p) => p.providerId === selectedId) ?? null;
    })();

    const existingNames = providers.filter((p) => p.providerId !== selectedId).map((p) => p.providerName);

    const isCurrent = selectedId !== null && selectedId !== NEW_ID && selectedId === currentId;

    const handleSave = async (p: ProviderConfig) => {
        if (selectedId === NEW_ID) {
            const result = await dispatch(createProviderConfig(p)).unwrap();
            const created = result.availableProviderConfigs.find((c) => c.providerName === p.providerName);
            if (created) setSelectedId(created.providerId);
        } else {
            await dispatch(updateProviderConfig(p)).unwrap();
        }
    };

    const handleSaveWithToast = (p: ProviderConfig) => {
        void runWithToast({ unwrap: () => handleSave(p) }, { success: selectedId === NEW_ID ? 'Provider created' : 'Provider saved' });
    };

    const handleDelete = async (id: string) => {
        await dispatch(deleteProviderConfig(id)).unwrap();
        setSelectedId(null);
    };

    const handleDeleteWithToast = (id: string) => {
        void runWithToast({ unwrap: () => handleDelete(id) }, { success: 'Provider deleted' });
    };

    const handleSetCurrent = (id: string) => {
        void runWithToast(dispatch(setAsCurrentProviderConfig(id)), { success: 'Current provider updated' });
    };

    const handleCancel = () => {
        if (selectedId === NEW_ID) setSelectedId(null);
    };

    return (
        <div className={styles.root}>
            <ProviderList
                providers={providers}
                currentId={currentId}
                selectedId={selectedId}
                onSelect={(id) => setSelectedId(id)}
                onNew={() => setSelectedId(NEW_ID)}
            />
            <ProviderForm
                provider={selectedProvider}
                isNew={selectedId === NEW_ID}
                presets={presets}
                authTypes={authTypes}
                providerTypes={providerTypes}
                existingNames={existingNames}
                isCurrent={isCurrent}
                onSave={handleSaveWithToast}
                onDelete={handleDeleteWithToast}
                onSetCurrent={handleSetCurrent}
                onCancel={handleCancel}
            />
        </div>
    );
};

ProviderManagementTab.displayName = 'ProviderManagementTab';
export default ProviderManagementTab;
