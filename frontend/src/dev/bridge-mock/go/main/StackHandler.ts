import { AnyResult, VoidResult, ok, voidOk } from '../../types';

const mockStack = {
    id: 'mock-stack-1',
    name: 'Mock Stack',
    icon: '📝',
    steps: ['mock-summarise', 'mock-translate'],
    defaultFormat: 'text',
    defaultInLang: 'auto',
    defaultOutLang: 'auto',
    createdAt: 1700000000,
    updatedAt: 1700000000,
};

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

const mockSuggestedStacks = [
    { name: 'Bug report', icon: '🐛', actionIds: ['mock-proofread', 'mock-summarise'], actionNames: ['Basic proofreading', 'Summary'] },
    { name: 'Polite request', icon: '🙏', actionIds: ['mock-tone', 'mock-proofread'], actionNames: ['Friendly tone', 'Basic proofreading'] },
    { name: 'Standup update', icon: '📋', actionIds: ['mock-summarise'], actionNames: ['Key points'] },
];

export function SuggestedStacks(): Promise<AnyResult> {
    return Promise.resolve(ok(mockSuggestedStacks));
}
