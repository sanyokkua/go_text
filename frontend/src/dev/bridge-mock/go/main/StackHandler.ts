import { AnyResult, VoidResult, ok, voidOk } from '../../types';

const mockStack = { id: 'mock-stack-1', name: 'Mock Stack', actions: [] };

export function ListStacks(): Promise<AnyResult> {
    return Promise.resolve(ok([mockStack]));
}
export function GetStack(_id: string): Promise<AnyResult> {
    return Promise.resolve(ok(mockStack));
}
export function CreateStack(_s: unknown): Promise<AnyResult> {
    return Promise.resolve(ok({ ...mockStack, id: 'mock-stack-new' }));
}
export function UpdateStack(_s: unknown): Promise<AnyResult> {
    return Promise.resolve(ok(mockStack));
}
export function DeleteStack(_id: string): Promise<VoidResult> {
    return Promise.resolve(voidOk());
}
export function DuplicateStack(_id: string, _newName: string): Promise<AnyResult> {
    return Promise.resolve(ok({ ...mockStack, id: 'mock-stack-dup', name: _newName }));
}
