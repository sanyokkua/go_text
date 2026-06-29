import React from 'react';

import { selectActiveSettingsTab, useAppDispatch, useAppSelector } from '../../../../logic/store';
import { selectAllSettings, selectSettingsMetadata } from '../../../../logic/store/settings/selectors';
import { setActiveSettingsTab } from '../../../../logic/store/ui';
import SettingsTabs from './SettingsTabs';
import AppBehaviorTab from './tabs/AppBehaviorTab';
import AppearanceTab from './tabs/AppearanceTab';
import InferenceConfigTab from './tabs/InferenceConfigTab';
import LanguageConfigTab from './tabs/LanguageConfigTab';
import MetadataTab from './tabs/MetadataTab';
import ModelConfigTab from './tabs/ModelConfigTab';
import ProviderManagementTab from './tabs/ProviderManagementTab';

const SettingsView: React.FC = () => {
    const dispatch = useAppDispatch();
    const activeTab = useAppSelector(selectActiveSettingsTab);
    const settings = useAppSelector(selectAllSettings);
    const metadata = useAppSelector(selectSettingsMetadata);

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        dispatch(setActiveSettingsTab(newValue));
    };

    if (!settings) {
        return <div style={{ padding: 'var(--space-4)', color: 'var(--ink-3)' }}>Loading settings…</div>;
    }

    let activeTabView: React.ReactElement;
    switch (activeTab) {
        case 0:
            activeTabView = <AppearanceTab />;
            break;
        case 1:
            activeTabView = <AppBehaviorTab settings={settings} metadata={metadata} />;
            break;
        case 2:
            activeTabView = <ProviderManagementTab />;
            break;
        case 3:
            activeTabView = <ModelConfigTab settings={settings} />;
            break;
        case 4:
            activeTabView = <InferenceConfigTab settings={settings} />;
            break;
        case 5:
            activeTabView = <LanguageConfigTab settings={settings} />;
            break;
        case 6:
            activeTabView = <MetadataTab />;
            break;
        default:
            activeTabView = <div style={{ padding: 'var(--space-4)', color: 'var(--ink-3)' }}>Unknown tab</div>;
    }

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', overflow: 'hidden', background: 'var(--bg)' }}>
            <SettingsTabs activeTab={activeTab} onChange={handleTabChange} />
            <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: 'var(--space-4)', background: 'var(--surface)' }}>{activeTabView}</div>
        </div>
    );
};

SettingsView.displayName = 'SettingsView';
export default SettingsView;
