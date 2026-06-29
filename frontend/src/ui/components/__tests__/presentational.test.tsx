// frontend/src/ui/components/__tests__/presentational.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { Badge } from '../Badge';
import { Button } from '../Button';
import { Card } from '../Card';
import { Chip } from '../Chip';
import { IconButton } from '../IconButton';

describe('Button', () => {
    it('has no accessibility violations', async () => {
        const { container } = render(<Button onClick={() => {}}>Save</Button>);
        expect(await axe(container)).toHaveNoViolations();
    });

    it('calls onClick when clicked', async () => {
        const onClick = jest.fn();
        render(<Button onClick={onClick}>Click me</Button>);
        await userEvent.click(screen.getByRole('button', { name: 'Click me' }));
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('does not fire onClick when disabled', async () => {
        const onClick = jest.fn();
        render(
            <Button disabled onClick={onClick}>
                Disabled
            </Button>,
        );
        await userEvent.click(screen.getByRole('button', { name: 'Disabled' }));
        expect(onClick).not.toHaveBeenCalled();
    });
});

describe('IconButton', () => {
    it('has no accessibility violations', async () => {
        const { container } = render(<IconButton aria-label="Settings">⚙</IconButton>);
        expect(await axe(container)).toHaveNoViolations();
    });

    it('exposes aria-pressed=true when on', () => {
        render(
            <IconButton aria-label="Sidebar" on>
                ☰
            </IconButton>,
        );
        expect(screen.getByRole('button', { name: 'Sidebar' })).toHaveAttribute('aria-pressed', 'true');
    });

    it('exposes aria-pressed=false when explicitly off', () => {
        render(
            <IconButton aria-label="Sidebar" on={false}>
                ☰
            </IconButton>,
        );
        expect(screen.getByRole('button', { name: 'Sidebar' })).toHaveAttribute('aria-pressed', 'false');
    });

    it('omits aria-pressed for non-toggle action buttons', () => {
        render(<IconButton aria-label="Settings">⚙</IconButton>);
        expect(screen.getByRole('button', { name: 'Settings' })).not.toHaveAttribute('aria-pressed');
    });
});

describe('Chip', () => {
    it('has no accessibility violations (no remove)', async () => {
        const { container } = render(<Chip>Tag</Chip>);
        expect(await axe(container)).toHaveNoViolations();
    });

    it('calls onRemove when remove button is clicked', async () => {
        const onRemove = jest.fn();
        render(<Chip onRemove={onRemove}>Removable</Chip>);
        await userEvent.click(screen.getByRole('button', { name: 'Remove' }));
        expect(onRemove).toHaveBeenCalledTimes(1);
    });

    it('does not render remove button when onRemove is absent', () => {
        render(<Chip>Static</Chip>);
        expect(screen.queryByRole('button', { name: 'Remove' })).not.toBeInTheDocument();
    });
});

describe('Badge', () => {
    it('has no accessibility violations', async () => {
        const { container } = render(<Badge>v3.0.0</Badge>);
        expect(await axe(container)).toHaveNoViolations();
    });
});

describe('Card', () => {
    it('has no accessibility violations', async () => {
        const { container } = render(<Card>Content</Card>);
        expect(await axe(container)).toHaveNoViolations();
    });

    it('renders children', () => {
        render(
            <Card>
                <p>Hello</p>
            </Card>,
        );
        expect(screen.getByText('Hello')).toBeInTheDocument();
    });
});
