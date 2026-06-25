import { StringResult, VoidResult, ok, voidOk } from '../../types';

export function LogError(_message: string): Promise<VoidResult> {
    return Promise.resolve(voidOk());
}

export function ClipboardGetText(): Promise<StringResult> {
    return Promise.resolve(ok(''));
}

export function ClipboardSetText(_text: string): Promise<VoidResult> {
    return Promise.resolve(voidOk());
}

export function BrowserOpenURL(_url: string): Promise<VoidResult> {
    return Promise.resolve(voidOk());
}
