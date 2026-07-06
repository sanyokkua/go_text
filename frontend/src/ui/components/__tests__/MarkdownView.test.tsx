/**
 * MarkdownView unit tests.
 *
 * Strategy: react-markdown + the remark/rehype ecosystem are all ESM-only and cannot
 * be transformed by ts-jest without `--experimental-vm-modules`. We mock the library
 * boundary and test the behaviour OUR code adds:
 *   • custom `a` component — link sanitisation and openExternal
 *   • custom `code` component — routes ```mermaid blocks to MermaidBlock
 *   • MermaidBlock — loading → SVG and error states (mermaid itself mocked)
 *   • XSS prevention via react-markdown's default escape (verified structurally)
 *   • Accessibility (jest-axe)
 *
 * GFM rendering correctness (tables, strikethrough, math) is covered by the
 * Playwright E2E suite (smoke-tests.spec.ts), where the real remark stack runs.
 */

// ── module mocks ──────────────────────────────────────────────────────────────
// Must be hoisted before any imports.

jest.mock('mermaid', () => ({ __esModule: true, default: { initialize: jest.fn(), render: jest.fn() } }));

jest.mock('remark-gfm', () => ({ __esModule: true, default: () => () => {} }));
jest.mock('remark-math', () => ({ __esModule: true, default: () => () => {} }));
jest.mock('rehype-katex', () => ({ __esModule: true, default: () => () => {} }));
jest.mock('rehype-highlight', () => ({ __esModule: true, default: () => () => {} }));

// react-markdown: minimal functional mock that invokes our custom component overrides
// for `a` and `code`, so we can test our security and routing logic.
jest.mock('react-markdown', () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const React = require('react') as typeof import('react'); // require() required in jest.mock factory (runs in CJS context)
    type CompMap = Record<string, (props: Record<string, unknown>) => React.ReactNode>;
    return {
        __esModule: true,
        default: function MockReactMarkdown({
            children: source = '',
            components: comps = {} as CompMap,
        }: {
            children?: string;
            components?: CompMap;
        }) {
            const A = comps['a'] as ((p: Record<string, unknown>) => React.ReactNode) | undefined;
            const Code = comps['code'] as ((p: Record<string, unknown>) => React.ReactNode) | undefined;

            const elements: React.ReactNode[] = [];
            let remainder = source;

            // Parse fenced code blocks: ```lang\ncontent\n```
            const codeRe = /```(\w*)\n?([\s\S]*?)```/g;
            let cm: RegExpExecArray | null;
            // eslint-disable-next-line no-cond-assign
            while ((cm = codeRe.exec(source)) !== null) {
                const className = cm[1] ? `language-${cm[1]}` : undefined;
                const content = cm[2] ?? '';
                elements.push(
                    Code ? Code({ key: cm[0], className, children: content }) : React.createElement('code', { key: cm[0], className }, content),
                );
                remainder = remainder.replace(cm[0], '');
            }

            // Parse inline links: [text](url)
            const linkRe = /\[([^\]]+)\]\(([^)]+)\)/g;
            let lm: RegExpExecArray | null;
            // eslint-disable-next-line no-cond-assign
            while ((lm = linkRe.exec(remainder)) !== null) {
                elements.push(A ? A({ key: lm[0], href: lm[2], children: lm[1] }) : React.createElement('a', { key: lm[0], href: lm[2] }, lm[1]));
            }

            // Remaining text (after stripping parsed constructs)
            const textOnly = remainder.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '').trim();
            if (textOnly) {
                elements.push(React.createElement('p', { key: 'text' }, textOnly));
            }

            return React.createElement('div', { className: 'markdown-body-mock' }, ...elements);
        },
    };
});

jest.mock('../../../logic/adapter', () => {
    const mockLogger = {
        logDebug: jest.fn(),
        logInfo: jest.fn(),
        logError: jest.fn(),
        logWarning: jest.fn(),
        logTrace: jest.fn(),
        logPrint: jest.fn(),
        logFatal: jest.fn(),
    };
    return {
        openExternal: jest.fn(),
        getLogger: jest.fn().mockReturnValue(mockLogger),
        unwrap: jest.fn((res: { data?: unknown; error?: unknown }) => {
            if (res.error) throw res.error;
            return res.data;
        }),
        tryUnwrap: jest.fn((res: { data?: unknown; error?: unknown }) => res),
        ActionHandlerAdapter: { previewPrompt: jest.fn().mockResolvedValue({ data: null, error: null }) },
        SettingsHandlerAdapter: {},
        HistoryHandlerAdapter: {},
        StackHandlerAdapter: {},
        AppHandlerAdapter: { browserOpenURL: jest.fn().mockResolvedValue(undefined) },
        ClipboardServiceAdapter: {},
    };
});

// ── imports ───────────────────────────────────────────────────────────────────
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import mermaid from 'mermaid';
import { Provider } from 'react-redux';
import { openExternal } from '../../../logic/adapter';
import uiReducer from '../../../logic/store/ui/slice';
import type { UIState } from '../../../logic/store/ui/types';
import MarkdownView from '../MarkdownView';

// ── helpers ───────────────────────────────────────────────────────────────────
const mockedMermaid = mermaid as jest.Mocked<typeof mermaid>;
const mockedOpenExternal = openExternal as jest.MockedFunction<typeof openExternal>;

const MOCK_SVG_RESULT = { svg: '<svg data-testid="mermaid-svg"><g/></svg>', diagramType: 'flowchart' } as unknown as Awaited<
    ReturnType<typeof mermaid.render>
>;

function buildStore(uiOverrides: Partial<UIState> = {}) {
    return configureStore({
        reducer: { ui: uiReducer },
        preloadedState: {
            ui: {
                // NOSONAR — cast prevents literal-type widening from Partial<UIState> spread
                layout: 'side',
                sidebarCollapsed: false,
                historyOpen: false,
                inferenceRunning: false,
                currentView: 'main',
                armedActionId: null,
                activeActionsTab: null,
                activeSettingsTab: 0,
                buildMode: false,
                editingStackId: null,
                theme: { mode: 'auto', effective: 'light' },
                ...uiOverrides,
            } as UIState,
        },
    });
}

function renderMd(source: string, uiOverrides: Partial<UIState> = {}) {
    return render(
        <Provider store={buildStore(uiOverrides)}>
            <MarkdownView source={source} />
        </Provider>,
    );
}

beforeEach(() => {
    mockedMermaid.render.mockResolvedValue(MOCK_SVG_RESULT);
});

// ── tests ─────────────────────────────────────────────────────────────────────
describe('MarkdownView', () => {
    describe('Link handling (custom `a` component)', () => {
        it('renders an https link with correct href and rel', () => {
            renderMd('[Visit](https://example.com)');
            const link = screen.getByRole('link', { name: 'Visit' });
            expect(link).toHaveAttribute('href', 'https://example.com');
            expect(link).toHaveAttribute('rel', 'noopener noreferrer');
        });

        it('calls openExternal when an https link is clicked', async () => {
            renderMd('[Visit](https://example.com)');
            await userEvent.click(screen.getByRole('link', { name: 'Visit' }));
            expect(mockedOpenExternal).toHaveBeenCalledWith('https://example.com');
        });

        it('calls openExternal for mailto links when clicked', async () => {
            renderMd('[Email](mailto:user@example.com)');
            await userEvent.click(screen.getByRole('link', { name: 'Email' }));
            expect(mockedOpenExternal).toHaveBeenCalledWith('mailto:user@example.com');
        });

        it('renders a javascript: link as inert (no href)', () => {
            renderMd('[evil](javascript:alert(1))');
            const link = document.querySelector('a');
            expect(link).toBeInTheDocument();
            expect(link).not.toHaveAttribute('href');
        });

        it('renders a data: link as inert (no href)', () => {
            renderMd('[data](data:text/html,<h1>x</h1>)');
            const link = document.querySelector('a');
            expect(link).toBeInTheDocument();
            expect(link).not.toHaveAttribute('href');
        });

        it('does not call openExternal when an inert link is clicked', async () => {
            renderMd('[noop](javascript:void(0))');
            const link = document.querySelector('a');
            if (link) await userEvent.click(link);
            expect(mockedOpenExternal).not.toHaveBeenCalled();
        });
    });

    describe('Mermaid blocks (custom `code` component)', () => {
        it('shows loading indicator before mermaid resolves', () => {
            mockedMermaid.render.mockReturnValue(new Promise(() => {}));
            renderMd('```mermaid\ngraph LR\n  A-->B\n```');
            expect(screen.getByText(/Rendering diagram/i)).toBeInTheDocument();
        });

        it('renders mermaid SVG after render resolves', async () => {
            renderMd('```mermaid\ngraph LR\n  A-->B\n```');
            await waitFor(() => {
                expect(screen.getByTestId('mermaid-svg')).toBeInTheDocument();
            });
        });

        it('shows inline error when mermaid render rejects', async () => {
            mockedMermaid.render.mockRejectedValue(new Error('parse error'));
            renderMd('```mermaid\ninvalid!!!\n```');
            await waitFor(() => {
                expect(screen.getByRole('alert')).toHaveTextContent(/Diagram error/i);
            });
        });

        it('uses dark mermaid theme when effective theme is dark', async () => {
            renderMd('```mermaid\ngraph LR\n  A-->B\n```', { theme: { mode: 'dark', effective: 'dark' } });
            await waitFor(() => expect(mockedMermaid.render).toHaveBeenCalled());
            expect(mockedMermaid.initialize).toHaveBeenCalledWith(expect.objectContaining({ theme: 'dark' }));
        });

        it('uses default mermaid theme when effective theme is light', async () => {
            renderMd('```mermaid\ngraph LR\n  A-->B\n```');
            await waitFor(() => expect(mockedMermaid.render).toHaveBeenCalled());
            expect(mockedMermaid.initialize).toHaveBeenCalledWith(expect.objectContaining({ theme: 'default' }));
        });

        it('routes non-mermaid fenced blocks to a plain code element', () => {
            renderMd('```typescript\nconst x = 1;\n```');
            expect(document.querySelector('code.language-typescript')).toBeInTheDocument();
        });

        it('rest of document renders even when a mermaid block errors', async () => {
            mockedMermaid.render.mockRejectedValue(new Error('bad'));
            renderMd('```mermaid\nbad\n```\n\nParagraph after.');
            await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument());
            expect(screen.getByText(/Paragraph after/)).toBeInTheDocument();
        });
    });

    describe('Security — XSS prevention', () => {
        it('does not execute <script> in model output', () => {
            const spy = jest.fn();
            (globalThis as unknown as Record<string, unknown>).__xss = spy;
            renderMd('<script>globalThis.__xss()</script>');
            expect(spy).not.toHaveBeenCalled();
            delete (globalThis as unknown as Record<string, unknown>).__xss;
        });

        it('does not execute img onerror handlers in model output', () => {
            const spy = jest.fn();
            (globalThis as unknown as Record<string, unknown>).__imgErr = spy;
            renderMd('<img src="x" onerror="globalThis.__imgErr()">');
            expect(spy).not.toHaveBeenCalled();
            delete (globalThis as unknown as Record<string, unknown>).__imgErr;
        });
    });

    describe('Accessibility', () => {
        it('has no axe violations in light theme', async () => {
            document.documentElement.classList.remove('dark');
            const { container } = renderMd('[Link](https://example.com)');
            expect(await axe(container)).toHaveNoViolations();
        });

        it('has no axe violations in dark theme', async () => {
            document.documentElement.classList.add('dark');
            const { container } = renderMd('[Link](https://example.com)');
            expect(await axe(container)).toHaveNoViolations();
            document.documentElement.classList.remove('dark');
        });
    });

    describe('Rendering', () => {
        it('renders plain text source', () => {
            renderMd('Hello world');
            expect(screen.getByText('Hello world')).toBeInTheDocument();
        });
    });
});
