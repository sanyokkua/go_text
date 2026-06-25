import { AnyResult, VoidResult, ok, voidOk } from '../../types';

export function ProcessPromptChain(_req: unknown): Promise<AnyResult> {
    return Promise.resolve(ok({ steps: [], finalText: '' }));
}

export function CancelChain(_runId: string): Promise<VoidResult> {
    return Promise.resolve(voidOk());
}

export function GetActionCatalog(): Promise<AnyResult> {
    return Promise.resolve(ok({ groups: [] }));
}

export function GetModels(_providerId: string): Promise<AnyResult> {
    return Promise.resolve(ok({ models: [] }));
}

export function PreviewPrompt(_req: unknown): Promise<AnyResult> {
    return Promise.resolve(ok({ system: '(mock system prompt)', user: '(mock user prompt)' }));
}

export function TestConnection(_providerId: string): Promise<AnyResult> {
    return Promise.resolve(ok({ ok: true, latencyMs: 0 }));
}

export function TestModels(_providerId: string): Promise<AnyResult> {
    return Promise.resolve(ok({ ok: true, models: ['mock-model'] }));
}

export function TestInference(_providerId: string): Promise<AnyResult> {
    return Promise.resolve(ok({ ok: true, responseText: 'mock inference response' }));
}
