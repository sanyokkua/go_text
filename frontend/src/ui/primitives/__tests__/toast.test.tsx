// frontend/src/ui/primitives/__tests__/toast.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import type { ToastItem } from '../Toast';
import { ToastProvider, ToastRegion } from '../Toast';

function Wrapper({ items, onDismiss }: { readonly items: ToastItem[]; readonly onDismiss: (id: string) => void }) {
    return (
        <ToastProvider>
            <ToastRegion items={items} onDismiss={onDismiss} />
        </ToastProvider>
    );
}

describe('Toast', () => {
    it('has no accessibility violations with a success toast', async () => {
        const { container } = render(<Wrapper items={[{ id: '1', variant: 'success', message: 'Saved!' }]} onDismiss={() => {}} />);
        expect(await axe(container)).toHaveNoViolations();
    });

    it('renders the toast message', () => {
        render(<Wrapper items={[{ id: '1', message: 'Stack saved', variant: 'success' }]} onDismiss={() => {}} />);
        expect(screen.getByText('Stack saved')).toBeInTheDocument();
    });

    it('calls onDismiss when close button is clicked', async () => {
        const onDismiss = jest.fn();
        render(<Wrapper items={[{ id: 'abc', message: 'Done', variant: 'success' }]} onDismiss={onDismiss} />);
        await userEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
        expect(onDismiss).toHaveBeenCalledWith('abc');
    });

    it('renders nothing when items list is empty', () => {
        render(<Wrapper items={[]} onDismiss={() => {}} />);
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });

    it('renders title when provided', () => {
        render(
            <Wrapper items={[{ id: '1', variant: 'error', title: 'Authentication failed', message: 'Check your API key.' }]} onDismiss={() => {}} />,
        );
        expect(screen.getByText('Authentication failed')).toBeInTheDocument();
        expect(screen.getByText('Check your API key.')).toBeInTheDocument();
    });

    it('renders warning info variant without title', () => {
        render(<Wrapper items={[{ id: '2', variant: 'info', message: 'Run cancelled after step 1.' }]} onDismiss={() => {}} />);
        expect(screen.getByText('Run cancelled after step 1.')).toBeInTheDocument();
    });
});
