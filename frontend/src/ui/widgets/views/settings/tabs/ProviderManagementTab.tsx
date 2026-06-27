import React, { useState } from 'react';

import { ProviderConfig } from '../../../../../logic/adapter/models';
import { useAppDispatch, useAppSelector } from '../../../../../logic/store';
import { selectAllSettings, selectSettingsMetadata } from '../../../../../logic/store/settings/selectors';
import {
    createProviderConfig,
    deleteProviderConfig,
    setAsCurrentProviderConfig,
    updateProviderConfig,
} from '../../../../../logic/store/settings/thunks';
import ProviderForm, { BLANK_PROVIDER } from './components/ProviderForm';
import ProviderList from './components/ProviderList';

const NEW_ID = '__new__';

const ProviderManagementTab: React.FC = () => {
    const dispatch = useAppDispatch();
    const settings = useAppSelector(selectAllSettings);
    const metadata = useAppSelector(selectSettingsMetadata);

    const [selectedId, setSelectedId] = useState<string | null>(null);

    if (!settings) {
        return <div style={{ padding: 'var(--space-4)', color: 'var(--ink-3)' }}>Loading…</div>;
    }

    const providers = settings.availableProviderConfigs;
    const currentId = settings.currentProviderConfig?.providerId ?? '';
    const authTypes = metadata?.authTypes ?? ['none', 'bearer', 'api-key'];
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

    const handleDelete = async (id: string) => {
        await dispatch(deleteProviderConfig(id)).unwrap();
        setSelectedId(null);
    };

    const handleSetCurrent = async (id: string) => {
        await dispatch(setAsCurrentProviderConfig(id)).unwrap();
    };

    const handleCancel = () => {
        if (selectedId === NEW_ID) setSelectedId(null);
    };

    return (
        <div style={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
            <ProviderList
                providers={providers}
                currentId={currentId}
                selectedId={selectedId}
                onSelect={(id) => setSelectedId(id)}
                onNew={() => setSelectedId(NEW_ID)}
            />
            <ProviderForm
                provider={selectedProvider}
                authTypes={authTypes}
                providerTypes={providerTypes}
                existingNames={existingNames}
                isCurrent={isCurrent}
                onSave={(p) => {
                    handleSave(p).catch(() => undefined);
                }}
                onDelete={(id) => {
                    handleDelete(id).catch(() => undefined);
                }}
                onSetCurrent={(id) => {
                    handleSetCurrent(id).catch(() => undefined);
                }}
                onCancel={handleCancel}
            />
        </div>
    );
};

ProviderManagementTab.displayName = 'ProviderManagementTab';
export default ProviderManagementTab;
