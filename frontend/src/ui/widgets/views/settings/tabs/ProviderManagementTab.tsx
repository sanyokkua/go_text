import { Box, Typography } from '@mui/material';
import React, { useState } from 'react';
import { getLogger, ProviderConfig, Settings } from '../../../../../logic/adapter';
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

const logger = getLogger('ProviderManagementTab');

interface ProviderManagementTabProps {
    settings: Settings;
    metadata: { authTypes: string[]; providerTypes: string[] };
}

/**
 * Provider Management Tab Component
 * Tab for managing all provider configurations (list, create, edit, delete)
 */
const ProviderManagementTab: React.FC<ProviderManagementTabProps> = ({ settings, metadata }) => {
    const dispatch = useAppDispatch();
    const [editingProviderId, setEditingProviderId] = useState<string | null>(null);
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [testResults, setTestResults] = useState<{ models: string[]; connectionSuccess: boolean } | null>(null);

    const handleEditProvider = (providerId: string) => {
        logger.logDebug(`Editing provider with ID: ${providerId}`);
        setEditingProviderId(providerId);
        setShowCreateForm(false);
    };

    const handleCreateNew = () => {
        logger.logDebug('Creating new provider');
        setShowCreateForm(true);
        setEditingProviderId(null);
    };

    const handleCancelEdit = () => {
        logger.logDebug('Canceling provider edit/create');
        setEditingProviderId(null);
        setShowCreateForm(false);
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
            } else {
                // Create new provider
                logger.logInfo(`Creating new provider: ${updatedProvider.providerName}`);
                await dispatch(createProviderConfig(updatedProvider)).unwrap();
                dispatch(enqueueNotification({ message: 'Provider created successfully', severity: 'success' }));
            }

            // Refresh settings
            logger.logDebug('Refreshing settings after provider save');
            await dispatch(getSettings()).unwrap();

            handleCancelEdit();
        } catch (error) {
            logger.logError(`Failed to save provider: ${error}`);
            dispatch(enqueueNotification({ message: `Failed to save provider: ${error}`, severity: 'error' }));
        } finally {
            dispatch(setAppBusy(false));
        }
    };

    const handleDeleteProvider = async (providerId: string) => {
        try {
            logger.logDebug(`Attempting to delete provider: ${providerId}`);
            if (providerId === settings.currentProviderConfig.providerId) {
                logger.logWarning('Attempted to delete current provider - operation blocked');
                dispatch(enqueueNotification({ message: 'Cannot delete current provider', severity: 'error' }));
                return;
            }

            logger.logInfo(`Deleting provider: ${providerId}`);
            dispatch(setAppBusy(true));
            await dispatch(deleteProviderConfig(providerId)).unwrap();

            // Refresh settings
            logger.logDebug('Refreshing settings after provider deletion');
            await dispatch(getSettings()).unwrap();

            logger.logInfo('Provider deleted successfully');
            dispatch(enqueueNotification({ message: 'Provider deleted successfully', severity: 'success' }));
        } catch (error) {
            logger.logError(`Failed to delete provider: ${error}`);
            dispatch(enqueueNotification({ message: `Failed to delete provider: ${error}`, severity: 'error' }));
        } finally {
            dispatch(setAppBusy(false));
        }
    };

    const handleSetAsCurrent = async (providerId: string) => {
        try {
            logger.logDebug(`Setting provider as current: ${providerId}`);
            dispatch(setAppBusy(true));
            await dispatch(setAsCurrentProviderConfig(providerId)).unwrap();

            // Refresh settings
            logger.logDebug('Refreshing settings after setting current provider');
            await dispatch(getSettings()).unwrap();

            logger.logInfo('Current provider updated successfully');
            dispatch(enqueueNotification({ message: 'Current provider updated successfully', severity: 'success' }));
        } catch (error) {
            logger.logError(`Failed to set current provider: ${error}`);
            dispatch(enqueueNotification({ message: `Failed to set current provider: ${error}`, severity: 'error' }));
        } finally {
            dispatch(setAppBusy(false));
        }
    };

    const handleTestModels = async (providerConfig: ProviderConfig) => {
        try {
            logger.logDebug(`Testing models for provider: ${providerConfig.providerName}`);
            dispatch(setAppBusy(true));
            const models = await dispatch(getModelsListForProvider(providerConfig)).unwrap();
            logger.logInfo(`Found ${models.length} models for provider: ${providerConfig.providerName}`);
            setTestResults({ models, connectionSuccess: true });
            dispatch(enqueueNotification({ message: `Found ${models.length} models for this provider`, severity: 'success' }));
        } catch (error) {
            logger.logError(`Failed to test models for provider ${providerConfig.providerName}: ${error}`);
            dispatch(enqueueNotification({ message: `Failed to test models: ${error}`, severity: 'error' }));
            setTestResults({ models: [], connectionSuccess: false });
        } finally {
            dispatch(setAppBusy(false));
        }
    };

    const handleTestInference = async (providerConfig: ProviderConfig, modelId: string) => {
        try {
            logger.logDebug(`Testing inference with model: ${modelId}`);
            dispatch(setAppBusy(true));

            const chatCompletionRequest = { model: modelId, messages: [{ role: 'user', content: 'Hello' }], stream: false };

            const response = await dispatch(getCompletionResponseForProvider({ providerConfig, chatCompletionRequest })).unwrap();
            logger.logInfo('Connection test successful');

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
                    This tab allows you to manage all your LLM provider configurations. You can create multiple providers and switch between them as
                    needed.
                </Typography>
                <Typography variant="body2" color="text.secondary" component="div" gutterBottom>
                    <strong>How to use:</strong> Click &quot;Create New Provider&quot; to add a new configuration, or use the Edit/Delete buttons for
                    existing providers. Click &quot;Apply as Current&quot; to switch to a different provider.
                </Typography>
                <Typography variant="body2" color="text.secondary" component="div" gutterBottom>
                    <strong>Important:</strong> After changing providers or provider settings, you may need to select a model again as the available
                    models list will be refreshed.
                </Typography>
                <Typography variant="body2" color="text.secondary" component="div" gutterBottom>
                    <strong>Note:</strong> You cannot delete the currently active provider. Set another provider as current first.
                </Typography>
            </Box>

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
        </Box>
    );
};

ProviderManagementTab.displayName = 'ProviderManagementTab';
export default ProviderManagementTab;
