jest.mock('../adapter', () => ({ getLogger: jest.fn().mockReturnValue({ logDebug: jest.fn(), logInfo: jest.fn(), logError: jest.fn() }) }));

import { ProviderConfig } from '../adapter';
import { AppDispatch } from '../store';
import { enqueueNotification } from '../store/notifications';
import { parseError } from './error_utils';
import { testProviderModels } from './provider_utils';

describe('testProviderModels', () => {
    let mockDispatch: jest.Mocked<AppDispatch>;
    let mockSetTestResults: jest.Mock;

    const mockProviderConfig: ProviderConfig = {
        providerId: 'test-provider-1',
        providerName: 'Test Provider',
        providerType: 'openai',
        baseUrl: 'https://api.test.com',
        modelsEndpoint: '/v1/models',
        completionEndpoint: '/v1/completions',
        authType: 'bearer',
        authToken: 'test-token',
        useAuthTokenFromEnv: false,
        envVarTokenName: '',
        useCustomHeaders: false,
        headers: {},
        useCustomModels: false,
        customModels: [],
    };

    const mockModels = [
        { id: 'model-1', label: 'Model One', caps: [] },
        { id: 'model-2', label: 'Model Two', caps: [] },
    ];

    beforeEach(() => {
        jest.clearAllMocks();
        mockDispatch = jest.fn() as unknown as jest.Mocked<AppDispatch>;
        mockSetTestResults = jest.fn();
    });

    it('sets test results with models and success flag when provider models are retrieved successfully', async () => {
        // @ts-expect-error mock dispatch
        mockDispatch.mockImplementation((action) => {
            if (typeof action === 'function') {
                return { unwrap: () => Promise.resolve(mockModels) };
            }
            return action;
        });

        await testProviderModels(mockDispatch, mockProviderConfig, mockSetTestResults);

        expect(mockSetTestResults).toHaveBeenCalledWith({ models: mockModels, connectionSuccess: true });
        expect(mockDispatch).toHaveBeenCalledWith(
            enqueueNotification({ message: `Found ${mockModels.length} models for this provider`, severity: 'success' }),
        );
    });

    it('sets test results with empty models and failure flag when retrieval fails', async () => {
        const mockError = new Error('Connection failed');
        // @ts-expect-error mock dispatch
        mockDispatch.mockImplementation((action) => {
            if (typeof action === 'function') {
                return { unwrap: () => Promise.reject(mockError) };
            }
            return action;
        });

        await testProviderModels(mockDispatch, mockProviderConfig, mockSetTestResults);

        expect(mockSetTestResults).toHaveBeenCalledWith({ models: [], connectionSuccess: false });
        const parsedError = parseError(mockError);
        expect(mockDispatch).toHaveBeenCalledWith(
            enqueueNotification({ message: `Failed to test models: ${parsedError.message}`, severity: 'error' }),
        );
    });

    it('handles different error types correctly when parsing errors', async () => {
        const testCases = [
            { error: new Error('Network error'), expectedMessagePart: 'Network error' },
            { error: 'Connection timeout', expectedMessagePart: 'Connection timeout' },
            { error: null, expectedMessagePart: 'Received null value' },
            { error: undefined, expectedMessagePart: 'Received undefined value' },
        ];

        for (const testCase of testCases) {
            mockSetTestResults.mockClear();
            (mockDispatch as jest.Mock).mockClear();

            // @ts-expect-error mock dispatch
            mockDispatch.mockImplementation((action) => {
                if (typeof action === 'function') {
                    return { unwrap: () => Promise.reject(testCase.error) };
                }
                return action;
            });

            await testProviderModels(mockDispatch, mockProviderConfig, mockSetTestResults);

            expect(mockSetTestResults).toHaveBeenCalledWith({ models: [], connectionSuccess: false });

            // @ts-expect-error mock dispatch
            const errorNotifications = mockDispatch.mock.calls.filter((call) => call[0].type === enqueueNotification.type);
            expect(errorNotifications.length).toBeGreaterThan(0);
            expect(errorNotifications[0][0].payload.message).toContain(testCase.expectedMessagePart);
            expect(errorNotifications[0][0].payload.severity).toBe('error');
        }
    });
});
