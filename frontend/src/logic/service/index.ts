import { IActionService, IClipboardService, ILoggerService, ISettingsService } from './adapter/interfaces';
import { ActionService, ClipboardService, LoggerService, SettingsService } from './adapter/services';

/**
 * LoggerService instance - Singleton pattern for logging operations
 * Implements ILoggerService interface for type safety
 */
export const LoggerServiceInstance: ILoggerService = new LoggerService();


/**
 * ActionService instance - Singleton pattern for action-related operations
 * Implements IActionService interface for type safety
 */
export const ActionServiceInstance: IActionService = new ActionService(LoggerServiceInstance);

/**
 * SettingsService instance - Singleton pattern for settings operations
 * Implements ISettingsService interface for type safety
 */
export const SettingsServiceInstance: ISettingsService = new SettingsService(LoggerServiceInstance);

/**
 * ClipboardService instance - Singleton pattern for clipboard operations
 * Implements IClipboardService interface for type safety
 */
export const ClipboardServiceInstance: IClipboardService = new ClipboardService(LoggerServiceInstance);


/**
 * Convenience export for all service instances
 * Allows importing all services at once: import * as Services from './adapter'
 */
export {
    ActionServiceInstance as ActionService,
    ClipboardServiceInstance as ClipboardService
};

/**
 * Export all interfaces for type safety
 * Allows consumers to use interfaces for dependency injection
 */
export type { IActionService, IClipboardService, ILoggerService, ISettingsService } from './adapter/interfaces';

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
 * Export mapper functions for advanced use cases (only used internally)
 */
export {
    fromBackendAction,
    fromBackendActions,
    fromBackendGroup,
    fromBackendLanguageConfig,
    fromBackendModelConfig,
    fromBackendProviderConfig,
    fromBackendSettings,
    toBackendActionRequest,
    toBackendLanguageConfig,
    toBackendModelConfig,
    toBackendProviderConfig,
    toBackendSettings,
} from './adapter/mappers';

// Re-export error utilities (only parseError is actively used)
export { parseError } from './util/error_utils';

// Re-export mapper functions
export {
    keyValuePairsToRecord,
    recordToKeyValuePairs,
    stringsToSelectItems,
    stringToSelectItem,
} from './util/mappers';

// Re-export validator functions
export {
    validateEndpoint,
    validateModelName,
    validateProviderName,
    validateUrl,
} from './util/validators';
