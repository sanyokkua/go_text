import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { apperr } from '../../../../../../wailsjs/go/models';
import HistoryEntryCard from '../HistoryEntryCard';

function makeEntry(overrides: Partial<apperr.HistoryEntry> = {}): apperr.HistoryEntry {
    return {
        id: 'entry-1',
        createdAt: Math.floor(Date.now() / 1000) - 60,
        kind: 'single',
        title: 'Proofread',
        inputText: 'Hello world',
        outputText: 'Hello, world!',
        applied: [],
        providerName: 'Local',
        model: 'llama',
        inputLang: 'en',
        outputLang: 'en',
        format: 'plain',
        durationMs: 1200,
        inferences: 1,
        status: 'success',
        errorCode: '',
        failedIndex: -1,
        ...overrides,
    } as apperr.HistoryEntry;
}

describe('HistoryEntryCard', () => {
    it('renders the inference-count badge, status, relative time and both action controls', () => {
        render(
            <HistoryEntryCard
                entry={makeEntry({ inferences: 2, status: 'success' })}
                isSelected={false}
                onRestore={jest.fn()}
                onDelete={jest.fn()}
            />,
        );

        expect(screen.getByText('2 INF')).toBeInTheDocument();
        expect(screen.getByText('success')).toBeInTheDocument();
        expect(screen.getByText('1m ago')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /restore entry proofread/i })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /delete entry proofread/i })).toBeInTheDocument();
    });

    it('renders a long input/output preview in full as a single wrapping paragraph', () => {
        const longInput = 'we shipped the new caching layer this week and there were quite a few invalidation issues that we needed to address';
        const longOutput = 'We shipped the new caching layer this week and a number of invalidation issues came up but they are all handled now';
        render(
            <HistoryEntryCard
                entry={makeEntry({ inputText: longInput, outputText: longOutput })}
                isSelected={false}
                onRestore={jest.fn()}
                onDelete={jest.fn()}
            />,
        );

        // The preview text renders in full (visual clamping is handled by CSS, asserted separately).
        const preview = screen.getByText((_content, el) => el?.tagName === 'P' && (el.textContent?.includes('→') ?? false));
        expect(preview.textContent).toContain('we shipped the new caching');
    });

    it('triggers the restore and delete callbacks without selecting the card', async () => {
        const onRestore = jest.fn();
        const onDelete = jest.fn();
        render(<HistoryEntryCard entry={makeEntry()} isSelected={false} onRestore={onRestore} onDelete={onDelete} />);

        await userEvent.click(screen.getByRole('button', { name: /restore entry proofread/i }));
        await userEvent.click(screen.getByRole('button', { name: /delete entry proofread/i }));

        expect(onRestore).toHaveBeenCalledTimes(1);
        expect(onDelete).toHaveBeenCalledTimes(1);
    });

    // CSS contract guard: jsdom does not apply CSS Modules, so we read the source to ensure
    // the overflow regression (white-space: nowrap on the preview) cannot be reintroduced.
    it('preview CSS uses a line-clamp and never white-space: nowrap', () => {
        const css = readFileSync(join(__dirname, '..', 'HistoryEntryCard.module.css'), 'utf8');
        const previewBlock = css.slice(css.indexOf('.preview {'), css.indexOf('}', css.indexOf('.preview {')));

        expect(previewBlock).toContain('-webkit-line-clamp: 2');
        expect(previewBlock).toContain('word-break: break-word');
        expect(previewBlock).not.toContain('white-space: nowrap');
    });
});
