import '@testing-library/jest-dom';
import { render } from '@testing-library/react';
import { StackGlyph } from '../StackGlyph';

describe('StackGlyph', () => {
    it('renders a lucide icon (svg) for a kebab-case lucide name', () => {
        const { container } = render(<StackGlyph icon="life-buoy" />);
        // Lucide icons render as <svg> — the raw name must never appear as text.
        expect(container.querySelector('svg')).toBeInTheDocument();
        expect(container.textContent).not.toContain('life-buoy');
    });

    it('renders a single-word lucide name as an icon', () => {
        const { container } = render(<StackGlyph icon="heart" />);
        expect(container.querySelector('svg')).toBeInTheDocument();
        expect(container.textContent).not.toContain('heart');
    });

    it('renders a literal emoji as text when it is not a lucide name', () => {
        const { container } = render(<StackGlyph icon="📝" />);
        expect(container.querySelector('svg')).not.toBeInTheDocument();
        expect(container.textContent).toBe('📝');
    });
});
