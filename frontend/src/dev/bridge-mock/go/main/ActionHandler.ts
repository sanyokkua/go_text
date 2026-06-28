import { AnyResult, VoidResult, ok, voidOk } from '../../types';

function mockParam(name: string): boolean {
    if (globalThis.window === undefined) return false;
    try {
        return new URL(globalThis.window.location.href).searchParams.has(name);
    } catch {
        return false;
    }
}

const XSS_PAYLOAD = '<script>window.__xssFired = true;</script> Safe text\n\n' + '[evil link](javascript:alert(1))\n\nSafe paragraph.';

const MARKDOWN_PAYLOAD = `# Output

| Fruit  | Count |
| ------ | ----- |
| Apple  | 3     |
| Pear   | 7     |

\`\`\`js
console.log("hello");
\`\`\`

\`\`\`mermaid
graph TD
  A-->B
\`\`\`
`;

export function ProcessPromptChain(_req: unknown): Promise<AnyResult> {
    if (mockParam('xss')) return Promise.resolve(ok({ steps: [], finalText: XSS_PAYLOAD }));
    if (mockParam('markdown')) return Promise.resolve(ok({ steps: [], finalText: MARKDOWN_PAYLOAD }));
    return Promise.resolve(ok({ steps: [], finalText: 'Mock output text.' }));
}

export function CancelChain(_runId: string): Promise<VoidResult> {
    return Promise.resolve(voidOk());
}

export function CancelAllRuns(): Promise<void> {
    return Promise.resolve();
}

export function GetActionCatalog(): Promise<AnyResult> {
    return Promise.resolve(
        ok([
            {
                id: 'mock-summarise',
                name: 'Summarise',
                category: 'Writing',
                family: 'single',
                directive: 'Summarise the text.',
                orderRank: 0,
                exclusivityGroup: '',
                mergeable: false,
                terminal: true,
                requires: [],
            },
            {
                id: 'mock-translate',
                name: 'Translate',
                category: 'Language',
                family: 'single',
                directive: 'Translate the text.',
                orderRank: 1,
                exclusivityGroup: '',
                mergeable: false,
                terminal: true,
                requires: [],
            },
        ]),
    );
}

export function GetModels(_providerId: string): Promise<AnyResult> {
    return Promise.resolve(ok([]));
}

export function PreviewPrompt(_req: unknown): Promise<AnyResult> {
    return Promise.resolve(
        ok({
            kind: 'single',
            inferences: 1,
            groups: [
                {
                    index: 0,
                    family: 'single',
                    appliedActions: [{ id: 'mock-summarise', name: 'Summarise', category: 'Writing' }],
                    systemPrompt: 'You are a helpful assistant that summarises text.',
                    userPrompt: 'Summarise the following:\n\n{{user_text}}',
                    parameters: { model: 'mock-model', format: 'text', tokenParam: 'max_tokens', stream: false },
                },
            ],
            summary: 'Summarise action preview',
        }),
    );
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

