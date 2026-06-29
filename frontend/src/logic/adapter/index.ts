import { apperr } from '../../../wailsjs/go/models';
import { unwrap } from './envelope';
import { IActionHandler, IAppHandler, IClipboardService, IHistoryHandler, ILoggerService, ISettingsHandler, IStackHandler } from './interfaces';
import { ActionHandler, AppHandler, ClipboardService, HistoryHandler, LoggerService, SettingsHandler, StackHandler } from './services';

export * from './envelope';
export * from './interfaces';
export * from './mappers';
export * from './models';

export const ActionHandlerAdapter: IActionHandler = new ActionHandler(LoggerService.getLogger('ActionHandler'));
export const SettingsHandlerAdapter: ISettingsHandler = new SettingsHandler(LoggerService.getLogger('SettingsHandler'));
export const HistoryHandlerAdapter: IHistoryHandler = new HistoryHandler(LoggerService.getLogger('HistoryHandler'));
export const StackHandlerAdapter: IStackHandler = new StackHandler(LoggerService.getLogger('StackHandler'));
export const AppHandlerAdapter: IAppHandler = new AppHandler(LoggerService.getLogger('AppHandler'));
export const ClipboardServiceAdapter: IClipboardService = new ClipboardService(LoggerService.getLogger('ClipboardService'), AppHandlerAdapter);
export const getLogger = (serviceName?: string): ILoggerService => LoggerService.getLogger(serviceName);

export function openExternal(url: string): void {
    AppHandlerAdapter.browserOpenURL(url).catch(() => {});
}

/**
 * Opens a folder/file path in the OS file manager.
 *
 * Rejects with the WireError on failure so callers can surface a specific toast.
 * Unlike most adapter calls this bypasses the auto-toasting `unwrap` helper:
 * an OpenPath failure maps to a generic CodeInternal, so the caller's own toast
 * ("Couldn't open logs folder") is more useful than the generic fallback.
 */
export async function openPath(path: string): Promise<void> {
    const result = await AppHandlerAdapter.openPath(path);
    if (result.error) {
        throw result.error;
    }
}

export async function getProviderPresets(): Promise<apperr.ProviderPreset[]> {
    return unwrap(await SettingsHandlerAdapter.providerPresets()) ?? [];
}

export async function getSuggestedStacks(): Promise<apperr.SuggestedStack[]> {
    return unwrap(await StackHandlerAdapter.suggestedStacks()) ?? [];
}
