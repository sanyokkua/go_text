import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import TagInput from '../TagInput';

describe('TagInput initial rendering', () => {
    it('renders no remove buttons and shows the placeholder text when value is empty', () => {
        render(<TagInput value={[]} onChange={jest.fn()} />);

        expect(screen.queryAllByRole('button')).toHaveLength(0);
        expect(screen.getByLabelText('New model name')).toHaveAttribute('placeholder', 'Add model…');
    });

    it('renders one chip with its own remove button per tag and hides the placeholder', () => {
        render(<TagInput value={['a', 'b']} onChange={jest.fn()} />);

        expect(screen.getByRole('button', { name: 'Remove a' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Remove b' })).toBeInTheDocument();
        expect(screen.queryAllByRole('button')).toHaveLength(2);
        expect(screen.getByLabelText('New model name')).toHaveAttribute('placeholder', '');
    });
});

describe('TagInput adding tags', () => {
    it('commits the typed text as a new tag and clears the input when Enter is pressed', async () => {
        const user = userEvent.setup();
        const onChange = jest.fn();
        render(<TagInput value={[]} onChange={onChange} />);

        const input = screen.getByLabelText('New model name');
        await user.type(input, 'foo{Enter}');

        expect(onChange).toHaveBeenCalledWith(['foo']);
        expect(input).toHaveValue('');
    });

    it('commits the typed text as a new tag immediately when a trailing comma is typed', async () => {
        const user = userEvent.setup();
        const onChange = jest.fn();
        render(<TagInput value={[]} onChange={onChange} />);

        const input = screen.getByLabelText('New model name');
        await user.type(input, 'foo,');

        expect(onChange).toHaveBeenCalledWith(['foo']);
        expect(input).toHaveValue('');
    });

    it('does not call onChange when the typed tag already exists (case-sensitive duplicate)', async () => {
        const user = userEvent.setup();
        const onChange = jest.fn();
        render(<TagInput value={['foo']} onChange={onChange} />);

        await user.type(screen.getByLabelText('New model name'), 'foo{Enter}');

        expect(onChange).not.toHaveBeenCalled();
    });

    it('does not call onChange when Enter is pressed on an empty input', async () => {
        const user = userEvent.setup();
        const onChange = jest.fn();
        render(<TagInput value={[]} onChange={onChange} />);

        await user.type(screen.getByLabelText('New model name'), '{Enter}');

        expect(onChange).not.toHaveBeenCalled();
    });

    it('supports adding a tag using the keyboard alone, from tabbing in to pressing Enter', async () => {
        const user = userEvent.setup();
        const onChange = jest.fn();
        render(<TagInput value={[]} onChange={onChange} />);

        await user.tab();
        expect(screen.getByLabelText('New model name')).toHaveFocus();

        await user.keyboard('gpt-4{Enter}');

        expect(onChange).toHaveBeenCalledWith(['gpt-4']);
    });
});

describe('TagInput removing tags', () => {
    it('calls onChange with the clicked tag filtered out, leaving the others', async () => {
        const user = userEvent.setup();
        const onChange = jest.fn();
        render(<TagInput value={['a', 'b', 'c']} onChange={onChange} />);

        await user.click(screen.getByRole('button', { name: 'Remove b' }));

        expect(onChange).toHaveBeenCalledWith(['a', 'c']);
    });

    it('removes the last tag when Backspace is pressed in an empty input with tags present', async () => {
        const user = userEvent.setup();
        const onChange = jest.fn();
        render(<TagInput value={['a', 'b']} onChange={onChange} />);

        await user.type(screen.getByLabelText('New model name'), '{Backspace}');

        expect(onChange).toHaveBeenCalledWith(['a']);
    });

    it('does not call onChange when Backspace is pressed in an empty input with no tags', async () => {
        const user = userEvent.setup();
        const onChange = jest.fn();
        render(<TagInput value={[]} onChange={onChange} />);

        await user.type(screen.getByLabelText('New model name'), '{Backspace}');

        expect(onChange).not.toHaveBeenCalled();
    });
});

describe('TagInput disabled state', () => {
    it('disables the input and every remove button when disabled is true', () => {
        render(<TagInput value={['a', 'b']} onChange={jest.fn()} disabled />);

        expect(screen.getByLabelText('New model name')).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Remove a' })).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Remove b' })).toBeDisabled();
    });
});
