import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import KvEditor from '../KvEditor';

describe('KvEditor initial rendering', () => {
    it('renders one row per entry in the value prop, populating each key and value input', () => {
        render(<KvEditor value={{ 'X-Api-Key': 'secret123', 'X-Region': 'us-east' }} onChange={jest.fn()} />);

        expect(screen.getByLabelText('Header key 1')).toHaveValue('X-Api-Key');
        expect(screen.getByLabelText('Header value 1')).toHaveValue('secret123');
        expect(screen.getByLabelText('Header key 2')).toHaveValue('X-Region');
        expect(screen.getByLabelText('Header value 2')).toHaveValue('us-east');
    });

    it('renders no rows when the value prop is an empty object', () => {
        render(<KvEditor value={{}} onChange={jest.fn()} />);

        expect(screen.queryByLabelText('Header key 1')).not.toBeInTheDocument();
        expect(screen.queryByLabelText('Header value 1')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: '+ Add header' })).toBeInTheDocument();
    });
});

describe('KvEditor row management', () => {
    it('adds a new empty row when the add-header button is clicked', async () => {
        const user = userEvent.setup();
        render(<KvEditor value={{}} onChange={jest.fn()} />);

        await user.click(screen.getByRole('button', { name: '+ Add header' }));

        expect(screen.getByLabelText('Header key 1')).toHaveValue('');
        expect(screen.getByLabelText('Header value 1')).toHaveValue('');
    });

    it('removes the row and calls onChange without it when its remove button is clicked', async () => {
        const user = userEvent.setup();
        const onChange = jest.fn();
        render(<KvEditor value={{ a: '1', b: '2' }} onChange={onChange} />);

        await user.click(screen.getByRole('button', { name: 'Remove header 1' }));

        expect(screen.getByLabelText('Header key 1')).toHaveValue('b');
        expect(onChange).toHaveBeenLastCalledWith({ b: '2' });
    });

    it('appends a new row when Enter is pressed in a value input', async () => {
        const user = userEvent.setup();
        render(<KvEditor value={{ a: '1' }} onChange={jest.fn()} />);

        await user.type(screen.getByLabelText('Header value 1'), '{Enter}');

        expect(screen.getByLabelText('Header key 2')).toHaveValue('');
        expect(screen.getByLabelText('Header value 2')).toHaveValue('');
    });
});

describe('KvEditor emitted record', () => {
    it('calls onChange with the updated key when a key input is edited', async () => {
        const user = userEvent.setup();
        const onChange = jest.fn();
        render(<KvEditor value={{ host: 'localhost' }} onChange={onChange} />);

        const keyInput = screen.getByLabelText('Header key 1');
        await user.clear(keyInput);
        await user.type(keyInput, 'hostname');

        expect(onChange).toHaveBeenLastCalledWith({ hostname: 'localhost' });
    });

    it('calls onChange with the updated value when a value input is edited', async () => {
        const user = userEvent.setup();
        const onChange = jest.fn();
        render(<KvEditor value={{ host: 'localhost' }} onChange={onChange} />);

        const valueInput = screen.getByLabelText('Header value 1');
        await user.clear(valueInput);
        await user.type(valueInput, '127.0.0.1');

        expect(onChange).toHaveBeenLastCalledWith({ host: '127.0.0.1' });
    });

    it('excludes a row with an empty key from the emitted record', async () => {
        const user = userEvent.setup();
        const onChange = jest.fn();
        render(<KvEditor value={{}} onChange={onChange} />);

        await user.click(screen.getByRole('button', { name: '+ Add header' }));
        await user.type(screen.getByLabelText('Header value 1'), 'x');

        expect(onChange).toHaveBeenLastCalledWith({});
    });
});

describe('KvEditor disabled state', () => {
    it('disables every input and button when disabled is true', () => {
        render(<KvEditor value={{ a: '1', b: '2' }} onChange={jest.fn()} disabled />);

        expect(screen.getByLabelText('Header key 1')).toBeDisabled();
        expect(screen.getByLabelText('Header value 1')).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Remove header 1' })).toBeDisabled();
        expect(screen.getByLabelText('Header key 2')).toBeDisabled();
        expect(screen.getByLabelText('Header value 2')).toBeDisabled();
        expect(screen.getByRole('button', { name: 'Remove header 2' })).toBeDisabled();
        expect(screen.getByRole('button', { name: '+ Add header' })).toBeDisabled();
    });
});

describe('KvEditor prop synchronization', () => {
    it('updates the displayed rows when the value prop changes after a rerender', () => {
        const { rerender } = render(<KvEditor value={{ a: '1' }} onChange={jest.fn()} />);

        expect(screen.queryByLabelText('Header key 2')).not.toBeInTheDocument();

        rerender(<KvEditor value={{ a: '1', b: '2' }} onChange={jest.fn()} />);

        expect(screen.getByLabelText('Header key 2')).toHaveValue('b');
        expect(screen.getByLabelText('Header value 2')).toHaveValue('2');
    });
});
