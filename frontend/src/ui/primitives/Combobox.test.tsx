// frontend/src/ui/primitives/Combobox.test.tsx
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Combobox, ComboboxItem } from './Combobox';

const ITEMS: ComboboxItem[] = [
    { value: 'llama3', label: 'llama3' },
    { value: 'qwen3:0.6b', label: 'qwen3:0.6b' },
];

describe('Combobox', () => {
    it('shows every item once opened', async () => {
        render(<Combobox items={ITEMS} value="llama3" onValueChange={jest.fn()} keyLabel="Model" />);

        await userEvent.click(screen.getByRole('button', { name: 'Model' }));

        expect(await screen.findByRole('option', { name: 'llama3' })).toBeInTheDocument();
        expect(screen.getByRole('option', { name: 'qwen3:0.6b' })).toBeInTheDocument();
    });

    it('narrows the options to those matching typed search text', async () => {
        render(<Combobox items={ITEMS} value="llama3" onValueChange={jest.fn()} keyLabel="Model" />);

        await userEvent.click(screen.getByRole('button', { name: 'Model' }));
        await userEvent.type(await screen.findByRole('combobox', { name: 'Search…' }), 'qwen');

        expect(await screen.findByRole('option', { name: 'qwen3:0.6b' })).toBeInTheDocument();
        expect(screen.queryByRole('option', { name: 'llama3' })).not.toBeInTheDocument();
    });

    it('calls onValueChange and closes the popover when an option is selected', async () => {
        const onValueChange = jest.fn();
        render(<Combobox items={ITEMS} value="llama3" onValueChange={onValueChange} keyLabel="Model" />);

        await userEvent.click(screen.getByRole('button', { name: 'Model' }));
        await userEvent.click(await screen.findByRole('option', { name: 'qwen3:0.6b' }));

        expect(onValueChange).toHaveBeenCalledWith('qwen3:0.6b');
        expect(screen.queryByRole('option', { name: 'qwen3:0.6b' })).not.toBeInTheDocument();
    });

    it('calls onRefresh when the refresh button is clicked', async () => {
        const onRefresh = jest.fn();
        render(<Combobox items={ITEMS} value="llama3" onValueChange={jest.fn()} keyLabel="Model" onRefresh={onRefresh} />);

        await userEvent.click(screen.getByRole('button', { name: 'Model' }));
        await userEvent.click(await screen.findByRole('button', { name: 'Refresh list' }));

        expect(onRefresh).toHaveBeenCalledTimes(1);
    });

    it('does not open when disabled', async () => {
        render(<Combobox items={ITEMS} value="llama3" onValueChange={jest.fn()} keyLabel="Model" disabled />);

        await userEvent.click(screen.getByRole('button', { name: 'Model' }));

        expect(screen.queryByRole('option')).not.toBeInTheDocument();
    });

    it('shows the empty-state message when no item matches the search text', async () => {
        render(<Combobox items={ITEMS} value="llama3" onValueChange={jest.fn()} keyLabel="Model" />);

        await userEvent.click(screen.getByRole('button', { name: 'Model' }));
        await userEvent.type(await screen.findByRole('combobox', { name: 'Search…' }), 'nonexistent-model-xyz');

        expect(await screen.findByText('No results.')).toBeInTheDocument();
    });
});
