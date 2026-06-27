import { apperr } from '../../../wailsjs/go/models';
import { getLogger, ProviderConfig } from '../adapter';
import { AppDispatch } from '../store';
import { loadModelsForProvider } from '../store/actions';
import { enqueueNotification } from '../store/notifications';
import { parseError } from './error_utils';

const logger = getLogger('ProviderUtils');

export async function testProviderModels(
    dispatch: AppDispatch,
    providerConfig: ProviderConfig,
    setTestResults: (results: { models: apperr.ModelInfo[]; connectionSuccess: boolean } | null) => void,
): Promise<void> {
    try {
        logger.logDebug(`Testing models for provider: ${providerConfig.providerName}`);
        const models = await dispatch(loadModelsForProvider(providerConfig.providerId)).unwrap();
        logger.logInfo(`Found ${models.length} models for provider: ${providerConfig.providerName}`);
        setTestResults({ models, connectionSuccess: true });
        dispatch(enqueueNotification({ message: `Found ${models.length} models for this provider`, severity: 'success' }));
    } catch (error: unknown) {
        const err = parseError(error);
        logger.logError(`Failed to test models for provider ${providerConfig.providerName}: ${err.message}`);
        dispatch(enqueueNotification({ message: `Failed to test models: ${err.message}`, severity: 'error' }));
        setTestResults({ models: [], connectionSuccess: false });
    }
}
