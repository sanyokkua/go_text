import { ClipboardGetText, ClipboardSetText, LogDebug } from '../../wailsjs/runtime';
import { IClipboardUtils } from './backend_api';

export class AppClipboardUtils implements IClipboardUtils {
    async clipboardGetText(): Promise<string> {
        try {
            return await ClipboardGetText();
        } catch (error) {
            LogDebug(`Clipboard getText failed`);
            throw error;
        }
    }

    async clipboardSetText(text: string): Promise<boolean> {
        try {
            return await ClipboardSetText(text);
        } catch (error) {
            LogDebug(`Clipboard getText failed`);
            throw error;
        }
    }
}
