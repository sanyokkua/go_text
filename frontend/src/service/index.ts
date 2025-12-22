import { IActionService, IClipboardService, ILoggerService, ISettingsService } from './adapter/interfaces';
import { ActionService, ClipboardService, LoggerService, SettingsService } from './adapter/services';

/**
 * ActionService instance - Singleton pattern for action-related operations
 * Implements IActionService interface for type safety
 */
export const ActionServiceInstance: IActionService = new ActionService();

/**
 * SettingsService instance - Singleton pattern for settings operations
 * Implements ISettingsService interface for type safety
 */
export const SettingsServiceInstance: ISettingsService = new SettingsService();

/**
 * ClipboardService instance - Singleton pattern for clipboard operations
 * Implements IClipboardService interface for type safety
 */
export const ClipboardServiceInstance: IClipboardService = new ClipboardService();

/**
 * LoggerService instance - Singleton pattern for logging operations
 * Implements ILoggerService interface for type safety
 */
export const LoggerServiceInstance: ILoggerService = new LoggerService();

/**
 * Convenience export for all service instances
 * Allows importing all services at once: import * as Services from './adapter'
 */
export {
    ActionServiceInstance as ActionService,
    ClipboardServiceInstance as ClipboardService,
    LoggerServiceInstance as LoggerService,
    SettingsServiceInstance as SettingsService,
};

/**
 * Export all interfaces for type safety
 * Allows consumers to use interfaces for dependency injection
 */
export type { IActionService, IClipboardService, ILoggerService, ISettingsService, IStateService } from './adapter/interfaces';

/**
 * Export all models for convenience
 * Allows consumers to import models from a single location
 */
export type {
    FrontAction,
    FrontActionRequest,
    FrontActions,
    FrontGroup,
    FrontLanguageConfig,
    FrontLanguageItem,
    FrontModelConfig,
    FrontProviderConfig,
    FrontSettings,
} from './adapter/models';

/**
 * Export all mapper functions for advanced use cases
 * Allows consumers to use mapping functions directly if needed
 */
export {
    fromBackendAction,
    fromBackendActionRequest,
    fromBackendActions,
    fromBackendGroup,
    fromBackendLanguageConfig,
    fromBackendModelConfig,
    fromBackendProviderConfig,
    fromBackendSettings,
    toBackendAction,
    toBackendActionRequest,
    toBackendActions,
    toBackendGroup,
    toBackendLanguageConfig,
    toBackendModelConfig,
    toBackendProviderConfig,
    toBackendSettings,
} from './adapter/mappers';

// Re-export error utilities
export { createContextualError, formatParsedError, isNetworkError, parseError } from './util/error_utils';

// Re-export helper functions
export { generateShortId } from './util/helpers';

// Re-export mapper functions
export {
    keyValuePairsToRecord,
    recordToKeyValuePairs,
    recordToSelectItems,
    selectItemsToRecord,
    stringsToKeyValuePairs,
    stringsToSelectItems,
    stringToSelectItem,
} from './util/mappers';

// Re-export validator functions
export {
    validateEndpoint,
    validateHeaderKey,
    validateHeaders,
    validateHeaderValue,
    validateModelName,
    validateProviderName,
    validateUrl,
    validateUrlWithProtocol,
} from './util/validators';
