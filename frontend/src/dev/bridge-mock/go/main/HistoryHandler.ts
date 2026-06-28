import { AnyResult, VoidResult, ok, voidOk } from '../../types';

const MOCK_E3_ENTRY = {
    id: 'e3-entry-1',
    createdAt: 1_700_000_000,
    kind: 'single',
    title: 'E3 Proofread run',
    inputText: 'E3 input text',
    outputText: 'E3 output text',
    applied: [{ id: 'proofread', name: 'Proofread', category: 'Writing' }],
    providerName: 'Local',
    model: 'llama',
    inputLang: 'en',
    outputLang: 'en',
    format: 'plain',
    durationMs: 800,
    inferences: 1,
    status: 'success',
    errorCode: '',
    failedIndex: -1,
};

function mockParam(name: string): boolean {
    if (globalThis.window === undefined) return false;
    try {
        return new URL(globalThis.window.location.href).searchParams.has(name);
    } catch {
        return false;
    }
}

// Wire format: HistoryListResult.data = HistoryEntry[].
// Returns ok(array) — never ok({ entries, total }).
// unwrap() extracts .data; the thunk stores that as state.history.entries.
// Returning an object instead of an array makes entries.map() throw a TypeError.
export function ListHistory(_page: number, _pageSize: number): Promise<AnyResult> {
    if (mockParam('history-test')) return Promise.resolve(ok([MOCK_E3_ENTRY]));
    return Promise.resolve(ok([]));
}

export function GetHistoryEntry(_id: string): Promise<AnyResult> {
    if (mockParam('history-test')) return Promise.resolve(ok(MOCK_E3_ENTRY));
    return Promise.resolve(ok(null));
}

export function DeleteHistoryEntry(_id: string): Promise<VoidResult> {
    return Promise.resolve(voidOk());
}
export function ClearHistory(): Promise<VoidResult> {
    return Promise.resolve(voidOk());
}
