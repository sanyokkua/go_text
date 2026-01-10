import { Box, Button, Divider, Typography } from '@mui/material';
import React, { useState } from 'react';
import { ProviderConfig, Settings } from '../../../../../logic/adapter';
import { useAppDispatch } from '../../../../../logic/store';
import { getCompletionResponseForProvider, getModelsListForProvider } from '../../../../../logic/store/actions';
import { enqueueNotification } from '../../../../../logic/store/notifications';
import {
    createProviderConfig,
    deleteProviderConfig,
    getSettings,
    setAsCurrentProviderConfig,
    updateProviderConfig,
} from '../../../../../logic/store/settings';
import { setAppBusy } from '../../../../../logic/store/ui';
import { SPACING } from '../../../../styles/constants';
import ProviderForm from './components/ProviderForm';
import ProviderList from './components/ProviderList';

interface ProviderConfigTabProps {
    settings: Settings;
    metadata: { authTypes: string[]; providerTypes: string[] };
}

/**
 * Provider Config Tab Component
 * Main tab for provider configuration management
 */
const ProviderConfigTab: React.FC<ProviderConfigTabProps> = ({ settings, metadata }) => {
    const dispatch = useAppDispatch();
    const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [testResults, setTestResults] = useState<{ models: string[]; connectionSuccess: boolean } | null>(null);

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
        setTestResults(null);
    };

    const handleSaveProvider = async (updatedProvider: ProviderConfig) => {
        try {
            dispatch(setAppBusy(true));

            if (updatedProvider.providerId) {
                // Update existing provider
                await dispatch(updateProviderConfig(updatedProvider)).unwrap();
                dispatch(enqueueNotification({ message: 'Provider updated successfully', severity: 'success' }));
            } else {
                // Create new provider
                await dispatch(createProviderConfig(updatedProvider)).unwrap();
                dispatch(enqueueNotification({ message: 'Provider created successfully', severity: 'success' }));
            }

            // Refresh settings
            await dispatch(getSettings()).unwrap();

            handleCancelEdit();
        } catch (error) {
            dispatch(enqueueNotification({ message: `Failed to save provider: ${error}`, severity: 'error' }));
        } finally {
            dispatch(setAppBusy(false));
        }
    };

    const handleDeleteProvider = async (providerId: string) => {
        try {
            if (providerId === settings.currentProviderConfig.providerId) {
                dispatch(enqueueNotification({ message: 'Cannot delete current provider', severity: 'error' }));
                return;
            }

            dispatch(setAppBusy(true));
            await dispatch(deleteProviderConfig(providerId)).unwrap();

            // Refresh settings
            await dispatch(getSettings()).unwrap();

            dispatch(enqueueNotification({ message: 'Provider deleted successfully', severity: 'success' }));
        } catch (error) {
            dispatch(enqueueNotification({ message: `Failed to delete provider: ${error}`, severity: 'error' }));
        } finally {
            dispatch(setAppBusy(false));
        }
    };

    const handleSetAsCurrent = async (providerId: string) => {
        try {
            dispatch(setAppBusy(true));
            await dispatch(setAsCurrentProviderConfig(providerId)).unwrap();

            // Refresh settings
            await dispatch(getSettings()).unwrap();

            dispatch(enqueueNotification({ message: 'Current provider updated successfully', severity: 'success' }));
        } catch (error) {
            dispatch(enqueueNotification({ message: `Failed to set current provider: ${error}`, severity: 'error' }));
        } finally {
            dispatch(setAppBusy(false));
        }
    };

    const handleTestModels = async (providerConfig: ProviderConfig) => {
        try {
            dispatch(setAppBusy(true));
            const models = await dispatch(getModelsListForProvider(providerConfig)).unwrap();
            setTestResults({ models, connectionSuccess: true });
            dispatch(enqueueNotification({ message: `Found ${models.length} models for this provider`, severity: 'success' }));
        } catch (error) {
            dispatch(enqueueNotification({ message: `Failed to test models: ${error}`, severity: 'error' }));
            setTestResults({ models: [], connectionSuccess: false });
        } finally {
            dispatch(setAppBusy(false));
        }
    };

    const handleTestInference = async (providerConfig: ProviderConfig, modelId: string) => {
        try {
            dispatch(setAppBusy(true));

            const chatCompletionRequest = { model: modelId, messages: [{ role: 'user', content: 'Hello' }], stream: false };

            // TODO: Add log
            const response = await dispatch(getCompletionResponseForProvider({ providerConfig, chatCompletionRequest })).unwrap();

            dispatch(enqueueNotification({ message: 'Connection test successful!', severity: 'success' }));
        } catch (error) {
            dispatch(enqueueNotification({ message: `Connection test failed: ${error}`, severity: 'error' }));
        } finally {
            dispatch(setAppBusy(false));
        }
    };

    const editingProvider = editingProviderId ? settings.availableProviderConfigs.find((p) => p.providerId === editingProviderId) : undefined;

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: SPACING.STANDARD }}>
            {/* Current Provider Info */}
            <Box sx={{ padding: SPACING.SMALL }}>
                <Typography variant="subtitle1" gutterBottom>
                    Current Provider Configuration
                </Typography>

                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: SPACING.SMALL }}>
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
            </Box>

            <Divider />

            {/* Provider List or Form */}
            {showCreateForm || editingProviderId ? (
                <ProviderForm
                    provider={editingProvider!}
                    authTypes={metadata.authTypes}
                    providerTypes={metadata.providerTypes}
                    onSave={handleSaveProvider}
                    onCancel={handleCancelEdit}
                    onTestModels={handleTestModels}
                    onTestInference={handleTestInference}
                    testResults={testResults}
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
                    onClick={async () => {
                        try {
                            dispatch(setAppBusy(true));
                            await dispatch(getSettings()).unwrap();
                            dispatch(enqueueNotification({ message: 'Provider settings refreshed successfully', severity: 'success' }));
                        } catch (error) {
                            dispatch(enqueueNotification({ message: `Failed to refresh provider settings: ${error}`, severity: 'error' }));
                        } finally {
                            dispatch(setAppBusy(false));
                        }
                    }}
                >
                    Refresh Provider Settings
                </Button>
            </Box>
        </Box>
    );
};

ProviderConfigTab.displayName = 'ProviderConfigTab';
export default ProviderConfigTab;
