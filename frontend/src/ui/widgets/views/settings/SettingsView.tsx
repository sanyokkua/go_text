import { Box, Divider, Skeleton } from '@mui/material';
import React from 'react';
import { useAppDispatch, useAppSelector } from '../../../../logic/store';
import { setActiveSettingsTab } from '../../../../logic/store/ui';
import SettingsTabs from './SettingsTabs';
import FactoryResetTab from './tabs/FactoryResetTab';
import InferenceConfigTab from './tabs/InferenceConfigTab';
import LanguageConfigTab from './tabs/LanguageConfigTab';
import MetadataTab from './tabs/MetadataTab';
import ModelConfigTab from './tabs/ModelConfigTab';
import ProviderConfigTab from './tabs/ProviderConfigTab';

/**
 * Main Settings View Component
 * This is the root component for the settings view
 *
 * Key Responsibilities:
 * - Managing settings tab navigation
 * - Rendering the appropriate settings tab content
 * - Providing layout structure for settings panels
 * - Handling loading states
 *
 * Design Features:
 * - Tab-based navigation with horizontal layout
 * - Dynamic content rendering based on active tab
 * - Consistent spacing and dividers
 * - Full-size container with proper overflow handling
 *
 * Tab Structure:
 * 0 - Metadata (settings file locations)
 * 1 - Provider Configuration (LLM service setup)
 * 2 - Model Configuration (model selection and parameters)
 * 3 - Inference Configuration (timeout, retries, formatting)
 * 4 - Language Configuration (supported languages and defaults)
 * 5 - Factory Reset (reset to default settings)
 */
const SettingsView: React.FC = () => {
    const dispatch = useAppDispatch();
    const activeTab = useAppSelector((state) => state.ui.activeSettingsTab);
    const settings = useAppSelector((state) => state.settings.allSettings);
    const metadata = useAppSelector((state) => state.settings.metadata);

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        dispatch(setActiveSettingsTab(newValue));
    };

    const nothingToDisplay = <Skeleton />;

    if (!settings || !metadata) {
        return nothingToDisplay;
    }

    let activeTabView;
    switch (activeTab) {
        case 0: {
            activeTabView = <MetadataTab metadata={{ settingsFolder: metadata.settingsFolder, settingsFile: metadata.settingsFile }} />;
            break;
        }
        case 1: {
            activeTabView = <ProviderConfigTab settings={settings} metadata={metadata} />;
            break;
        }

        case 2: {
            activeTabView = <ModelConfigTab settings={settings} />;
            break;
        }
        case 3: {
            activeTabView = <InferenceConfigTab settings={settings} />;
            break;
        }
        case 4: {
            activeTabView = <LanguageConfigTab settings={settings} />;
            break;
        }
        case 5: {
            activeTabView = <FactoryResetTab />;
            break;
        }
        default: {
            activeTabView = nothingToDisplay;
            break;
        }
    }

    return (
        <Box sx={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <Box sx={{ overflow: 'hidden', paddingTop: 1 }}>
                <Divider />
            </Box>

            <Box sx={{ width: '100%', height: '90%', flexGrow: 1, padding: 1, overflowY: 'auto' }}>
                {/* Settings Tabs Bar */}
                <SettingsTabs activeTab={activeTab} onChange={handleTabChange} />

                {/* Tab Content */}
                <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>{activeTabView}</Box>
            </Box>
        </Box>
    );
};

SettingsView.displayName = 'SettingsView';
export default SettingsView;
