import { Box, Button, Typography } from '@mui/material';
import React from 'react';
import { ActionHandlerAdapter, getLogger, ProviderConfig, Settings } from '../../../../../logic/adapter';
import { useAppDispatch } from '../../../../../logic/store';
import { enqueueNotification } from '../../../../../logic/store/notifications';
import { getSettings, updateProviderConfig } from '../../../../../logic/store/settings';
import { setAppBusy } from '../../../../../logic/store/ui';
import { testProviderModels } from '../../../../../logic/utils/provider_utils';
import { SPACING } from '../../../../styles/constants';
import ProviderForm from './components/ProviderForm';

const logger = getLogger('CurrentProviderTab');

interface CurrentProviderTabProps {
    settings: Settings;
    metadata: { authTypes: string[]; providerTypes: string[] };
}

/**
 * Current Provider Tab Component
 * Tab for viewing and editing the current provider configuration
 */
const CurrentProviderTab: React.FC<CurrentProviderTabProps> = ({ settings, metadata }) => {
    const dispatch = useAppDispatch();
    const [editingProviderId, setEditingProviderId] = React.useState<string | null>(null);
    const [testResults, setTestResults] = React.useState<{ models: string[]; connectionSuccess: boolean } | null>(null);

    const handleEditProvider = (providerId: string) => {
        logger.logDebug(`Editing provider with ID: ${providerId}`);
        setEditingProviderId(providerId);
    };

    const handleCancelEdit = () => {
        logger.logDebug('Canceling provider edit');
        setEditingProviderId(null);
        setTestResults(null);
    };

    const handleSaveProvider = async (updatedProvider: ProviderConfig) => {
        try {
            logger.logDebug(`Saving provider: ${updatedProvider.providerName}`);
            dispatch(setAppBusy(true));

            if (updatedProvider.providerId) {
                // Update existing provider
                logger.logInfo(`Updating existing provider: ${updatedProvider.providerId}`);
                await dispatch(updateProviderConfig(updatedProvider)).unwrap();
                dispatch(enqueueNotification({ message: 'Provider updated successfully', severity: 'success' }));
            }

            // Refresh settings
            logger.logDebug('Refreshing settings after provider update');
            await dispatch(getSettings()).unwrap();

            handleCancelEdit();
        } catch (error) {
            logger.logError(`Failed to save provider: ${error}`);
            dispatch(enqueueNotification({ message: `Failed to save provider: ${error}`, severity: 'error' }));
        } finally {
            dispatch(setAppBusy(false));
        }
    };

    const handleTestModels = async (providerConfig: ProviderConfig) => {
        await testProviderModels(dispatch, providerConfig, setTestResults);
    };

    const handleTestInference = async (providerConfig: ProviderConfig, modelId: string) => {
        try {
            logger.logDebug(`Testing inference with model: ${modelId}`);
            dispatch(setAppBusy(true));

            const chatCompletionRequest = { model: modelId, messages: [{ role: 'user', content: 'Hello' }], stream: false };

            const response = await ActionHandlerAdapter.getCompletionResponseForProvider(providerConfig, chatCompletionRequest);
            logger.logInfo(`Connection test successful: ${response && JSON.stringify(response)}`);

            dispatch(enqueueNotification({ message: 'Connection test successful!', severity: 'success' }));
        } catch (error) {
            logger.logError(`Connection test failed: ${error}`);
            dispatch(enqueueNotification({ message: `Connection test failed: ${error}`, severity: 'error' }));
        } finally {
            dispatch(setAppBusy(false));
        }
    };

    const editingProvider = editingProviderId ? settings.availableProviderConfigs.find((p) => p.providerId === editingProviderId) : undefined;

    return (
        <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: SPACING.STANDARD }}>
            {/* Tab Description */}
            <Box sx={{ padding: SPACING.SMALL, marginBottom: SPACING.SMALL }}>
                <Typography variant="body2" color="text.secondary" component="div" gutterBottom>
                    This tab shows the configuration of your currently active LLM provider. The current provider is used for all API calls and model
                    interactions.
                </Typography>
                <Typography variant="body2" color="text.secondary" component="div" gutterBottom>
                    <strong>How to use:</strong> View your current provider details below. Click &quot;Edit Current Provider&quot; to modify settings.
                    Changes are applied immediately when saved.
                </Typography>
                <Typography variant="body2" color="text.secondary" component="div" gutterBottom>
                    <strong>Important:</strong> After changing provider settings, you may need to select a model again as the available models list
                    will be refreshed.
                </Typography>
            </Box>

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

            {/* Provider Form for editing current provider */}
            {editingProviderId && (
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
            )}
        </Box>
    );
};

CurrentProviderTab.displayName = 'CurrentProviderTab';
export default CurrentProviderTab;
