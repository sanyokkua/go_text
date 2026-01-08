import React, { useState } from 'react';
import { Box, Button, Divider, Paper, Typography } from '@mui/material';
import { ProviderConfig, Settings } from '../../../../../logic/adapter';
import { SPACING } from '../../../../styles/constants';
import ProviderList from './components/ProviderList';
import ProviderForm from './components/ProviderForm';

interface ProviderConfigTabProps {
    settings: Settings;
    metadata: { authTypes: string[]; providerTypes: string[] };
    onUpdateSettings: (updatedSettings: Settings) => void;
}

/**
 * Provider Config Tab Component
 * Main tab for provider configuration management
 */
const ProviderConfigTab: React.FC<ProviderConfigTabProps> = ({ settings, metadata, onUpdateSettings }) => {
    const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);

    const handleEditProvider = (providerId: string) => {
        setEditingProviderId(providerId);
        setShowCreateForm(false);
    };

    const handleCreateNew = () => {
        setShowCreateForm(true);
        setEditingProviderId(null);
    };

    const handleCancelEdit = () => {
        setEditingProviderId(null);
        setShowCreateForm(false);
    };

    const handleSaveProvider = (updatedProvider: ProviderConfig) => {
        const updatedProviders = settings.availableProviderConfigs.map((provider) =>
            provider.providerId === updatedProvider.providerId ? updatedProvider : provider,
        );

        // If it's a new provider, add it to the list
        const isNewProvider = !settings.availableProviderConfigs.some((p) => p.providerId === updatedProvider.providerId);

        const finalProviders = isNewProvider ? [...settings.availableProviderConfigs, updatedProvider] : updatedProviders;

        const updatedSettings = {
            ...settings,
            availableProviderConfigs: finalProviders,
            // If we're editing the current provider, update it
            currentProviderConfig:
                settings.currentProviderConfig.providerId === updatedProvider.providerId ? updatedProvider : settings.currentProviderConfig,
        };

        onUpdateSettings(updatedSettings);
        handleCancelEdit();
    };

    const handleDeleteProvider = (providerId: string) => {
        if (providerId === settings.currentProviderConfig.providerId) {
            console.log('Cannot delete current provider');
            return;
        }

        const updatedProviders = settings.availableProviderConfigs.filter((provider) => provider.providerId !== providerId);

        const updatedSettings = { ...settings, availableProviderConfigs: updatedProviders };

        onUpdateSettings(updatedSettings);
    };

    const handleSetAsCurrent = (providerId: string) => {
        const newCurrentProvider = settings.availableProviderConfigs.find((provider) => provider.providerId === providerId);

        if (newCurrentProvider) {
            const updatedSettings = { ...settings, currentProviderConfig: newCurrentProvider };
            onUpdateSettings(updatedSettings);
        }
    };

    const editingProvider = editingProviderId ? settings.availableProviderConfigs.find((p) => p.providerId === editingProviderId) : undefined;

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: SPACING.STANDARD }}>
            {/* Current Provider Info */}
            <Paper elevation={0} sx={{ padding: SPACING.STANDARD }}>
                <Typography variant="subtitle1" gutterBottom>
                    Current Provider Configuration
                </Typography>

                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: SPACING.STANDARD }}>
                    <Box>
                        <Typography variant="body2" color="text.secondary">
                            Provider Name
                        </Typography>
                        <Typography variant="body1">{settings.currentProviderConfig.providerName}</Typography>
                    </Box>

                    <Box>
                        <Typography variant="body2" color="text.secondary">
                            Provider Type
                        </Typography>
                        <Typography variant="body1">{settings.currentProviderConfig.providerType}</Typography>
                    </Box>

                    <Box>
                        <Typography variant="body2" color="text.secondary">
                            Base URL
                        </Typography>
                        <Typography variant="body1" sx={{ wordBreak: 'break-all' }}>
                            {settings.currentProviderConfig.baseUrl}
                        </Typography>
                    </Box>

                    <Box>
                        <Typography variant="body2" color="text.secondary">
                            Models Endpoint
                        </Typography>
                        <Typography variant="body1">{settings.currentProviderConfig.modelsEndpoint}</Typography>
                    </Box>

                    <Box>
                        <Typography variant="body2" color="text.secondary">
                            Completion Endpoint
                        </Typography>
                        <Typography variant="body1">{settings.currentProviderConfig.completionEndpoint}</Typography>
                    </Box>

                    <Box>
                        <Typography variant="body2" color="text.secondary">
                            Auth Type
                        </Typography>
                        <Typography variant="body1">{settings.currentProviderConfig.authType}</Typography>
                    </Box>

                    <Box>
                        <Typography variant="body2" color="text.secondary">
                            Use Auth Token from Env
                        </Typography>
                        <Typography variant="body1">{settings.currentProviderConfig.useAuthTokenFromEnv ? 'Yes' : 'No'}</Typography>
                    </Box>

                    {settings.currentProviderConfig.useAuthTokenFromEnv && (
                        <Box>
                            <Typography variant="body2" color="text.secondary">
                                Env Var Token Name
                            </Typography>
                            <Typography variant="body1">{settings.currentProviderConfig.envVarTokenName}</Typography>
                        </Box>
                    )}

                    <Box>
                        <Typography variant="body2" color="text.secondary">
                            Use Custom Headers
                        </Typography>
                        <Typography variant="body1">{settings.currentProviderConfig.useCustomHeaders ? 'Yes' : 'No'}</Typography>
                    </Box>

                    {settings.currentProviderConfig.useCustomHeaders && (
                        <Box>
                            <Typography variant="body2" color="text.secondary">
                                Custom Headers Count
                            </Typography>
                            <Typography variant="body1">{Object.keys(settings.currentProviderConfig.headers).length}</Typography>
                        </Box>
                    )}

                    <Box>
                        <Typography variant="body2" color="text.secondary">
                            Use Custom Models
                        </Typography>
                        <Typography variant="body1">{settings.currentProviderConfig.useCustomModels ? 'Yes' : 'No'}</Typography>
                    </Box>

                    {settings.currentProviderConfig.useCustomModels && (
                        <Box>
                            <Typography variant="body2" color="text.secondary">
                                Custom Models Count
                            </Typography>
                            <Typography variant="body1">{settings.currentProviderConfig.customModels.length}</Typography>
                        </Box>
                    )}
                </Box>

                <Box sx={{ display: 'flex', justifyContent: 'flex-end', marginTop: SPACING.STANDARD }}>
                    <Button variant="outlined" onClick={() => handleEditProvider(settings.currentProviderConfig.providerId)}>
                        Edit Current Provider
                    </Button>
                </Box>
            </Paper>

            <Divider />

            {/* Provider List or Form */}
            {showCreateForm || editingProviderId ? (
                <ProviderForm
                    provider={editingProvider!}
                    authTypes={metadata.authTypes}
                    providerTypes={metadata.providerTypes}
                    onSave={handleSaveProvider}
                    onCancel={handleCancelEdit}
                />
            ) : (
                <ProviderList
                    providers={settings.availableProviderConfigs}
                    currentProviderId={settings.currentProviderConfig.providerId}
                    onEdit={handleEditProvider}
                    onDelete={handleDeleteProvider}
                    onSetAsCurrent={handleSetAsCurrent}
                    onCreateNew={handleCreateNew}
                />
            )}

            {/* Update Button */}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                    variant="contained"
                    color="primary"
                    onClick={() => {
                        // TODO: Connect to Redux to save provider settings
                        console.log('Provider settings updated');
                    }}
                >
                    Update Provider Settings
                </Button>
            </Box>
        </Box>
    );
};

ProviderConfigTab.displayName = 'ProviderConfigTab';
export default ProviderConfigTab;
