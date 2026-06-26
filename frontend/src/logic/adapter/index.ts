import {
    IActionHandler, IClipboardService, IHistoryHandler,
    ILoggerService, ISettingsHandler, IStackHandler,
} from './interfaces';
import {
    ActionHandler, ClipboardService, HistoryHandler,
    LoggerService, SettingsHandler, StackHandler,
} from './services';

export * from './envelope';
export * from './interfaces';
export * from './mappers';
export * from './models';

export const ActionHandlerAdapter: IActionHandler = new ActionHandler(LoggerService.getLogger('ActionHandler'));
export const SettingsHandlerAdapter: ISettingsHandler = new SettingsHandler(LoggerService.getLogger('SettingsHandler'));
export const HistoryHandlerAdapter: IHistoryHandler = new HistoryHandler(LoggerService.getLogger('HistoryHandler'));
export const StackHandlerAdapter: IStackHandler = new StackHandler(LoggerService.getLogger('StackHandler'));
export const ClipboardServiceAdapter: IClipboardService = new ClipboardService(LoggerService.getLogger('ClipboardService'));
export const getLogger = (serviceName?: string): ILoggerService => LoggerService.getLogger(serviceName);
