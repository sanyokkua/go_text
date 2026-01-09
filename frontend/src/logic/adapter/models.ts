/**
 * Data Models for Adapter Layer
 * 
 * Defines the data contracts between frontend and backend services.
 * These models represent the structured data exchanged with the Go backend.
 */

/**
 * Optional parameters for LLM completion requests
 * 
 * Currently only supports temperature, but designed for extensibility.
 */
export interface Options {
    temperature?: number;
}

/**
 * Individual message in a chat completion request
 * 
 * Represents a single turn in a conversation with role and content.
 */
export interface CompletionRequestMessage {
    role: string;
    content: string;
}

/**
 * Complete chat completion request payload
 * 
 * Defines all parameters needed for an LLM completion request including:
 * - Model identification
 * - Conversation history
 * - Generation parameters
 * - Streaming configuration
 */
export interface ChatCompletionRequest {
    model: string;
    messages: CompletionRequestMessage[];
    temperature?: number;
    options?: Options;
    stream: boolean;
    n?: number;
}

/**
 * Individual prompt definition
 * 
 * Represents a single action/prompt that can be executed by the user.
 * Contains metadata and the actual prompt template.
 */
export interface Prompt {
    id: string;
    name: string;
    type: string;
    category: string;
    value: string;
}

/**
 * Request payload for executing a specific prompt action
 * 
 * Contains the prompt ID, input text, and language configuration.
 * Used when user clicks an action button in the UI.
 */
export interface PromptActionRequest {
    id: string;
    inputText: string;
    outputText?: string;
    inputLanguageId?: string;
    outputLanguageId?: string;
}

/**
 * Group of related prompts
 * 
 * Organizes prompts into logical categories (e.g., "Translation", "Summarization").
 * Each group has a system prompt and multiple user-facing prompts.
 */
export interface PromptGroup {
    groupId: string;
    groupName: string;
    systemPrompt: Prompt;
    prompts: Record<string, Prompt>;
}

/**
 * Complete collection of all available prompt groups
 * 
 * Root container for the entire prompt library organized by group IDs.
 */
export interface Prompts {
    promptGroups: Record<string, PromptGroup>;
}

/**
 * Application settings metadata
 * 
 * Provides information about the settings system including:
 * - Available authentication types
 * - Supported provider types
 * - File system locations for settings storage
 */
export interface AppSettingsMetadata {
    authTypes: string[];
    providerTypes: string[];
    settingsFolder: string;
    settingsFile: string;
}

/**
 * Base configuration for LLM inference operations
 * 
 * Defines global parameters that apply to all LLM requests:
 * - Network timeouts
 * - Retry logic
 * - Output formatting preferences
 */
export interface InferenceBaseConfig {
    timeout: number;
    maxRetries: number;
    useMarkdownForOutput: boolean;
}

/**
 * Language configuration for the application
 * 
 * Manages supported languages and default selections for:
 * - Input text language detection
 * - Output text language generation
 */
export interface LanguageConfig {
    languages: string[];
    defaultInputLanguage: string;
    defaultOutputLanguage: string;
}

/**
 * Model configuration for LLM operations
 * 
 * Defines the specific model to use and its generation parameters.
 * Temperature control is optional and can be toggled on/off.
 */
export interface ModelConfig {
    name: string;
    useTemperature: boolean;
    temperature: number;
}

/**
 * Provider configuration for LLM service integration
 * 
 * Comprehensive configuration for connecting to external LLM providers.
 * Includes endpoint URLs, authentication, and customization options.
 * 
 * Key features:
 * - Multiple authentication methods (token, environment variable)
 * - Custom headers support
 * - Custom model lists
 * - Flexible endpoint configuration
 */
export interface ProviderConfig {
    providerId: string;
    providerName: string;
    providerType: string;
    baseUrl: string;
    modelsEndpoint: string;
    completionEndpoint: string;
    authType: string;
    authToken: string;
    useAuthTokenFromEnv: boolean;
    envVarTokenName: string;
    useCustomHeaders: boolean;
    headers: Record<string, string>;
    useCustomModels: boolean;
    customModels: string[];
}

/**
 * Complete application settings object
 * 
 * Root container for all application configuration.
 * Contains all provider configs, current selections, and sub-configurations.
 * 
 * This is the single source of truth for the application state.
 */
export interface Settings {
    availableProviderConfigs: ProviderConfig[];
    currentProviderConfig: ProviderConfig;
    inferenceBaseConfig: InferenceBaseConfig;
    modelConfig: ModelConfig;
    languageConfig: LanguageConfig;
}
