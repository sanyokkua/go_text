import React from 'react';
import { selectActiveSettingsTab, selectAllSettings, selectSettingsMetadata, useAppDispatch, useAppSelector } from '../../../../logic/store';
import { setActiveSettingsTab } from '../../../../logic/store/ui';
import SettingsTabs from './SettingsTabs';
import AppBehaviorTab from './tabs/AppBehaviorTab';
import CurrentProviderTab from './tabs/CurrentProviderTab';
import FactoryResetTab from './tabs/FactoryResetTab';
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

    if (!settings || !metadata) {
        return <div style={{ padding: 'var(--space-4)', color: 'var(--ink-3)' }}>Loading settings…</div>;
    }

    let activeTabView: React.ReactElement;
    switch (activeTab) {
        case 0:
            activeTabView = <MetadataTab metadata={{ settingsFolder: metadata.settingsFolder, settingsFile: metadata.settingsFile }} />;
            break;
        case 1:
            activeTabView = <CurrentProviderTab settings={settings} metadata={metadata} />;
            break;
        case 2:
            activeTabView = <ProviderManagementTab settings={settings} metadata={metadata} />;
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
            activeTabView = <FactoryResetTab />;
            break;
        case 7:
            activeTabView = <AppBehaviorTab settings={settings} metadata={metadata} />;
            break;
        default:
            activeTabView = <div style={{ padding: 'var(--space-4)', color: 'var(--ink-3)' }}>Unknown tab</div>;
    }

    return (
        <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <hr style={{ margin: 'var(--space-2) 0', border: 'none', borderTop: '1px solid var(--line)' }} />
            <div style={{ width: '100%', flexGrow: 1, padding: 'var(--space-2)', overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
                <SettingsTabs activeTab={activeTab} onChange={handleTabChange} />
                <div style={{ flex: 1, minHeight: 0, overflow: 'auto' }}>{activeTabView}</div>
            </div>
        </div>
    );
};

SettingsView.displayName = 'SettingsView';
export default SettingsView;
