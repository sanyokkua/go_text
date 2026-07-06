// frontend/src/ui/primitives/__tests__/cmdk.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { Combobox } from '../Combobox';
import { CommandPalette } from '../CommandPalette';

const models = [
    { value: 'llama3', label: 'Llama 3', meta: '4.7GB' },
    { value: 'phi3', label: 'Phi-3', meta: '2.1GB' },
    { value: 'mistral', label: 'Mistral 7B' },
];

describe('Combobox', () => {
    it('has no accessibility violations when closed', async () => {
        const { container } = render(<Combobox items={models} value="llama3" onValueChange={() => {}} keyLabel="Model" />);
        expect(await axe(container)).toHaveNoViolations();
    });

    it('shows the selected item label on the trigger', () => {
        render(<Combobox items={models} value="phi3" onValueChange={() => {}} />);
        expect(screen.getByText('Phi-3')).toBeInTheDocument();
    });

    it('calls onValueChange with the selected item value when an item is clicked', async () => {
        const onChange = jest.fn();
        render(<Combobox items={models} value="llama3" onValueChange={onChange} />);
        await userEvent.click(screen.getByRole('button'));
        await userEvent.click(screen.getByText('Mistral 7B'));
        expect(onChange).toHaveBeenCalledWith('mistral');
    });

    it('filters items when search text is typed', async () => {
        render(<Combobox items={models} value="llama3" onValueChange={() => {}} />);
        await userEvent.click(screen.getByRole('button'));
        await userEvent.type(screen.getByRole('combobox'), 'phi');
        expect(screen.getByText('Phi-3')).toBeInTheDocument();
        // cmdk removes non-matching items from the listbox when filtering
        const listbox = screen.getByRole('listbox');
        expect(listbox).not.toHaveTextContent('Llama 3');
    });
});

const actions = [
    { value: 'rewrite', label: 'Rewrite text', group: 'Text' },
    { value: 'summarize', label: 'Summarize', group: 'Text' },
    { value: 'translate', label: 'Translate', group: 'Language' },
];

describe('CommandPalette', () => {
    it('has no accessibility violations when open', async () => {
        const { container } = render(<CommandPalette open items={actions} onOpenChange={() => {}} onSelect={() => {}} />);
        expect(await axe(container)).toHaveNoViolations();
    });

    it('calls onSelect and closes when an item is clicked', async () => {
        const onSelect = jest.fn();
        const onOpenChange = jest.fn();
        render(<CommandPalette open items={actions} onOpenChange={onOpenChange} onSelect={onSelect} />);
        await userEvent.click(screen.getByText('Rewrite text'));
        expect(onSelect).toHaveBeenCalledWith('rewrite');
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('renders all items', () => {
        render(<CommandPalette open items={actions} onOpenChange={() => {}} onSelect={() => {}} />);
        expect(screen.getByText('Rewrite text')).toBeInTheDocument();
        expect(screen.getByText('Summarize')).toBeInTheDocument();
        expect(screen.getByText('Translate')).toBeInTheDocument();
    });
});
