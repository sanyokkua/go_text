import { AppActionApi } from './app_action_api';
import { IActionApi, IClipboardUtils, ISettingsApi, IUiStateApi } from './app_backend_api';
import { AppClipboardUtils } from './app_clipboard_utils';
import { AppSettingsApi } from './app_settings_api';
import { AppUiStateApi } from './app_ui_state_api';

export const ActionApi: IActionApi = new AppActionApi();
export const SettingsApi: ISettingsApi = new AppSettingsApi();
export const UiStateApi: IUiStateApi = new AppUiStateApi();
export const ClipboardUtils: IClipboardUtils = new AppClipboardUtils();
