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

    // These three names were renamed in newer lucide-react releases; without an alias map
    // they fall through to the raw-text fallback and leak a kebab name into the UI.
    it.each(['alert-triangle', 'bar-chart', 'help-circle'])('renders an svg icon for renamed lucide name "%s"', (name) => {
        const { container } = render(<StackGlyph icon={name} />);
        expect(container.querySelector('svg')).toBeInTheDocument();
        expect(container.textContent).not.toContain(name);
    });

    it('renders a literal emoji as text when it is not a lucide name', () => {
        const { container } = render(<StackGlyph icon="📝" />);
        expect(container.querySelector('svg')).not.toBeInTheDocument();
        expect(container.textContent).toBe('📝');
    });
});
