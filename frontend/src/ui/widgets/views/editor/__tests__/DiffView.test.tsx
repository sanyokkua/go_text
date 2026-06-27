import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import DiffView from '../../../../components/DiffView';

jest.mock('../../../../../logic/adapter', () => ({
    ClipboardServiceAdapter: { setText: jest.fn().mockResolvedValue(true) },
    getLogger: () => ({ logInfo: jest.fn(), logDebug: jest.fn(), logError: jest.fn() }),
}));

describe('DiffView', () => {
    it('renders added words with ins class and removed words with del class', () => {
        render(<DiffView original="hello world" modified="hello earth" />);
        const deleted = document.querySelector('.del');
        const inserted = document.querySelector('.ins');
        expect(deleted).toBeInTheDocument();
        expect(inserted).toBeInTheDocument();
        expect(deleted?.textContent).toContain('world');
        expect(inserted?.textContent).toContain('earth');
    });

    it('shows +N added and −N removed counts', () => {
        render(<DiffView original="hello world" modified="hello earth" />);
        expect(screen.getByText(/\+1 added/i)).toBeInTheDocument();
        expect(screen.getByText(/−1 removed/i)).toBeInTheDocument();
    });

    it('shows zero counts when content is identical', () => {
        render(<DiffView original="same text" modified="same text" />);
        expect(screen.getByText(/\+0 added/i)).toBeInTheDocument();
        expect(screen.getByText(/−0 removed/i)).toBeInTheDocument();
    });

    it('Copy clean button copies modified text to clipboard', async () => {
        const { ClipboardServiceAdapter } = await import('../../../../../logic/adapter');
        render(<DiffView original="hello world" modified="hello earth" />);
        await userEvent.click(screen.getByRole('button', { name: /copy clean/i }));
        expect(ClipboardServiceAdapter.setText).toHaveBeenCalledWith('hello earth');
    });
});
