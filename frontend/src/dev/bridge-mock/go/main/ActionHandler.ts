import { AnyResult, VoidResult, ok, voidOk } from '../../types';
import { appendMockHistoryEntry } from './HistoryHandler';

function mockParam(name: string): boolean {
    if (globalThis.window === undefined) return false;
    try {
        return new URL(globalThis.window.location.href).searchParams.has(name);
    } catch {
        return false;
    }
}

let completedRunCount = 0;

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
    if (mockParam('history-test')) {
        completedRunCount += 1;
        appendMockHistoryEntry({
            id: `e2e-run-${completedRunCount}`,
            createdAt: 1_700_000_100 + completedRunCount,
            kind: 'single',
            title: 'E2E completed run',
            inputText: 'Trigger a run for T58',
            outputText: 'Mock output text.',
            applied: [{ id: 'mock-summarise', name: 'Summarise', category: 'Writing' }],
            providerName: 'Local',
            model: 'llama',
            inputLang: 'en',
            outputLang: 'en',
            format: 'plain',
            durationMs: 500,
            inferences: 1,
            status: 'success',
            errorCode: '',
            failedIndex: -1,
        });
    }
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

// DraftProviderConfig mirrors the wire settings.ProviderConfig the adapter now
// passes — the mock honours the draft so pre-save verification can be exercised.
interface DraftProviderConfig {
    selectedModel?: string;
    baseUrl?: string;
    [key: string]: unknown;
}

export function TestConnection(_cfg: DraftProviderConfig): Promise<AnyResult> {
    return Promise.resolve(ok({ check: 'connection', ok: true, durationMs: 12 }));
}

export function TestModels(_cfg: DraftProviderConfig): Promise<AnyResult> {
    return Promise.resolve(ok({ check: 'models', ok: true, durationMs: 18, modelCount: 1, sample: 'mock-model' }));
}

export function TestInference(cfg: DraftProviderConfig): Promise<AnyResult> {
    // Mirror the backend contract: an empty selected model is a validation error,
    // even pre-save. A non-empty model returns a successful round-trip.
    if (!cfg || !cfg.selectedModel) {
        return Promise.resolve({
            data: null,
            error: { code: 'validation', message: 'selectedModel a non-empty model name; got .' },
        } as AnyResult);
    }
    return Promise.resolve(ok({ check: 'inference', ok: true, durationMs: 240, sample: 'Hello! …' }));
}

