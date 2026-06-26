// frontend/src/ui/primitives/__tests__/utilities.test.tsx
import { render, screen } from '@testing-library/react';
import { axe } from 'jest-axe';
import { ScrollArea } from '../ScrollArea';
import { Tooltip, TooltipProvider } from '../Tooltip';

describe('Tooltip', () => {
    it('has no accessibility violations', async () => {
        const { container } = render(
            <TooltipProvider>
                <Tooltip content="Copy to clipboard">
                    <button type="button" aria-label="Copy">📋</button>
                </Tooltip>
            </TooltipProvider>,
        );
        expect(await axe(container)).toHaveNoViolations();
    });

    it('renders the trigger child', () => {
        render(
            <TooltipProvider>
                <Tooltip content="Copy">
                    <button type="button" aria-label="Copy">📋</button>
                </Tooltip>
            </TooltipProvider>,
        );
        expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
    });
});

describe('ScrollArea', () => {
    it('has no accessibility violations', async () => {
        const { container } = render(
            <ScrollArea style={{ height: 200 }}>
                <p>Scrollable content</p>
            </ScrollArea>,
        );
        expect(await axe(container)).toHaveNoViolations();
    });

    it('renders children', () => {
        render(
            <ScrollArea>
                <p>Content inside scroll area</p>
            </ScrollArea>,
        );
        expect(screen.getByText('Content inside scroll area')).toBeInTheDocument();
    });
});
