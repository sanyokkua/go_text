import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import {
    AppSettingsMetadata,
    ChatCompletionRequest,
    InferenceBaseConfig,
    LanguageConfig,
    ModelConfig,
    PromptActionRequest,
    Prompts,
    ProviderConfig,
    Settings,
} from './models';
import { ActionHandler, ClipboardService, EventsService, LoggerService, SettingsHandler } from './services';
// Import mocked Wails functions
import {
    ClipboardGetText,
    ClipboardSetText,
    EventsEmit,
    EventsOff,
    EventsOffAll,
    EventsOn,
    EventsOnce,
    EventsOnMultiple,
    LogDebug,
    LogError,
    LogInfo,
} from '../../../wailsjs/runtime';

import {
    GetCompletionResponse,
    GetCompletionResponseForProvider,
    GetModelsList,
    GetModelsListForProvider,
    GetPromptGroups,
    ProcessPrompt,
} from '../../../wailsjs/go/actions/ActionHandler';

import {
    AddLanguage,
    CreateProviderConfig,
    DeleteProviderConfig,
    GetAllProviderConfigs,
    GetAppSettingsMetadata,
    GetCurrentProviderConfig,
    GetInferenceBaseConfig,
    GetLanguageConfig,
    GetModelConfig,
    GetProviderConfig,
    GetSettings,
    RemoveLanguage,
    ResetSettingsToDefault,
    SetAsCurrentProviderConfig,
    SetDefaultInputLanguage,
    SetDefaultOutputLanguage,
    UpdateInferenceBaseConfig,
    UpdateModelConfig,
    UpdateProviderConfig,
} from '../../../wailsjs/go/settings/SettingsHandler';

// Mock Wails generated functions
jest.mock('../../../wailsjs/runtime', () => ({
    LogDebug: jest.fn(),
    LogError: jest.fn(),
    LogFatal: jest.fn(),
    LogInfo: jest.fn(),
    LogPrint: jest.fn(),
    LogTrace: jest.fn(),
    LogWarning: jest.fn(),
    ClipboardGetText: jest.fn(),
    ClipboardSetText: jest.fn(),
    EventsEmit: jest.fn(),
    EventsOff: jest.fn(),
    EventsOffAll: jest.fn(),
    EventsOn: jest.fn(),
    EventsOnMultiple: jest.fn(),
    EventsOnce: jest.fn(),
}));

jest.mock('../../../wailsjs/go/actions/ActionHandler', () => ({
    GetCompletionResponse: jest.fn(),
    GetCompletionResponseForProvider: jest.fn(),
    GetModelsList: jest.fn(),
    GetModelsListForProvider: jest.fn(),
    GetPromptGroups: jest.fn(),
    ProcessPrompt: jest.fn(),
}));

jest.mock('../../../wailsjs/go/settings/SettingsHandler', () => ({
    AddLanguage: jest.fn(),
    CreateProviderConfig: jest.fn(),
    DeleteProviderConfig: jest.fn(),
    GetAllProviderConfigs: jest.fn(),
    GetAppSettingsMetadata: jest.fn(),
    GetCurrentProviderConfig: jest.fn(),
    GetInferenceBaseConfig: jest.fn(),
    GetLanguageConfig: jest.fn(),
    GetModelConfig: jest.fn(),
    GetProviderConfig: jest.fn(),
    GetSettings: jest.fn(),
    RemoveLanguage: jest.fn(),
    ResetSettingsToDefault: jest.fn(),
    SetAsCurrentProviderConfig: jest.fn(),
    SetDefaultInputLanguage: jest.fn(),
    SetDefaultOutputLanguage: jest.fn(),
    UpdateInferenceBaseConfig: jest.fn(),
    UpdateModelConfig: jest.fn(),
    UpdateProviderConfig: jest.fn(),
}));

jest.mock('../../../wailsjs/go/models', () => ({
    llms: { ChatCompletionRequest: { createFrom: jest.fn((req) => req) } },
    settings: {
        ProviderConfig: { createFrom: jest.fn((config) => config) },
        InferenceBaseConfig: { createFrom: jest.fn((config) => config) },
        ModelConfig: { createFrom: jest.fn((config) => config) },
    },
}));

describe('Adapter Services', () => {
    let loggerService: LoggerService;

    beforeEach(() => {
        // Clear all mocks before each test
        jest.clearAllMocks();

        // Create a logger service for testing
        loggerService = new LoggerService('TestService');
    });

    describe('LoggerService', () => {
        it('logs debug message correctly', () => {
            // Arrange
            const message = 'Debug message';

            // Act
            loggerService.logDebug(message);

            // Assert
            expect(LogDebug).toHaveBeenCalledWith('[FrontendLogger].TestService: Debug message');
        });

        it('logs error message correctly', () => {
            // Arrange
            const message = 'Error message';

            // Act
            loggerService.logError(message);

            // Assert
            expect(LogError).toHaveBeenCalledWith('[FrontendLogger].TestService: Error message');
        });

        it('logs info message correctly', () => {
            // Arrange
            const message = 'Info message';

            // Act
            loggerService.logInfo(message);

            // Assert
            expect(LogInfo).toHaveBeenCalledWith('[FrontendLogger].TestService: Info message');
        });

        it('handles logger errors gracefully', () => {
            // Arrange
            const message = 'Test message';
            // @ts-expect-error as this is expected for tests
            LogDebug.mockImplementation(() => {
                throw new Error('Logging failed');
            });

            // Act & Assert - Should not throw
            expect(() => loggerService.logDebug(message)).not.toThrow();
        });

        it('creates logger with static method', () => {
            // Arrange & Act
            const logger = LoggerService.getLogger('StaticLogger');

            // Assert
            expect(logger).toBeInstanceOf(LoggerService);
        });
    });

    describe('ActionHandler', () => {
        let actionHandler: ActionHandler;
        let mockChatCompletionRequest: ChatCompletionRequest;
        let mockProviderConfig: ProviderConfig;
        let mockPromptActionRequest: PromptActionRequest;

        beforeEach(() => {
            actionHandler = new ActionHandler(loggerService);

            mockChatCompletionRequest = { model: 'gpt-3.5-turbo', messages: [{ role: 'user', content: 'Hello' }], stream: false };

            mockProviderConfig = {
                providerId: 'test-provider',
                providerName: 'TestProvider',
                providerType: 'openai',
                baseUrl: 'https://api.test.com',
                modelsEndpoint: '/models',
                completionEndpoint: '/completions',
                authType: 'bearer',
                authToken: 'test-token',
                useAuthTokenFromEnv: false,
                envVarTokenName: '',
                useCustomHeaders: false,
                headers: {},
                useCustomModels: false,
                customModels: [],
            };

            mockPromptActionRequest = { id: 'test-prompt', inputText: 'Test input' };
        });

        describe('getCompletionResponse', () => {
            it('returns completion response successfully', async () => {
                // Arrange
                const expectedResponse = 'Completion result';
                // @ts-expect-error as this is expected for tests
                GetCompletionResponse.mockResolvedValue(expectedResponse);

                // Act
                const result = await actionHandler.getCompletionResponse(mockChatCompletionRequest);

                // Assert
                expect(result).toBe(expectedResponse);
                // @ts-expect-error as this is expected for tests
                expect(GetCompletionResponse).toHaveBeenCalledWith(mockChatCompletionRequest);
                expect(LogInfo).toHaveBeenCalledWith(
                    '[FrontendLogger].TestService: Attempt to call Wails generated GetCompletionResponse with arguments: {"model":"gpt-3.5-turbo","messages":[{"role":"user","content":"Hello"}],"stream":false}',
                );
            });

            it('rejects with error when GetCompletionResponse fails', async () => {
                // Arrange
                const testError = new Error('Completion failed');
                // @ts-expect-error as this is expected for tests
                GetCompletionResponse.mockRejectedValue(testError);

                // Act & Assert
                await expect(actionHandler.getCompletionResponse(mockChatCompletionRequest)).rejects.toThrow('Completion failed');
                expect(LogError).toHaveBeenCalledWith(expect.stringContaining('Wails generated GetCompletionResponse failed'));
            });
        });

        describe('getCompletionResponseForProvider', () => {
            it('returns completion response for provider successfully', async () => {
                // Arrange
                const expectedResponse = 'Provider completion result';
                // @ts-expect-error as this is expected for tests
                GetCompletionResponseForProvider.mockResolvedValue(expectedResponse);

                // Act
                const result = await actionHandler.getCompletionResponseForProvider(mockProviderConfig, mockChatCompletionRequest);

                // Assert
                expect(result).toBe(expectedResponse);
                // @ts-expect-error as this is expected for tests
                expect(GetCompletionResponseForProvider).toHaveBeenCalledWith(mockProviderConfig, mockChatCompletionRequest);
            });

            it('rejects with error when GetCompletionResponseForProvider fails', async () => {
                // Arrange
                const testError = new Error('Provider completion failed');
                // @ts-expect-error as this is expected for tests
                GetCompletionResponseForProvider.mockRejectedValue(testError);

                // Act & Assert
                await expect(actionHandler.getCompletionResponseForProvider(mockProviderConfig, mockChatCompletionRequest)).rejects.toThrow(
                    'Provider completion failed',
                );
            });
        });

        describe('getModelsList', () => {
            it('returns models list successfully', async () => {
                // Arrange
                const expectedModels = ['model1', 'model2', 'model3'];
                // @ts-expect-error as this is expected for tests
                GetModelsList.mockResolvedValue(expectedModels);

                // Act
                const result = await actionHandler.getModelsList();

                // Assert
                expect(result).toEqual(expectedModels);
                expect(GetModelsList).toHaveBeenCalled();
            });

            it('rejects with error when GetModelsList fails', async () => {
                // Arrange
                const testError = new Error('Failed to get models');
                // @ts-expect-error as this is expected for tests
                GetModelsList.mockRejectedValue(testError);

                // Act & Assert
                await expect(actionHandler.getModelsList()).rejects.toThrow('Failed to get models');
            });
        });

        describe('getModelsListForProvider', () => {
            it('returns models list for provider successfully', async () => {
                // Arrange
                const expectedModels = ['provider-model1', 'provider-model2'];
                // @ts-expect-error as this is expected for tests
                GetModelsListForProvider.mockResolvedValue(expectedModels);

                // Act
                const result = await actionHandler.getModelsListForProvider(mockProviderConfig);

                // Assert
                expect(result).toEqual(expectedModels);
                expect(GetModelsListForProvider).toHaveBeenCalledWith(mockProviderConfig);
            });

            it('rejects with error when GetModelsListForProvider fails', async () => {
                // Arrange
                const testError = new Error('Failed to get provider models');
                // @ts-expect-error as this is expected for tests
                GetModelsListForProvider.mockRejectedValue(testError);

                // Act & Assert
                await expect(actionHandler.getModelsListForProvider(mockProviderConfig)).rejects.toThrow('Failed to get provider models');
            });
        });

        describe('getPromptGroups', () => {
            it('returns prompt groups successfully', async () => {
                // Arrange
                const expectedPrompts: Prompts = {
                    promptGroups: {
                        group1: {
                            groupId: 'group1',
                            groupName: 'Test Group',
                            systemPrompt: { id: 'sys1', name: 'System', type: 'system', category: 'test', value: 'You are a helpful assistant' },
                            prompts: { prompt1: { id: 'prompt1', name: 'Test Prompt', type: 'user', category: 'test', value: 'Hello there' } },
                        },
                    },
                };
                // @ts-expect-error as this is expected for tests
                GetPromptGroups.mockResolvedValue(expectedPrompts);

                // Act
                const result = await actionHandler.getPromptGroups();

                // Assert
                expect(result).toEqual(expectedPrompts);
                expect(GetPromptGroups).toHaveBeenCalled();
            });

            it('rejects with error when GetPromptGroups fails', async () => {
                // Arrange
                const testError = new Error('Failed to get prompt groups');
                // @ts-expect-error as this is expected for tests
                GetPromptGroups.mockRejectedValue(testError);

                // Act & Assert
                await expect(actionHandler.getPromptGroups()).rejects.toThrow('Failed to get prompt groups');
            });
        });

        describe('processPrompt', () => {
            it('processes prompt successfully', async () => {
                // Arrange
                const expectedResult = 'Processed prompt result';
                // @ts-expect-error as this is expected for tests
                ProcessPrompt.mockResolvedValue(expectedResult);

                // Act
                const result = await actionHandler.processPrompt(mockPromptActionRequest);

                // Assert
                expect(result).toBe(expectedResult);
                expect(ProcessPrompt).toHaveBeenCalledWith(mockPromptActionRequest);
            });

            it('rejects with error when ProcessPrompt fails', async () => {
                // Arrange
                const testError = new Error('Failed to process prompt');
                // @ts-expect-error as this is expected for tests
                ProcessPrompt.mockRejectedValue(testError);

                // Act & Assert
                await expect(actionHandler.processPrompt(mockPromptActionRequest)).rejects.toThrow('Failed to process prompt');
            });
        });
    });

    describe('SettingsHandler', () => {
        let settingsHandler: SettingsHandler;

        beforeEach(() => {
            settingsHandler = new SettingsHandler(loggerService);
        });

        describe('addLanguage', () => {
            it('adds language successfully', async () => {
                // Arrange
                const language = 'Spanish';
                const expectedLanguages = ['English', 'Spanish', 'French'];
                // @ts-expect-error as this is expected for tests
                AddLanguage.mockResolvedValue(expectedLanguages);

                // Act
                const result = await settingsHandler.addLanguage(language);

                // Assert
                expect(result).toEqual(expectedLanguages);
                expect(AddLanguage).toHaveBeenCalledWith(language);
            });

            it('rejects with error when AddLanguage fails', async () => {
                // Arrange
                const language = 'Spanish';
                const testError = new Error('Failed to add language');
                // @ts-expect-error as this is expected for tests
                AddLanguage.mockRejectedValue(testError);

                // Act & Assert
                await expect(settingsHandler.addLanguage(language)).rejects.toThrow('Failed to add language');
            });
        });

        describe('createProviderConfig', () => {
            it('creates provider config successfully', async () => {
                // Arrange
                const providerConfig: ProviderConfig = {
                    providerId: 'new-provider',
                    providerName: 'NewProvider',
                    providerType: 'openai',
                    baseUrl: 'https://api.new.com',
                    modelsEndpoint: '/models',
                    completionEndpoint: '/completions',
                    authType: 'bearer',
                    authToken: 'new-token',
                    useAuthTokenFromEnv: false,
                    envVarTokenName: '',
                    useCustomHeaders: false,
                    headers: {},
                    useCustomModels: false,
                    customModels: [],
                };
                // @ts-expect-error as this is expected for tests
                CreateProviderConfig.mockResolvedValue(providerConfig);

                // Act
                const result = await settingsHandler.createProviderConfig(providerConfig);

                // Assert
                expect(result).toEqual(providerConfig);
                expect(CreateProviderConfig).toHaveBeenCalledWith(providerConfig);
            });

            it('rejects with error when CreateProviderConfig fails', async () => {
                // Arrange
                const providerConfig: ProviderConfig = {
                    providerId: 'new-provider',
                    providerName: 'NewProvider',
                    providerType: 'openai',
                    baseUrl: 'https://api.new.com',
                    modelsEndpoint: '/models',
                    completionEndpoint: '/completions',
                    authType: 'bearer',
                    authToken: 'new-token',
                    useAuthTokenFromEnv: false,
                    envVarTokenName: '',
                    useCustomHeaders: false,
                    headers: {},
                    useCustomModels: false,
                    customModels: [],
                };
                const testError = new Error('Failed to create provider config');
                // @ts-expect-error as this is expected for tests
                CreateProviderConfig.mockRejectedValue(testError);

                // Act & Assert
                await expect(settingsHandler.createProviderConfig(providerConfig)).rejects.toThrow('Failed to create provider config');
            });
        });

        describe('deleteProviderConfig', () => {
            it('deletes provider config successfully', async () => {
                // Arrange
                const providerId = 'test-provider';
                // @ts-expect-error as this is expected for tests
                DeleteProviderConfig.mockResolvedValue(undefined);

                // Act
                await settingsHandler.deleteProviderConfig(providerId);

                // Assert
                expect(DeleteProviderConfig).toHaveBeenCalledWith(providerId);
            });

            it('rejects with error when DeleteProviderConfig fails', async () => {
                // Arrange
                const providerId = 'test-provider';
                const testError = new Error('Failed to delete provider config');
                // @ts-expect-error as this is expected for tests
                DeleteProviderConfig.mockRejectedValue(testError);

                // Act & Assert
                await expect(settingsHandler.deleteProviderConfig(providerId)).rejects.toThrow('Failed to delete provider config');
            });
        });

        describe('getAllProviderConfigs', () => {
            it('returns all provider configs successfully', async () => {
                // Arrange
                const expectedConfigs: ProviderConfig[] = [
                    {
                        providerId: 'provider1',
                        providerName: 'Provider1',
                        providerType: 'openai',
                        baseUrl: 'https://api1.com',
                        modelsEndpoint: '/models',
                        completionEndpoint: '/completions',
                        authType: 'bearer',
                        authToken: 'token1',
                        useAuthTokenFromEnv: false,
                        envVarTokenName: '',
                        useCustomHeaders: false,
                        headers: {},
                        useCustomModels: false,
                        customModels: [],
                    },
                ];
                // @ts-expect-error as this is expected for tests
                GetAllProviderConfigs.mockResolvedValue(expectedConfigs);

                // Act
                const result = await settingsHandler.getAllProviderConfigs();

                // Assert
                expect(result).toEqual(expectedConfigs);
                expect(GetAllProviderConfigs).toHaveBeenCalled();
            });

            it('rejects with error when GetAllProviderConfigs fails', async () => {
                // Arrange
                const testError = new Error('Failed to get provider configs');
                // @ts-expect-error as this is expected for tests
                GetAllProviderConfigs.mockRejectedValue(testError);

                // Act & Assert
                await expect(settingsHandler.getAllProviderConfigs()).rejects.toThrow('Failed to get provider configs');
            });
        });

        describe('getAppSettingsMetadata', () => {
            it('returns app settings metadata successfully', async () => {
                // Arrange
                const expectedMetadata: AppSettingsMetadata = {
                    authTypes: ['bearer', 'api-key'],
                    providerTypes: ['openai', 'azure'],
                    settingsFolder: '/config',
                    settingsFile: 'settings.json',
                };
                // @ts-expect-error as this is expected for tests
                GetAppSettingsMetadata.mockResolvedValue(expectedMetadata);

                // Act
                const result = await settingsHandler.getAppSettingsMetadata();

                // Assert
                expect(result).toEqual(expectedMetadata);
                expect(GetAppSettingsMetadata).toHaveBeenCalled();
            });

            it('rejects with error when GetAppSettingsMetadata fails', async () => {
                // Arrange
                const testError = new Error('Failed to get app settings metadata');
                // @ts-expect-error as this is expected for tests
                GetAppSettingsMetadata.mockRejectedValue(testError);

                // Act & Assert
                await expect(settingsHandler.getAppSettingsMetadata()).rejects.toThrow('Failed to get app settings metadata');
            });
        });

        describe('getCurrentProviderConfig', () => {
            it('returns current provider config successfully', async () => {
                // Arrange
                const expectedConfig: ProviderConfig = {
                    providerId: 'current-provider',
                    providerName: 'CurrentProvider',
                    providerType: 'openai',
                    baseUrl: 'https://api.current.com',
                    modelsEndpoint: '/models',
                    completionEndpoint: '/completions',
                    authType: 'bearer',
                    authToken: 'current-token',
                    useAuthTokenFromEnv: false,
                    envVarTokenName: '',
                    useCustomHeaders: false,
                    headers: {},
                    useCustomModels: false,
                    customModels: [],
                };
                // @ts-expect-error as this is expected for tests
                GetCurrentProviderConfig.mockResolvedValue(expectedConfig);

                // Act
                const result = await settingsHandler.getCurrentProviderConfig();

                // Assert
                expect(result).toEqual(expectedConfig);
                expect(GetCurrentProviderConfig).toHaveBeenCalled();
            });

            it('rejects with error when GetCurrentProviderConfig fails', async () => {
                // Arrange
                const testError = new Error('Failed to get current provider config');
                // @ts-expect-error as this is expected for tests
                GetCurrentProviderConfig.mockRejectedValue(testError);

                // Act & Assert
                await expect(settingsHandler.getCurrentProviderConfig()).rejects.toThrow('Failed to get current provider config');
            });
        });

        describe('getInferenceBaseConfig', () => {
            it('returns inference base config successfully', async () => {
                // Arrange
                const expectedConfig: InferenceBaseConfig = { timeout: 30, maxRetries: 3, useMarkdownForOutput: true };
                // @ts-expect-error as this is expected for tests
                GetInferenceBaseConfig.mockResolvedValue(expectedConfig);

                // Act
                const result = await settingsHandler.getInferenceBaseConfig();

                // Assert
                expect(result).toEqual(expectedConfig);
                expect(GetInferenceBaseConfig).toHaveBeenCalled();
            });

            it('rejects with error when GetInferenceBaseConfig fails', async () => {
                // Arrange
                const testError = new Error('Failed to get inference base config');
                // @ts-expect-error as this is expected for tests
                GetInferenceBaseConfig.mockRejectedValue(testError);

                // Act & Assert
                await expect(settingsHandler.getInferenceBaseConfig()).rejects.toThrow('Failed to get inference base config');
            });
        });

        describe('getLanguageConfig', () => {
            it('returns language config successfully', async () => {
                // Arrange
                const expectedConfig: LanguageConfig = {
                    languages: ['English', 'Spanish', 'French'],
                    defaultInputLanguage: 'English',
                    defaultOutputLanguage: 'English',
                };
                // @ts-expect-error as this is expected for tests
                GetLanguageConfig.mockResolvedValue(expectedConfig);

                // Act
                const result = await settingsHandler.getLanguageConfig();

                // Assert
                expect(result).toEqual(expectedConfig);
                expect(GetLanguageConfig).toHaveBeenCalled();
            });

            it('rejects with error when GetLanguageConfig fails', async () => {
                // Arrange
                const testError = new Error('Failed to get language config');
                // @ts-expect-error as this is expected for tests
                GetLanguageConfig.mockRejectedValue(testError);

                // Act & Assert
                await expect(settingsHandler.getLanguageConfig()).rejects.toThrow('Failed to get language config');
            });
        });

        describe('getModelConfig', () => {
            it('returns model config successfully', async () => {
                // Arrange
                const expectedConfig: ModelConfig = { name: 'gpt-3.5-turbo', useTemperature: true, temperature: 0.7 };
                // @ts-expect-error as this is expected for tests
                GetModelConfig.mockResolvedValue(expectedConfig);

                // Act
                const result = await settingsHandler.getModelConfig();

                // Assert
                expect(result).toEqual(expectedConfig);
                expect(GetModelConfig).toHaveBeenCalled();
            });

            it('rejects with error when GetModelConfig fails', async () => {
                // Arrange
                const testError = new Error('Failed to get model config');
                // @ts-expect-error as this is expected for tests
                GetModelConfig.mockRejectedValue(testError);

                // Act & Assert
                await expect(settingsHandler.getModelConfig()).rejects.toThrow('Failed to get model config');
            });
        });

        describe('getProviderConfig', () => {
            it('returns provider config successfully', async () => {
                // Arrange
                const providerId = 'test-provider';
                const expectedConfig: ProviderConfig = {
                    providerId: providerId,
                    providerName: 'TestProvider',
                    providerType: 'openai',
                    baseUrl: 'https://api.test.com',
                    modelsEndpoint: '/models',
                    completionEndpoint: '/completions',
                    authType: 'bearer',
                    authToken: 'test-token',
                    useAuthTokenFromEnv: false,
                    envVarTokenName: '',
                    useCustomHeaders: false,
                    headers: {},
                    useCustomModels: false,
                    customModels: [],
                };
                // @ts-expect-error as this is expected for tests
                GetProviderConfig.mockResolvedValue(expectedConfig);

                // Act
                const result = await settingsHandler.getProviderConfig(providerId);

                // Assert
                expect(result).toEqual(expectedConfig);
                expect(GetProviderConfig).toHaveBeenCalledWith(providerId);
            });

            it('rejects with error when GetProviderConfig fails', async () => {
                // Arrange
                const providerId = 'test-provider';
                const testError = new Error('Failed to get provider config');
                // @ts-expect-error as this is expected for tests
                GetProviderConfig.mockRejectedValue(testError);

                // Act & Assert
                await expect(settingsHandler.getProviderConfig(providerId)).rejects.toThrow('Failed to get provider config');
            });
        });

        describe('getSettings', () => {
            it('returns settings successfully', async () => {
                // Arrange
                const expectedSettings: Settings = {
                    availableProviderConfigs: [],
                    currentProviderConfig: {
                        providerId: 'current',
                        providerName: 'Current',
                        providerType: 'openai',
                        baseUrl: 'https://api.current.com',
                        modelsEndpoint: '/models',
                        completionEndpoint: '/completions',
                        authType: 'bearer',
                        authToken: 'token',
                        useAuthTokenFromEnv: false,
                        envVarTokenName: '',
                        useCustomHeaders: false,
                        headers: {},
                        useCustomModels: false,
                        customModels: [],
                    },
                    inferenceBaseConfig: { timeout: 30, maxRetries: 3, useMarkdownForOutput: true },
                    modelConfig: { name: 'gpt-3.5-turbo', useTemperature: true, temperature: 0.7 },
                    languageConfig: { languages: ['English'], defaultInputLanguage: 'English', defaultOutputLanguage: 'English' },
                };
                // @ts-expect-error as this is expected for tests
                GetSettings.mockResolvedValue(expectedSettings);

                // Act
                const result = await settingsHandler.getSettings();

                // Assert
                expect(result).toEqual(expectedSettings);
                expect(GetSettings).toHaveBeenCalled();
            });

            it('rejects with error when GetSettings fails', async () => {
                // Arrange
                const testError = new Error('Failed to get settings');
                // @ts-expect-error as this is expected for tests
                GetSettings.mockRejectedValue(testError);

                // Act & Assert
                await expect(settingsHandler.getSettings()).rejects.toThrow('Failed to get settings');
            });
        });

        describe('removeLanguage', () => {
            it('removes language successfully', async () => {
                // Arrange
                const language = 'Spanish';
                const expectedLanguages = ['English', 'French'];
                // @ts-expect-error as this is expected for tests
                RemoveLanguage.mockResolvedValue(expectedLanguages);

                // Act
                const result = await settingsHandler.removeLanguage(language);

                // Assert
                expect(result).toEqual(expectedLanguages);
                expect(RemoveLanguage).toHaveBeenCalledWith(language);
            });

            it('rejects with error when RemoveLanguage fails', async () => {
                // Arrange
                const language = 'Spanish';
                const testError = new Error('Failed to remove language');
                // @ts-expect-error as this is expected for tests
                RemoveLanguage.mockRejectedValue(testError);

                // Act & Assert
                await expect(settingsHandler.removeLanguage(language)).rejects.toThrow('Failed to remove language');
            });
        });

        describe('resetSettingsToDefault', () => {
            it('resets settings to default successfully', async () => {
                // Arrange
                const expectedSettings: Settings = {
                    availableProviderConfigs: [],
                    currentProviderConfig: {
                        providerId: 'default',
                        providerName: 'Default',
                        providerType: 'openai',
                        baseUrl: 'https://api.default.com',
                        modelsEndpoint: '/models',
                        completionEndpoint: '/completions',
                        authType: 'bearer',
                        authToken: 'default-token',
                        useAuthTokenFromEnv: false,
                        envVarTokenName: '',
                        useCustomHeaders: false,
                        headers: {},
                        useCustomModels: false,
                        customModels: [],
                    },
                    inferenceBaseConfig: { timeout: 30, maxRetries: 3, useMarkdownForOutput: true },
                    modelConfig: { name: 'gpt-3.5-turbo', useTemperature: true, temperature: 0.7 },
                    languageConfig: { languages: ['English'], defaultInputLanguage: 'English', defaultOutputLanguage: 'English' },
                };
                // @ts-expect-error as this is expected for tests
                ResetSettingsToDefault.mockResolvedValue(expectedSettings);

                // Act
                const result = await settingsHandler.resetSettingsToDefault();

                // Assert
                expect(result).toEqual(expectedSettings);
                expect(ResetSettingsToDefault).toHaveBeenCalled();
            });

            it('rejects with error when ResetSettingsToDefault fails', async () => {
                // Arrange
                const testError = new Error('Failed to reset settings');
                // @ts-expect-error as this is expected for tests
                ResetSettingsToDefault.mockRejectedValue(testError);

                // Act & Assert
                await expect(settingsHandler.resetSettingsToDefault()).rejects.toThrow('Failed to reset settings');
            });
        });

        describe('setAsCurrentProviderConfig', () => {
            it('sets current provider config successfully', async () => {
                // Arrange
                const providerId = 'test-provider';
                const expectedConfig: ProviderConfig = {
                    providerId: providerId,
                    providerName: 'TestProvider',
                    providerType: 'openai',
                    baseUrl: 'https://api.test.com',
                    modelsEndpoint: '/models',
                    completionEndpoint: '/completions',
                    authType: 'bearer',
                    authToken: 'test-token',
                    useAuthTokenFromEnv: false,
                    envVarTokenName: '',
                    useCustomHeaders: false,
                    headers: {},
                    useCustomModels: false,
                    customModels: [],
                };
                // @ts-expect-error as this is expected for tests
                SetAsCurrentProviderConfig.mockResolvedValue(expectedConfig);

                // Act
                const result = await settingsHandler.setAsCurrentProviderConfig(providerId);

                // Assert
                expect(result).toEqual(expectedConfig);
                expect(SetAsCurrentProviderConfig).toHaveBeenCalledWith(providerId);
            });

            it('rejects with error when SetAsCurrentProviderConfig fails', async () => {
                // Arrange
                const providerId = 'test-provider';
                const testError = new Error('Failed to set current provider config');
                // @ts-expect-error as this is expected for tests
                SetAsCurrentProviderConfig.mockRejectedValue(testError);

                // Act & Assert
                await expect(settingsHandler.setAsCurrentProviderConfig(providerId)).rejects.toThrow('Failed to set current provider config');
            });
        });

        describe('setDefaultInputLanguage', () => {
            it('sets default input language successfully', async () => {
                // Arrange
                const language = 'Spanish';
                // @ts-expect-error as this is expected for tests
                SetDefaultInputLanguage.mockResolvedValue(undefined);

                // Act
                await settingsHandler.setDefaultInputLanguage(language);

                // Assert
                expect(SetDefaultInputLanguage).toHaveBeenCalledWith(language);
            });

            it('rejects with error when SetDefaultInputLanguage fails', async () => {
                // Arrange
                const language = 'Spanish';
                const testError = new Error('Failed to set default input language');
                // @ts-expect-error as this is expected for tests
                SetDefaultInputLanguage.mockRejectedValue(testError);

                // Act & Assert
                await expect(settingsHandler.setDefaultInputLanguage(language)).rejects.toThrow('Failed to set default input language');
            });
        });

        describe('setDefaultOutputLanguage', () => {
            it('sets default output language successfully', async () => {
                // Arrange
                const language = 'French';
                // @ts-expect-error as this is expected for tests
                SetDefaultOutputLanguage.mockResolvedValue(undefined);

                // Act
                await settingsHandler.setDefaultOutputLanguage(language);

                // Assert
                expect(SetDefaultOutputLanguage).toHaveBeenCalledWith(language);
            });

            it('rejects with error when SetDefaultOutputLanguage fails', async () => {
                // Arrange
                const language = 'French';
                const testError = new Error('Failed to set default output language');
                // @ts-expect-error as this is expected for tests
                SetDefaultOutputLanguage.mockRejectedValue(testError);

                // Act & Assert
                await expect(settingsHandler.setDefaultOutputLanguage(language)).rejects.toThrow('Failed to set default output language');
            });
        });

        describe('updateInferenceBaseConfig', () => {
            it('updates inference base config successfully', async () => {
                // Arrange
                const config: InferenceBaseConfig = { timeout: 60, maxRetries: 5, useMarkdownForOutput: false };
                // @ts-expect-error as this is expected for tests
                UpdateInferenceBaseConfig.mockResolvedValue(config);

                // Act
                const result = await settingsHandler.updateInferenceBaseConfig(config);

                // Assert
                expect(result).toEqual(config);
                expect(UpdateInferenceBaseConfig).toHaveBeenCalledWith(config);
            });

            it('rejects with error when UpdateInferenceBaseConfig fails', async () => {
                // Arrange
                const config: InferenceBaseConfig = { timeout: 60, maxRetries: 5, useMarkdownForOutput: false };
                const testError = new Error('Failed to update inference base config');
                // @ts-expect-error as this is expected for tests
                UpdateInferenceBaseConfig.mockRejectedValue(testError);

                // Act & Assert
                await expect(settingsHandler.updateInferenceBaseConfig(config)).rejects.toThrow('Failed to update inference base config');
            });
        });

        describe('updateModelConfig', () => {
            it('updates model config successfully', async () => {
                // Arrange
                const config: ModelConfig = { name: 'gpt-4', useTemperature: true, temperature: 0.5 };
                // @ts-expect-error as this is expected for tests
                UpdateModelConfig.mockResolvedValue(config);

                // Act
                const result = await settingsHandler.updateModelConfig(config);

                // Assert
                expect(result).toEqual(config);
                expect(UpdateModelConfig).toHaveBeenCalledWith(config);
            });

            it('rejects with error when UpdateModelConfig fails', async () => {
                // Arrange
                const config: ModelConfig = { name: 'gpt-4', useTemperature: true, temperature: 0.5 };
                const testError = new Error('Failed to update model config');
                // @ts-expect-error as this is expected for tests
                UpdateModelConfig.mockRejectedValue(testError);

                // Act & Assert
                await expect(settingsHandler.updateModelConfig(config)).rejects.toThrow('Failed to update model config');
            });
        });

        describe('updateProviderConfig', () => {
            it('updates provider config successfully', async () => {
                // Arrange
                const config: ProviderConfig = {
                    providerId: 'updated-provider',
                    providerName: 'UpdatedProvider',
                    providerType: 'openai',
                    baseUrl: 'https://api.updated.com',
                    modelsEndpoint: '/models',
                    completionEndpoint: '/completions',
                    authType: 'bearer',
                    authToken: 'updated-token',
                    useAuthTokenFromEnv: false,
                    envVarTokenName: '',
                    useCustomHeaders: false,
                    headers: {},
                    useCustomModels: false,
                    customModels: [],
                };
                // @ts-expect-error as this is expected for tests
                UpdateProviderConfig.mockResolvedValue(config);

                // Act
                const result = await settingsHandler.updateProviderConfig(config);

                // Assert
                expect(result).toEqual(config);
                expect(UpdateProviderConfig).toHaveBeenCalledWith(config);
            });

            it('rejects with error when UpdateProviderConfig fails', async () => {
                // Arrange
                const config: ProviderConfig = {
                    providerId: 'updated-provider',
                    providerName: 'UpdatedProvider',
                    providerType: 'openai',
                    baseUrl: 'https://api.updated.com',
                    modelsEndpoint: '/models',
                    completionEndpoint: '/completions',
                    authType: 'bearer',
                    authToken: 'updated-token',
                    useAuthTokenFromEnv: false,
                    envVarTokenName: '',
                    useCustomHeaders: false,
                    headers: {},
                    useCustomModels: false,
                    customModels: [],
                };
                const testError = new Error('Failed to update provider config');
                // @ts-expect-error as this is expected for tests
                UpdateProviderConfig.mockRejectedValue(testError);

                // Act & Assert
                await expect(settingsHandler.updateProviderConfig(config)).rejects.toThrow('Failed to update provider config');
            });
        });
    });

    describe('EventsService', () => {
        let eventsService: EventsService;

        beforeEach(() => {
            eventsService = new EventsService(loggerService);
        });

        describe('eventsEmit', () => {
            it('emits event successfully', () => {
                // Arrange
                const eventName = 'test-event';
                const data = { key: 'value' };

                // Act
                eventsService.eventsEmit(eventName, data);

                // Assert
                expect(EventsEmit).toHaveBeenCalledWith(eventName, data);
                expect(LogInfo).toHaveBeenCalledWith(
                    '[FrontendLogger].TestService: Attempt to call Wails generated EventsEmit with event: test-event',
                );
            });

            it('handles event emit errors gracefully', () => {
                // Arrange
                const eventName = 'test-event';
                // @ts-expect-error as this is expected for tests
                EventsEmit.mockImplementation(() => {
                    throw new Error('Event emit failed');
                });

                // Act & Assert - Should not throw
                expect(() => eventsService.eventsEmit(eventName)).not.toThrow();
                expect(LogError).toHaveBeenCalledWith(expect.stringContaining('Wails generated EventsEmit failed'));
            });
        });

        describe('eventsOff', () => {
            it('turns off event successfully', () => {
                // Arrange
                const eventName = 'test-event';
                const additionalEvents = ['event1', 'event2'];

                // Act
                eventsService.eventsOff(eventName, ...additionalEvents);

                // Assert
                expect(EventsOff).toHaveBeenCalledWith(eventName, ...additionalEvents);
            });

            it('handles events off errors gracefully', () => {
                // Arrange
                const eventName = 'test-event';
                // @ts-expect-error as this is expected for tests
                EventsOff.mockImplementation(() => {
                    throw new Error('Events off failed');
                });

                // Act & Assert - Should not throw
                expect(() => eventsService.eventsOff(eventName)).not.toThrow();
            });
        });

        describe('eventsOffAll', () => {
            it('turns off all events successfully', () => {
                // Act
                eventsService.eventsOffAll();

                // Assert
                expect(EventsOffAll).toHaveBeenCalled();
            });

            it('handles events off all errors gracefully', () => {
                // Arrange
                // @ts-expect-error as this is expected for tests
                EventsOffAll.mockImplementation(() => {
                    throw new Error('Events off all failed');
                });

                // Act & Assert - Should not throw
                expect(() => eventsService.eventsOffAll()).not.toThrow();
            });
        });

        describe('eventsOn', () => {
            it('subscribes to event successfully', () => {
                // Arrange
                const eventName = 'test-event';
                const callback = jest.fn();
                const mockUnsubscribe = jest.fn();
                // @ts-expect-error as this is expected for tests
                EventsOn.mockReturnValue(mockUnsubscribe);

                // Act
                const result = eventsService.eventsOn(eventName, callback);

                // Assert
                expect(EventsOn).toHaveBeenCalledWith(eventName, callback);
                expect(result).toBe(mockUnsubscribe);
            });

            it('returns empty function when events on fails', () => {
                // Arrange
                const eventName = 'test-event';
                const callback = jest.fn();
                // @ts-expect-error as this is expected for tests
                EventsOn.mockImplementation(() => {
                    throw new Error('Events on failed');
                });

                // Act
                const result = eventsService.eventsOn(eventName, callback);

                // Assert
                expect(result).toBeInstanceOf(Function);
                expect(() => result()).not.toThrow();
            });
        });

        describe('eventsOnMultiple', () => {
            it('subscribes to event with max callbacks successfully', () => {
                // Arrange
                const eventName = 'test-event';
                const callback = jest.fn();
                const maxCallbacks = 3;
                const mockUnsubscribe = jest.fn();
                // @ts-expect-error as this is expected for tests
                EventsOnMultiple.mockReturnValue(mockUnsubscribe);

                // Act
                const result = eventsService.eventsOnMultiple(eventName, callback, maxCallbacks);

                // Assert
                expect(EventsOnMultiple).toHaveBeenCalledWith(eventName, callback, maxCallbacks);
                expect(result).toBe(mockUnsubscribe);
            });

            it('returns empty function when events on multiple fails', () => {
                // Arrange
                const eventName = 'test-event';
                const callback = jest.fn();
                const maxCallbacks = 3;
                // @ts-expect-error as this is expected for tests
                EventsOnMultiple.mockImplementation(() => {
                    throw new Error('Events on multiple failed');
                });

                // Act
                const result = eventsService.eventsOnMultiple(eventName, callback, maxCallbacks);

                // Assert
                expect(result).toBeInstanceOf(Function);
                expect(() => result()).not.toThrow();
            });
        });

        describe('eventsOnce', () => {
            it('subscribes to event once successfully', () => {
                // Arrange
                const eventName = 'test-event';
                const callback = jest.fn();
                const mockUnsubscribe = jest.fn();
                // @ts-expect-error as this is expected for tests
                EventsOnce.mockReturnValue(mockUnsubscribe);

                // Act
                const result = eventsService.eventsOnce(eventName, callback);

                // Assert
                expect(EventsOnce).toHaveBeenCalledWith(eventName, callback);
                expect(result).toBe(mockUnsubscribe);
            });

            it('returns empty function when events once fails', () => {
                // Arrange
                const eventName = 'test-event';
                const callback = jest.fn();
                // @ts-expect-error as this is expected for tests
                EventsOnce.mockImplementation(() => {
                    throw new Error('Events once failed');
                });

                // Act
                const result = eventsService.eventsOnce(eventName, callback);

                // Assert
                expect(result).toBeInstanceOf(Function);
                expect(() => result()).not.toThrow();
            });
        });
    });

    describe('ClipboardService', () => {
        let clipboardService: ClipboardService;

        beforeEach(() => {
            clipboardService = new ClipboardService(loggerService);
        });

        describe('getText', () => {
            it('gets clipboard text successfully', async () => {
                // Arrange
                const expectedText = 'Clipboard content';
                // @ts-expect-error as this is expected for tests
                ClipboardGetText.mockResolvedValue(expectedText);

                // Act
                const result = await clipboardService.getText();

                // Assert
                expect(result).toBe(expectedText);
                expect(ClipboardGetText).toHaveBeenCalled();
            });

            it('rejects with error when ClipboardGetText fails', async () => {
                // Arrange
                const testError = new Error('Failed to get clipboard text');
                // @ts-expect-error as this is expected for tests
                ClipboardGetText.mockRejectedValue(testError);

                // Act & Assert
                await expect(clipboardService.getText()).rejects.toThrow('Failed to get clipboard text');
            });
        });

        describe('setText', () => {
            it('sets clipboard text successfully', async () => {
                // Arrange
                const text = 'New clipboard content';
                const expectedResult = true;
                // @ts-expect-error as this is expected for tests
                ClipboardSetText.mockResolvedValue(expectedResult);

                // Act
                const result = await clipboardService.setText(text);

                // Assert
                expect(result).toBe(expectedResult);
                expect(ClipboardSetText).toHaveBeenCalledWith(text);
            });

            it('rejects with error when ClipboardSetText fails', async () => {
                // Arrange
                const text = 'New clipboard content';
                const testError = new Error('Failed to set clipboard text');
                // @ts-expect-error as this is expected for tests
                ClipboardSetText.mockRejectedValue(testError);

                // Act & Assert
                await expect(clipboardService.setText(text)).rejects.toThrow('Failed to set clipboard text');
            });
        });
    });
});
