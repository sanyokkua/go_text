// Minimal envelope types for T00 — superseded by full typed contracts in T02
export interface WireError {
    code: string;
    message: string;
    requestId?: string;
}

export interface VoidResult {
    error?: WireError;
}

export interface StringResult {
    data?: string;
    error?: WireError;
}

export interface AnyResult<T = unknown> {
    data?: T;
    error?: WireError;
}

export const ok = <T>(data: T): AnyResult<T> => ({ data });
export const voidOk = (): VoidResult => ({});
export const fail = (code: string, message: string): AnyResult<never> => ({
    error: { code, message },
});
