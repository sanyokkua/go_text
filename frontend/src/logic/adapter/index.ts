import { IActionHandler, IClipboardService, ILoggerService, ISettingsHandler } from './interfaces';
import { ActionHandler, ClipboardService, LoggerService, SettingsHandler } from './services';

export * from './interfaces';
export * from './models';

export const ActionHandlerAdapter: IActionHandler = new ActionHandler(LoggerService.getLogger('ActionHandler'));
export const SettingsHandlerAdapter: ISettingsHandler = new SettingsHandler(LoggerService.getLogger('SettingsHandler'));
export const ClipboardServiceAdapter: IClipboardService = new ClipboardService(LoggerService.getLogger('ClipboardService'));
export const getLogger = (serviceName?: string): ILoggerService => {
    return LoggerService.getLogger(serviceName);
};
