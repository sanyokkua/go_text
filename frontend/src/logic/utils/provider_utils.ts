/**
 * Provider utility functions for common provider operations
 */

import { getLogger, ProviderConfig } from '../adapter';
import { AppDispatch } from '../store';
import { getModelsListForProvider } from '../store/actions';
import { enqueueNotification } from '../store/notifications';
import { setAppBusy } from '../store/ui';

const logger = getLogger('ProviderUtils');

/**
 * Test models for a provider configuration
 * @param dispatch - Redux dispatch function
 * @param providerConfig - Provider configuration to test
 * @param setTestResults - Function to set test results state
 * @returns Promise that resolves when testing is complete
 */
export async function testProviderModels(
    dispatch: AppDispatch,
    providerConfig: ProviderConfig,
    setTestResults: (results: { models: string[]; connectionSuccess: boolean } | null) => void,
): Promise<void> {
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
}
