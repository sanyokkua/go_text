import { Box, Divider } from '@mui/material';
import React, { useState } from 'react';
import { AppSettingsMetadata, Settings } from '../../../../logic/adapter';
import { CONTAINER_STYLES, FLEX_STYLES, SPACING } from '../../../styles/constants';
import SettingsGlobalControls from './SettingsGlobalControls';
import SettingsTabs from './SettingsTabs';
import InferenceConfigTab from './tabs/InferenceConfigTab';
import LanguageConfigTab from './tabs/LanguageConfigTab';
import MetadataTab from './tabs/MetadataTab';
import ModelConfigTab from './tabs/ModelConfigTab';
import ProviderConfigTab from './tabs/ProviderConfigTab';

interface SettingsViewProps {
    onClose: () => void;
}

/**
 * Main Settings View Component
 * This is the root component for the settings view
 */
const SettingsView: React.FC<SettingsViewProps> = ({ onClose }) => {
    const [activeTab, setActiveTab] = useState(0);
    const [settings, setSettings] = useState<Settings | null>(null);
    const [metadata, setMetadata] = useState<AppSettingsMetadata | null>(null);

    // Stub data for development - will be replaced with Redux later
    const stubSettings: Settings = {
        availableProviderConfigs: [
            {
                providerId: 'prov-1',
                providerName: 'OpenAI Compatible',
                providerType: 'openaiCompatible',
                baseUrl: 'https://api.openai.com/v1/',
                modelsEndpoint: 'models',
                completionEndpoint: 'chat/completions',
                authType: 'bearer',
                authToken: 'sk-...',
                useAuthTokenFromEnv: false,
                envVarTokenName: '',
                useCustomHeaders: false,
                headers: {},
                useCustomModels: false,
                customModels: [],
            },
            {
                providerId: 'prov-2',
                providerName: 'Local Ollama',
                providerType: 'ollama',
                baseUrl: 'http://localhost:11434/',
                modelsEndpoint: 'api/tags',
                completionEndpoint: 'api/chat',
                authType: 'none',
                authToken: '',
                useAuthTokenFromEnv: false,
                envVarTokenName: '',
                useCustomHeaders: false,
                headers: {},
                useCustomModels: false,
                customModels: [],
            },
            {
                providerId: 'prov-3',
                providerName: 'LM Studio',
                providerType: 'openaiCompatible',
                baseUrl: 'http://localhost:1234/',
                modelsEndpoint: 'api/models',
                completionEndpoint: 'api/completion',
                authType: 'none',
                authToken: '',
                useAuthTokenFromEnv: false,
                envVarTokenName: 'HELLO_WORLD',
                useCustomHeaders: true,
                headers: { 'Access-Control-Allow-Origin': '*' },
                useCustomModels: false,
                customModels: [],
            },
        ],
        currentProviderConfig: {
            providerId: 'prov-1',
            providerName: 'OpenAI Compatible',
            providerType: 'openaiCompatible',
            baseUrl: 'https://api.openai.com/v1/',
            modelsEndpoint: 'models',
            completionEndpoint: 'chat/completions',
            authType: 'bearer',
            authToken: 'sk-...',
            useAuthTokenFromEnv: false,
            envVarTokenName: '',
            useCustomHeaders: false,
            headers: {},
            useCustomModels: false,
            customModels: [],
        },
        inferenceBaseConfig: { timeout: 30, maxRetries: 3, useMarkdownForOutput: true },
        modelConfig: { name: 'gpt-3.5-turbo', useTemperature: true, temperature: 0.7 },
        languageConfig: {
            languages: ['English', 'Spanish', 'French', 'German', 'Ukrainian'],
            defaultInputLanguage: 'English',
            defaultOutputLanguage: 'Ukrainian',
        },
    };

    const stubMetadata: AppSettingsMetadata = {
        authTypes: ['none', 'apiKey', 'bearer'],
        providerTypes: ['openaiCompatible', 'ollama'],
        settingsFolder: '/Users/username/Library/Application Support/MyApp',
        settingsFile: '/Users/username/Library/Application Support/MyApp/settings.json',
    };

    // Initialize with stub data
    React.useEffect(() => {
        setSettings(stubSettings);
        setMetadata(stubMetadata);
    }, []);

    const handleClose = () => {
        // TODO: Connect to Redux to close settings
        console.log('Settings closed');
        onClose();
    };

    const handleResetToDefault = () => {
        // TODO: Connect to Redux to reset settings
        console.log('Reset to default settings');
    };

    const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
        setActiveTab(newValue);
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
                {activeTab === 1 && settings && metadata && (
                    <ProviderConfigTab settings={settings} metadata={metadata} onUpdateSettings={setSettings} />
                )}
                {activeTab === 2 && settings && <ModelConfigTab settings={settings} onUpdateSettings={setSettings} />}
                {activeTab === 3 && settings && <InferenceConfigTab settings={settings} onUpdateSettings={setSettings} />}
                {activeTab === 4 && settings && <LanguageConfigTab settings={settings} onUpdateSettings={setSettings} />}
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
