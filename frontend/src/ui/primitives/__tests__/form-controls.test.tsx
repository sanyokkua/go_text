// frontend/src/ui/primitives/__tests__/form-controls.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { RadioGroup } from '../RadioGroup';
import { Slider } from '../Slider';
import { Switch } from '../Switch';

describe('Switch', () => {
    it('has no accessibility violations', async () => {
        const { container } = render(<Switch checked={false} onCheckedChange={() => {}} aria-label="Enable feature" />);
        expect(await axe(container)).toHaveNoViolations();
    });

    it('calls onCheckedChange with true when toggled on', async () => {
        const onChange = jest.fn();
        render(<Switch checked={false} onCheckedChange={onChange} />);
        await userEvent.click(screen.getByRole('switch'));
        expect(onChange).toHaveBeenCalledWith(true);
    });

    it('calls onCheckedChange with false when toggled off', async () => {
        const onChange = jest.fn();
        render(<Switch checked={true} onCheckedChange={onChange} />);
        await userEvent.click(screen.getByRole('switch'));
        expect(onChange).toHaveBeenCalledWith(false);
    });

    it('does not fire when disabled', async () => {
        const onChange = jest.fn();
        render(<Switch checked={false} onCheckedChange={onChange} disabled />);
        await userEvent.click(screen.getByRole('switch'));
        expect(onChange).not.toHaveBeenCalled();
    });
});

describe('Slider', () => {
    it('has no accessibility violations', async () => {
        const { container } = render(<Slider value={[50]} onValueChange={() => {}} />);
        expect(await axe(container)).toHaveNoViolations();
    });

    it('calls onValueChange when value changes via keyboard', async () => {
        const onChange = jest.fn();
        render(<Slider value={[50]} onValueChange={onChange} min={0} max={100} />);
        const thumb = screen.getByRole('slider');
        thumb.focus();
        await userEvent.keyboard('{ArrowRight}');
        expect(onChange).toHaveBeenCalledWith([51]);
    });
});

describe('RadioGroup', () => {
    const items = [
        { value: 'a', label: 'Option A' },
        { value: 'b', label: 'Option B' },
    ];

    it('has no accessibility violations', async () => {
        const { container } = render(<RadioGroup value="a" onValueChange={() => {}} items={items} />);
        expect(await axe(container)).toHaveNoViolations();
    });

    it('calls onValueChange when a different item is clicked', async () => {
        const onChange = jest.fn();
        render(<RadioGroup value="a" onValueChange={onChange} items={items} />);
        await userEvent.click(screen.getByLabelText('Option B'));
        expect(onChange).toHaveBeenCalledWith('b');
    });

    it('marks the controlled value as checked', () => {
        render(<RadioGroup value="b" onValueChange={() => {}} items={items} />);
        expect(screen.getByLabelText('Option B')).toBeChecked();
        expect(screen.getByLabelText('Option A')).not.toBeChecked();
    });
});
