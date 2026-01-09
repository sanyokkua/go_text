/**
 * Adapter Layer Interfaces
 * 
 * Defines the contract between frontend and backend services.
 * These interfaces abstract the Wails-generated Go backend bindings.
 */
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

/**
 * Logging service interface for structured logging across the application
 * 
 * Provides different log levels for debugging, error tracking, and information logging.
 * All methods are synchronous to avoid timing issues in critical paths.
 */
export interface ILoggerService {
    logPrint(message: string): void;
    logTrace(message: string): void;
    logDebug(message: string): void;
    logError(message: string): void;
    logFatal(message: string): void;
    logInfo(message: string): void;
    logWarning(message: string): void;
}

/**
 * Action handler interface for LLM operations
 * 
 * Manages all AI-related operations including completion requests, model management,
 * and prompt processing. Acts as the bridge between frontend UI and backend LLM services.
 */
export interface IActionHandler {
    getCompletionResponse(chatCompletionRequest: ChatCompletionRequest): Promise<string>;
    getCompletionResponseForProvider(providerConfig: ProviderConfig, arg2: ChatCompletionRequest): Promise<string>;
    getModelsList(): Promise<Array<string>>;
    getModelsListForProvider(providerConfig: ProviderConfig): Promise<Array<string>>;
    getPromptGroups(): Promise<Prompts>;
    processPrompt(promptActionRequest: PromptActionRequest): Promise<string>;
}

/**
 * Settings handler interface for application configuration management
 * 
 * Provides comprehensive CRUD operations for all application settings including:
 * - Provider configurations (LLM service endpoints and authentication)
 * - Model configurations (temperature, model selection)
 * - Language configurations (supported languages, defaults)
 * - Inference base configurations (timeouts, retries)
 * 
 * Follows a pattern of returning full updated objects rather than just success/failure.
 */
export interface ISettingsHandler {
    addLanguage(language: string): Promise<Array<string>>;
    createProviderConfig(providerConfig: ProviderConfig): Promise<ProviderConfig>;
    deleteProviderConfig(providerId: string): Promise<void>;
    getAllProviderConfigs(): Promise<Array<ProviderConfig>>;
    getAppSettingsMetadata(): Promise<AppSettingsMetadata>;
    getCurrentProviderConfig(): Promise<ProviderConfig>;
    getInferenceBaseConfig(): Promise<InferenceBaseConfig>;
    getLanguageConfig(): Promise<LanguageConfig>;
    getModelConfig(): Promise<ModelConfig>;
    getProviderConfig(providerId: string): Promise<ProviderConfig>;
    getSettings(): Promise<Settings>;
    removeLanguage(language: string): Promise<Array<string>>;
    resetSettingsToDefault(): Promise<Settings>;
    setAsCurrentProviderConfig(providerId: string): Promise<ProviderConfig>;
    setDefaultInputLanguage(language: string): Promise<void>;
    setDefaultOutputLanguage(language: string): Promise<void>;
    updateInferenceBaseConfig(inferenceBaseConfig: InferenceBaseConfig): Promise<InferenceBaseConfig>;
    updateModelConfig(modelConfig: ModelConfig): Promise<ModelConfig>;
    updateProviderConfig(providerConfig: ProviderConfig): Promise<ProviderConfig>;
}

/**
 * Event service interface for cross-component communication
 * 
 * Provides pub/sub pattern for decoupled component communication.
 * Supports single, multiple, and one-time event listeners with cleanup methods.
 */
export interface IEventsService {
    eventsEmit(eventName: string, ...data: unknown[]): void;
    eventsOn(eventName: string, callback: (...data: unknown[]) => void): () => void;
    eventsOnMultiple(eventName: string, callback: (...data: unknown[]) => void, maxCallbacks: number): () => void;
    eventsOnce(eventName: string, callback: (...data: unknown[]) => void): () => void;
    eventsOff(eventName: string, ...additionalEventNames: string[]): void;
    eventsOffAll(): void;
}

/**
 * Clipboard service interface for system clipboard operations
 * 
 * Abstracts platform-specific clipboard access with error handling.
 * Returns boolean success status for write operations to handle permission issues.
 */
export interface IClipboardService {
    getText(): Promise<string>;
    setText(text: string): Promise<boolean>;
}
