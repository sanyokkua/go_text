import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';

import SettingsTabs from '../SettingsTabs';

describe('SettingsTabs', () => {
    it('renders the Providers tab with the plug glyph', () => {
        render(<SettingsTabs activeTab={0} onChange={jest.fn()} />);

        const providersTab = screen.getByRole('tab', { name: 'Providers' });
        expect(providersTab).toHaveTextContent('🔌');
    });
});
