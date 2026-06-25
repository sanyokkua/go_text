import { AnyResult, VoidResult, ok, voidOk } from '../../types';

export function ListHistory(_limit: number, _offset: number): Promise<AnyResult> {
    return Promise.resolve(ok({ entries: [], total: 0 }));
}

export function GetHistoryEntry(_id: string): Promise<AnyResult> {
    return Promise.resolve(ok({ id: _id, inputText: '', outputText: '', timestamp: 0 }));
}

export function DeleteHistoryEntry(_id: string): Promise<VoidResult> { return Promise.resolve(voidOk()); }
export function ClearHistory(): Promise<VoidResult> { return Promise.resolve(voidOk()); }
