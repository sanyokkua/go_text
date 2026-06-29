import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsTabs from '../SettingsTabs';

describe('SettingsTabs', () => {
    it('renders all seven tabs', () => {
        render(<SettingsTabs activeTab={0} onChange={jest.fn()} />);
        expect(screen.getAllByRole('tab')).toHaveLength(7);
    });

    it('Appearance is the first tab (index 0)', () => {
        render(<SettingsTabs activeTab={0} onChange={jest.fn()} />);
        const tabs = screen.getAllByRole('tab');
        expect(tabs[0]).toHaveTextContent('Appearance');
        expect(tabs[0]).toHaveAttribute('aria-selected', 'true');
    });

    it('Logging is the second tab (index 1)', () => {
        render(<SettingsTabs activeTab={0} onChange={jest.fn()} />);
        expect(screen.getAllByRole('tab')[1]).toHaveTextContent('Logging');
    });

    it('Providers is the third tab (index 2)', () => {
        render(<SettingsTabs activeTab={0} onChange={jest.fn()} />);
        expect(screen.getAllByRole('tab')[2]).toHaveTextContent('Providers');
    });

    it('Model is the fourth tab (index 3)', () => {
        render(<SettingsTabs activeTab={0} onChange={jest.fn()} />);
        expect(screen.getAllByRole('tab')[3]).toHaveTextContent('Model');
    });

    it('Generation is the fifth tab (index 4)', () => {
        render(<SettingsTabs activeTab={0} onChange={jest.fn()} />);
        expect(screen.getAllByRole('tab')[4]).toHaveTextContent('Generation');
    });

    it('Languages is the sixth tab (index 5)', () => {
        render(<SettingsTabs activeTab={0} onChange={jest.fn()} />);
        expect(screen.getAllByRole('tab')[5]).toHaveTextContent('Languages');
    });

    it('About & data is the last tab (index 6)', () => {
        render(<SettingsTabs activeTab={0} onChange={jest.fn()} />);
        expect(screen.getAllByRole('tab')[6]).toHaveTextContent('About & data');
    });

    it('marks the active tab with aria-selected=true and others false', () => {
        render(<SettingsTabs activeTab={2} onChange={jest.fn()} />);
        const tabs = screen.getAllByRole('tab');
        expect(tabs[2]).toHaveAttribute('aria-selected', 'true');
        expect(tabs[0]).toHaveAttribute('aria-selected', 'false');
        expect(tabs[6]).toHaveAttribute('aria-selected', 'false');
    });

    it('renders the Appearance tab with the palette glyph', () => {
        render(<SettingsTabs activeTab={0} onChange={jest.fn()} />);
        expect(screen.getByRole('tab', { name: 'Appearance' })).toHaveTextContent('🎨');
    });

    it('renders the Providers tab with the plug glyph', () => {
        render(<SettingsTabs activeTab={0} onChange={jest.fn()} />);
        expect(screen.getByRole('tab', { name: 'Providers' })).toHaveTextContent('🔌');
    });

    it('calls onChange with the correct index when Providers tab is clicked', async () => {
        const handleChange = jest.fn();
        render(<SettingsTabs activeTab={0} onChange={handleChange} />);
        await userEvent.click(screen.getAllByRole('tab')[2]); // Providers is index 2
        expect(handleChange).toHaveBeenCalledWith(expect.anything(), 2);
    });
});
