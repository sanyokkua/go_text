import React from 'react';

import { selectActiveSettingsTab, useAppDispatch, useAppSelector } from '../../../../logic/store';
import { selectAllSettings, selectSettingsMetadata } from '../../../../logic/store/settings/selectors';
import { setActiveSettingsTab } from '../../../../logic/store/ui';
import { Tabs, TabDef } from '../../../primitives/Tabs';
import styles from './SettingsView.module.css';
import AppBehaviorTab from './tabs/AppBehaviorTab';
import AppearanceTab from './tabs/AppearanceTab';
import InferenceConfigTab from './tabs/InferenceConfigTab';
import LanguageConfigTab from './tabs/LanguageConfigTab';
import MetadataTab from './tabs/MetadataTab';
import ModelConfigTab from './tabs/ModelConfigTab';
import ProviderManagementTab from './tabs/ProviderManagementTab';

/** Composes a glyph + text tab label; spacing between the two is handled by `.labelWrap`'s flex gap. */
const tabLabel = (glyph: string, text: string): React.ReactNode => (
    <span className={styles.labelWrap}>
        <span className={styles.glyph} aria-hidden="true">
            {glyph}
        </span>
        <span>{text}</span>
    </span>
);

const SettingsView: React.FC = () => {
    const dispatch = useAppDispatch();
    const activeTab = useAppSelector(selectActiveSettingsTab);
    const settings = useAppSelector(selectAllSettings);
    const metadata = useAppSelector(selectSettingsMetadata);

    if (!settings) {
        return <div className={styles.loading}>Loading settings…</div>;
    }

    const tabs: TabDef[] = [
        {
            value: '0',
            label: tabLabel('🎨', 'Appearance'),
            content: (
                <div className={styles.content}>
                    <AppearanceTab />
                </div>
            ),
        },
        {
            value: '1',
            label: tabLabel('🗒', 'Logging'),
            content: (
                <div className={styles.content}>
                    <AppBehaviorTab settings={settings} metadata={metadata} />
                </div>
            ),
        },
        {
            value: '2',
            label: tabLabel('🔌', 'Providers'),
            content: (
                <div className={styles.content}>
                    <ProviderManagementTab />
                </div>
            ),
        },
        {
            value: '3',
            label: tabLabel('⚙', 'Model'),
            content: (
                <div className={styles.content}>
                    <ModelConfigTab settings={settings} />
                </div>
            ),
        },
        {
            value: '4',
            label: tabLabel('✍', 'Generation'),
            content: (
                <div className={styles.content}>
                    <InferenceConfigTab settings={settings} />
                </div>
            ),
        },
        {
            value: '5',
            label: tabLabel('🌐', 'Languages'),
            content: (
                <div className={styles.content}>
                    <LanguageConfigTab settings={settings} />
                </div>
            ),
        },
        {
            value: '6',
            label: tabLabel('ℹ', 'About & data'),
            content: (
                <div className={styles.content}>
                    <MetadataTab />
                </div>
            ),
        },
    ];

    return (
        <div className={styles.root}>
            <Tabs
                value={String(activeTab)}
                onValueChange={(v) => dispatch(setActiveSettingsTab(Number(v)))}
                orientation="vertical"
                tabs={tabs}
            />
        </div>
    );
};

SettingsView.displayName = 'SettingsView';
export default SettingsView;
