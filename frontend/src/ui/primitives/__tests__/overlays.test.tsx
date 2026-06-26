// frontend/src/ui/primitives/__tests__/overlays.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { AlertDialog } from '../AlertDialog';
import { Dialog } from '../Dialog';
import { DropdownMenu } from '../DropdownMenu';

describe('DropdownMenu', () => {
    it('has no accessibility violations when closed', async () => {
        const { container } = render(
            <DropdownMenu
                trigger={<button type="button">⋮</button>}
                items={[
                    { label: 'Run' },
                    { type: 'separator' },
                    { label: 'Delete', variant: 'danger' },
                ]}
            />,
        );
        expect(await axe(container)).toHaveNoViolations();
    });

    it('calls item onClick when item is selected', async () => {
        const onRun = jest.fn();
        render(
            <DropdownMenu
                trigger={<button type="button">⋮</button>}
                items={[{ label: 'Run', onClick: onRun }]}
            />,
        );
        await userEvent.click(screen.getByRole('button', { name: '⋮' }));
        await userEvent.click(screen.getByRole('menuitem', { name: 'Run' }));
        expect(onRun).toHaveBeenCalledTimes(1);
    });
});

describe('Dialog', () => {
    it('has no accessibility violations when open', async () => {
        const { container } = render(
            <Dialog open title="Save Stack" onOpenChange={() => {}}>
                <p>Dialog content</p>
            </Dialog>,
        );
        expect(await axe(container)).toHaveNoViolations();
    });

    it('renders title and children when open', () => {
        render(
            <Dialog open title="Save Stack" onOpenChange={() => {}}>
                <p>Dialog content</p>
            </Dialog>,
        );
        expect(screen.getByRole('dialog', { name: 'Save Stack' })).toBeInTheDocument();
        expect(screen.getByText('Dialog content')).toBeInTheDocument();
    });

    it('calls onOpenChange when Escape is pressed', async () => {
        const onChange = jest.fn();
        render(
            <Dialog open title="Test" onOpenChange={onChange}>
                <p>Content</p>
            </Dialog>,
        );
        await userEvent.keyboard('{Escape}');
        expect(onChange).toHaveBeenCalledWith(false);
    });
});

describe('AlertDialog', () => {
    it('has no accessibility violations when open', async () => {
        const { container } = render(
            <AlertDialog
                open
                title="⚠ Factory reset?"
                description="This wipes all data."
                confirmLabel="Reset everything"
                onConfirm={() => {}}
                onOpenChange={() => {}}
                variant="danger"
            />,
        );
        expect(await axe(container)).toHaveNoViolations();
    });

    it('calls onConfirm when confirm button is clicked', async () => {
        const onConfirm = jest.fn();
        render(
            <AlertDialog
                open
                title="Delete?"
                description="This is permanent."
                confirmLabel="Delete"
                onConfirm={onConfirm}
                onOpenChange={() => {}}
            />,
        );
        await userEvent.click(screen.getByRole('button', { name: 'Delete' }));
        expect(onConfirm).toHaveBeenCalledTimes(1);
    });

    it('does not call onConfirm when Cancel is clicked', async () => {
        const onConfirm = jest.fn();
        const onChange = jest.fn();
        render(
            <AlertDialog
                open
                title="Delete?"
                description="This is permanent."
                confirmLabel="Delete"
                onConfirm={onConfirm}
                onOpenChange={onChange}
            />,
        );
        await userEvent.click(screen.getByRole('button', { name: 'Cancel' }));
        expect(onConfirm).not.toHaveBeenCalled();
        expect(onChange).toHaveBeenCalledWith(false);
    });
});
