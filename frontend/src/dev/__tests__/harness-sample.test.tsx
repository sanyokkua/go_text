import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';

function HelloWorld() {
    return (
        <main>
            <h1>GoText v3 Harness Check</h1>
        </main>
    );
}

describe('Test harness', () => {
    it('renders a component in jsdom', () => {
        render(<HelloWorld />);
        expect(screen.getByRole('heading', { name: 'GoText v3 Harness Check' })).toBeInTheDocument();
    });

    it('has no accessibility violations', async () => {
        const { container } = render(<HelloWorld />);
        const results = await axe(container);
        expect(results).toHaveNoViolations();
    });
});
