import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NumberStepper } from '../NumberStepper';

describe('NumberStepper', () => {
    it('renders the current value in a spinbutton with the given label', () => {
        render(<NumberStepper value={42} onChange={jest.fn()} min={0} max={100} aria-label="Request timeout" />);

        expect(screen.getByRole('spinbutton', { name: /request timeout/i })).toHaveValue(42);
    });

    it('increments by step when the plus button is clicked', async () => {
        const onChange = jest.fn();
        render(<NumberStepper value={10} onChange={onChange} min={0} max={100} step={5} aria-label="Max entries" />);

        await userEvent.click(screen.getByRole('button', { name: /increase max entries/i }));

        expect(onChange).toHaveBeenCalledWith(15);
    });

    it('decrements by step when the minus button is clicked', async () => {
        const onChange = jest.fn();
        render(<NumberStepper value={10} onChange={onChange} min={0} max={100} step={5} aria-label="Max entries" />);

        await userEvent.click(screen.getByRole('button', { name: /decrease max entries/i }));

        expect(onChange).toHaveBeenCalledWith(5);
    });

    it('disables the minus button at the minimum bound', () => {
        render(<NumberStepper value={0} onChange={jest.fn()} min={0} max={100} aria-label="Retries" />);

        expect(screen.getByRole('button', { name: /decrease retries/i })).toBeDisabled();
    });

    it('disables the plus button at the maximum bound', () => {
        render(<NumberStepper value={100} onChange={jest.fn()} min={0} max={100} aria-label="Retries" />);

        expect(screen.getByRole('button', { name: /increase retries/i })).toBeDisabled();
    });

    it('clamps typed values that exceed the maximum', async () => {
        const onChange = jest.fn();
        render(<NumberStepper value={50} onChange={onChange} min={0} max={100} aria-label="Timeout" />);

        const input = screen.getByRole('spinbutton', { name: /timeout/i });
        await userEvent.clear(input);
        await userEvent.type(input, '999');

        expect(onChange).toHaveBeenLastCalledWith(100);
    });
});
