/**
 * Unit tests for provider_utils.ts
 * Tests the testProviderModels function behavior
 */

// Mock the entire adapter module to avoid ES module issues with Wails-generated files
jest.mock('../adapter', () => {
    const originalModule = jest.requireActual('../adapter');
    return { ...originalModule, getLogger: jest.fn().mockReturnValue({ logDebug: jest.fn(), logInfo: jest.fn(), logError: jest.fn() }) };
});

import { ProviderConfig } from '../adapter';
import { AppDispatch } from '../store';
import { enqueueNotification } from '../store/notifications';
import { setAppBusy } from '../store/ui';
import { parseError } from './error_utils';
import { testProviderModels } from './provider_utils';

describe('testProviderModels', () => {
    let mockDispatch: jest.Mocked<AppDispatch>;
    let mockSetTestResults: jest.Mock<(results: { models: string[]; connectionSuccess: boolean } | null) => void>;

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

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();

        // Create mock dispatch function
        mockDispatch = jest.fn() as unknown as jest.Mocked<AppDispatch>;

        // Mock setTestResults callback
        mockSetTestResults = jest.fn();
    });

    describe('successful model testing', () => {
        it('sets test results with models and success flag when provider models are retrieved successfully', async () => {
            // Arrange
            const mockModels = ['model-1', 'model-2', 'model-3'];

            // Mock the dispatch to handle different actions
            // @ts-expect-error Tests can have errors with Jest types
            mockDispatch.mockImplementation((action) => {
                // Check if it's a function (thunk) - this should be getModelsListForProvider
                if (typeof action === 'function') {
                    // Return the object with unwrap directly, not wrapped in another promise
                    return { unwrap: () => Promise.resolve(mockModels) };
                }

                // Handle regular actions - return them directly since they're synchronous
                if (action.type === 'ui/setAppBusy') {
                    return action;
                }

                if (action.type === 'notifications/enqueueNotification') {
                    return action;
                }

                return {};
            });

            // Act
            await testProviderModels(mockDispatch, mockProviderConfig, mockSetTestResults);

            // Assert
            // Verify setAppBusy was called with true then false
            expect(mockDispatch).toHaveBeenCalledWith(setAppBusy(true));
            expect(mockDispatch).toHaveBeenCalledWith(setAppBusy(false));

            // Verify getModelsListForProvider was dispatched (check that a function was called)
            expect(mockDispatch).toHaveBeenCalledWith(expect.any(Function));

            // Verify setTestResults was called with correct results
            expect(mockSetTestResults).toHaveBeenCalledWith({ models: mockModels, connectionSuccess: true });

            // Verify success notification was dispatched
            expect(mockDispatch).toHaveBeenCalledWith(
                enqueueNotification({ message: `Found ${mockModels.length} models for this provider`, severity: 'success' }),
            );
        });
    });

    describe('failed model testing', () => {
        it('sets test results with empty models and failure flag when provider models retrieval fails', async () => {
            // Arrange
            const mockError = new Error('Connection failed');

            // Mock the dispatch to handle different actions for error case
            // @ts-expect-error Tests can have errors with Jest types
            mockDispatch.mockImplementation((action) => {
                // Check if it's a function (thunk) - this should be getModelsListForProvider
                if (typeof action === 'function') {
                    // Return the object with unwrap that rejects
                    return { unwrap: () => Promise.reject(mockError) };
                }

                // Handle regular actions - return them directly since they're synchronous
                if (action.type === 'ui/setAppBusy') {
                    return action;
                }

                if (action.type === 'notifications/enqueueNotification') {
                    return action;
                }

                return {};
            });

            // Act
            await testProviderModels(mockDispatch, mockProviderConfig, mockSetTestResults);

            // Assert
            // Verify setAppBusy was called with true then false
            expect(mockDispatch).toHaveBeenCalledWith(setAppBusy(true));
            expect(mockDispatch).toHaveBeenCalledWith(setAppBusy(false));

            // Verify getModelsListForProvider was dispatched (check that a function was called)
            expect(mockDispatch).toHaveBeenCalledWith(expect.any(Function));

            // Verify setTestResults was called with failure results
            expect(mockSetTestResults).toHaveBeenCalledWith({ models: [], connectionSuccess: false });

            // Verify error notification was dispatched with parsed error
            const parsedError = parseError(mockError);
            expect(mockDispatch).toHaveBeenCalledWith(
                enqueueNotification({ message: `Failed to test models: ${parsedError.message}`, severity: 'error' }),
            );
        });

        it('handles different error types correctly when parsing errors', async () => {
            // Arrange
            const testCases = [
                { name: 'Error object', error: new Error('Network error'), expectedMessagePart: 'Network error' },
                { name: 'String error', error: 'Connection timeout', expectedMessagePart: 'Connection timeout' },
                { name: 'Null error', error: null, expectedMessagePart: 'Received null value' },
                { name: 'Undefined error', error: undefined, expectedMessagePart: 'Received undefined value' },
            ];

            for (const testCase of testCases) {
                // Reset mocks for each iteration
                mockSetTestResults.mockClear();
                // @ts-expect-error Tests can have errors with Jest types
                mockDispatch.mockClear();

                // Mock the dispatch to handle different actions for error case
                // @ts-expect-error Tests can have errors with Jest types
                mockDispatch.mockImplementation((action) => {
                    // Check if it's a function (thunk) - this should be getModelsListForProvider
                    if (typeof action === 'function') {
                        return { unwrap: () => Promise.reject(testCase.error) };
                    }

                    // Handle regular actions - return them directly since they're synchronous
                    if (action.type === 'ui/setAppBusy') {
                        return action;
                    }

                    if (action.type === 'notifications/enqueueNotification') {
                        return action;
                    }

                    return {};
                });

                // Act
                await testProviderModels(mockDispatch, mockProviderConfig, mockSetTestResults);

                // Assert
                expect(mockSetTestResults).toHaveBeenCalledWith({ models: [], connectionSuccess: false });

                // Verify error notification contains expected message part
                // @ts-expect-error Tests can have errors with Jest types
                const errorNotifications = mockDispatch.mock.calls.filter((call) => call[0].type === enqueueNotification.type);

                expect(errorNotifications.length).toBeGreaterThan(0);
                const notificationCall = errorNotifications[0][0];
                expect(notificationCall.payload.message).toContain(testCase.expectedMessagePart);
                expect(notificationCall.payload.severity).toBe('error');
            }
        });
    });

    describe('state management', () => {
        it('always sets app to not busy in finally block even when error occurs', async () => {
            // Arrange
            const mockError = new Error('Unexpected error');

            // Mock the dispatch to handle different actions for error case
            // @ts-expect-error Tests can have errors with Jest types
            mockDispatch.mockImplementation((action) => {
                // Check if it's a function (thunk) - this should be getModelsListForProvider
                if (typeof action === 'function') {
                    return { unwrap: () => Promise.reject(mockError) };
                }

                // Handle regular actions - return them directly since they're synchronous
                if (action.type === 'ui/setAppBusy') {
                    return action;
                }

                if (action.type === 'notifications/enqueueNotification') {
                    return action;
                }

                return {};
            });

            // Act
            await testProviderModels(mockDispatch, mockProviderConfig, mockSetTestResults);

            // Assert
            // Count setAppBusy calls - should be called with true then false
            // @ts-expect-error Tests can have errors with Jest types
            const setAppBusyCalls = mockDispatch.mock.calls.filter((call) => call[0].type === setAppBusy.type);

            expect(setAppBusyCalls.length).toBe(2);
            expect(setAppBusyCalls[0][0].payload).toBe(true);
            expect(setAppBusyCalls[1][0].payload).toBe(false);
        });
    });
});
