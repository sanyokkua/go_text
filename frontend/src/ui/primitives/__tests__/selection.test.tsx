// frontend/src/ui/primitives/__tests__/selection.test.tsx
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { Segmented } from '../Segmented';
import { Select } from '../Select';
import { Tabs } from '../Tabs';

const segItems = [
    { value: 'plain', label: 'Plain' },
    { value: 'markdown', label: 'Markdown' },
];

describe('Segmented', () => {
    it('has no accessibility violations', async () => {
        const { container } = render(<Segmented value="plain" onValueChange={() => {}} items={segItems} />);
        expect(await axe(container)).toHaveNoViolations();
    });

    it('calls onValueChange when a different segment is clicked', async () => {
        const onChange = jest.fn();
        render(<Segmented value="plain" onValueChange={onChange} items={segItems} />);
        await userEvent.click(screen.getByRole('radio', { name: 'Markdown' }));
        expect(onChange).toHaveBeenCalledWith('markdown');
    });

    it('does not call onValueChange when clicking the already-selected segment', async () => {
        const onChange = jest.fn();
        render(<Segmented value="plain" onValueChange={onChange} items={segItems} />);
        await userEvent.click(screen.getByRole('radio', { name: 'Plain' }));
        expect(onChange).not.toHaveBeenCalled();
    });
});

const selectItems = [
    { value: 'ollama', label: 'Ollama' },
    { value: 'lmstudio', label: 'LM Studio' },
];

describe('Select', () => {
    it('has no accessibility violations', async () => {
        const { container } = render(<Select value="ollama" onValueChange={() => {}} items={selectItems} />);
        expect(await axe(container)).toHaveNoViolations();
    });

    it('calls onValueChange when a different item is selected', async () => {
        const onChange = jest.fn();
        render(<Select value="ollama" onValueChange={onChange} items={selectItems} />);
        await userEvent.click(screen.getByRole('combobox'));
        await userEvent.click(screen.getByRole('option', { name: 'LM Studio' }));
        expect(onChange).toHaveBeenCalledWith('lmstudio');
    });
});

const tabDefs = [
    { value: 'a', label: 'Tab A', content: <p>Content A</p> },
    { value: 'b', label: 'Tab B', content: <p>Content B</p> },
];

describe('Tabs', () => {
    it('has no accessibility violations', async () => {
        const { container } = render(<Tabs value="a" onValueChange={() => {}} tabs={tabDefs} />);
        expect(await axe(container)).toHaveNoViolations();
    });

    it('calls onValueChange when tab trigger is clicked', async () => {
        const onChange = jest.fn();
        render(<Tabs value="a" onValueChange={onChange} tabs={tabDefs} />);
        await userEvent.click(screen.getByRole('tab', { name: 'Tab B' }));
        expect(onChange).toHaveBeenCalledWith('b');
    });

    it('shows the content for the active tab', () => {
        render(<Tabs value="a" onValueChange={() => {}} tabs={tabDefs} />);
        expect(screen.getByText('Content A')).toBeVisible();
    });
});
