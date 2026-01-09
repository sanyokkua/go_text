import { Box, Divider } from '@mui/material';
import React from 'react';
import { useAppDispatch, useAppSelector } from '../../../../logic/store';
import { enqueueNotification } from '../../../../logic/store/notifications';
import { resetSettingsToDefault } from '../../../../logic/store/settings';
import { setActiveSettingsTab, setAppBusy, toggleSettingsView } from '../../../../logic/store/ui';
import { CONTAINER_STYLES, FLEX_STYLES, SPACING } from '../../../styles/constants';
import SettingsTabs from './SettingsTabs';
import InferenceConfigTab from './tabs/InferenceConfigTab';
import LanguageConfigTab from './tabs/LanguageConfigTab';
import MetadataTab from './tabs/MetadataTab';
import ModelConfigTab from './tabs/ModelConfigTab';
import ProviderConfigTab from './tabs/ProviderConfigTab';
import FactoryResetTab from './tabs/FactoryResetTab';

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

    // Remove the handleClose function since we're removing the Close button
    // Settings will only be closed via the App Bar button

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        dispatch(setActiveSettingsTab(newValue));
    };

    // Reset functionality has been moved to the FactoryResetTab component
    // No longer needed in the main SettingsView

    if (!settings || !metadata) {
        return null; // Loading state could be added here
    }

    return (
        <Box sx={{ ...CONTAINER_STYLES.FULL_SIZE, ...FLEX_STYLES.COLUMN_OVERFLOW, padding: SPACING.SMALL }}>
            {/* Settings Tabs */}
            <SettingsTabs activeTab={activeTab} onChange={handleTabChange} />
            <Box sx={{ marginY: SPACING.SMALL }}>
                <Divider />
            </Box>

            {/* Tab Content */}
            <Box sx={{ ...FLEX_STYLES.FLEX_GROW, overflow: 'auto' }}>
                {activeTab === 0 && metadata && (
                    <MetadataTab metadata={{ settingsFolder: metadata.settingsFolder, settingsFile: metadata.settingsFile }} />
                )}
                {activeTab === 1 && settings && metadata && <ProviderConfigTab settings={settings} metadata={metadata} />}
                {activeTab === 2 && settings && <ModelConfigTab settings={settings} />}
                {activeTab === 3 && settings && <InferenceConfigTab settings={settings} />}
                {activeTab === 4 && settings && <LanguageConfigTab settings={settings} />}
                {activeTab === 5 && <FactoryResetTab />}
            </Box>

            <Box sx={{ marginY: SPACING.STANDARD }}>
                <Divider />
            </Box>

            {/* Global Controls have been removed - all functionality is now in dedicated tabs */}
            {/* Settings can only be closed via App Bar button */}
        </Box>
    );
};

SettingsView.displayName = 'SettingsView';
export default SettingsView;
