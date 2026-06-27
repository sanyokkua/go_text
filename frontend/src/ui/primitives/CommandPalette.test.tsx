// frontend/src/ui/primitives/CommandPalette.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { CommandPalette, CommandPaletteItem } from './CommandPalette';

const items: CommandPaletteItem[] = [{ value: 'act-1', label: 'Summarise', group: 'Writing' }];

describe('CommandPalette', () => {
    it('calls onSelect when an item is clicked normally', async () => {
        const onSelect = jest.fn();
        render(
            <CommandPalette
                open={true}
                onOpenChange={jest.fn()}
                items={items}
                onSelect={onSelect}
            />,
        );
        await userEvent.click(screen.getByRole('option', { name: 'Summarise' }));
        expect(onSelect).toHaveBeenCalledWith('act-1');
    });

    it('does NOT call onSelect when disabled and item is clicked', async () => {
        const onSelect = jest.fn();
        render(
            <CommandPalette
                open={true}
                onOpenChange={jest.fn()}
                items={items}
                onSelect={onSelect}
                disabled={true}
            />,
        );
        const option = screen.getByRole('option', { name: 'Summarise' });
        await userEvent.click(option);
        expect(onSelect).not.toHaveBeenCalled();
    });

    it('shows disabled indicator when disabled', () => {
        render(
            <CommandPalette
                open={true}
                onOpenChange={jest.fn()}
                items={items}
                onSelect={jest.fn()}
                disabled={true}
            />,
        );
        expect(screen.getByRole('dialog', { name: 'Command palette' })).toHaveAttribute(
            'aria-disabled',
            'true',
        );
    });
});
