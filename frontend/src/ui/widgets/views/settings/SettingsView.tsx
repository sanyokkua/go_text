import { Box, Divider } from '@mui/material';
import React from 'react';
import { useAppDispatch, useAppSelector } from '../../../../logic/store';
import { enqueueNotification } from '../../../../logic/store/notifications';
import { resetSettingsToDefault } from '../../../../logic/store/settings';
import { setActiveSettingsTab, setAppBusy, toggleSettingsView } from '../../../../logic/store/ui';
import { CONTAINER_STYLES, FLEX_STYLES, SPACING } from '../../../styles/constants';
import SettingsGlobalControls from './SettingsGlobalControls';
import SettingsTabs from './SettingsTabs';
import InferenceConfigTab from './tabs/InferenceConfigTab';
import LanguageConfigTab from './tabs/LanguageConfigTab';
import MetadataTab from './tabs/MetadataTab';
import ModelConfigTab from './tabs/ModelConfigTab';
import ProviderConfigTab from './tabs/ProviderConfigTab';

/**
 * Main Settings View Component
 * This is the root component for the settings view
 */
const SettingsView: React.FC = () => {
    const dispatch = useAppDispatch();
    const activeTab = useAppSelector((state) => state.ui.activeSettingsTab);
    const settings = useAppSelector((state) => state.settings.allSettings);
    const metadata = useAppSelector((state) => state.settings.metadata);
    const isAppBusy = useAppSelector((state) => state.ui.isAppBusy);

    const handleClose = () => {
        dispatch(setActiveSettingsTab(0));
        dispatch(toggleSettingsView());
    };

    const handleResetToDefault = async () => {
        try {
            dispatch(setAppBusy(true));
            await dispatch(resetSettingsToDefault()).unwrap();
            dispatch(enqueueNotification({ message: 'Settings reset to default successfully', severity: 'success' }));
        } catch (error) {
            dispatch(enqueueNotification({ message: `Failed to reset settings: ${error}`, severity: 'error' }));
        } finally {
            dispatch(setAppBusy(false));
        }
    };

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        dispatch(setActiveSettingsTab(newValue));
    };

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
            </Box>

            <Box sx={{ marginY: SPACING.STANDARD }}>
                <Divider />
            </Box>

            {/* Global Controls */}
            <SettingsGlobalControls onClose={handleClose} onResetToDefault={handleResetToDefault} />
        </Box>
    );
};

SettingsView.displayName = 'SettingsView';
export default SettingsView;
