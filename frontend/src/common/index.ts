import { AppActionApi } from './action_api';
import { IActionApi, IClipboardUtils, ISettingsApi, IUiStateApi } from './backend_api';
import { AppClipboardUtils } from './clipboard_utils';
import { AppSettingsApi } from './settings_api';
import { AppUiStateApi } from './state_api';

export const ActionApi: IActionApi = new AppActionApi();
export const SettingsApi: ISettingsApi = new AppSettingsApi();
export const UiStateApi: IUiStateApi = new AppUiStateApi();
export const ClipboardUtils: IClipboardUtils = new AppClipboardUtils();
