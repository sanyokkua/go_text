jest.mock('../../../../logic/adapter', () => ({
    getLogger: () => ({ logDebug: jest.fn(), logInfo: jest.fn(), logError: jest.fn(), logWarning: jest.fn() }),
    SettingsHandlerAdapter: {
        setDefaultInputLanguage: jest.fn().mockResolvedValue({ data: null, error: null }),
        setDefaultOutputLanguage: jest.fn().mockResolvedValue({ data: null, error: null }),
    },
    unwrap: (res: { data?: unknown; error?: unknown }) => {
        if (res?.error) throw res.error;
        return res?.data;
    },
}));

import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';

import { SettingsHandlerAdapter } from '../../../../logic/adapter';
import { LanguageConfig, Settings } from '../../../../logic/adapter/models';
import settingsReducer from '../../../../logic/store/settings/slice';
import LanguagePicker from '../LanguagePicker';

function makeStore(opts: { languageConfig?: LanguageConfig | null } = {}) {
    return configureStore({
        reducer: { settings: settingsReducer },
        preloadedState: { settings: { allSettings: { languageConfig: opts.languageConfig ?? null } as unknown as Settings, metadata: null } },
    });
}

function renderLanguagePicker(opts: Parameters<typeof makeStore>[0] = {}) {
    const store = makeStore(opts);
    render(
        <Provider store={store}>
            <LanguagePicker />
        </Provider>,
    );
    return store;
}

describe('LanguagePicker', () => {
    let mockSetDefaultInputLanguage: jest.Mock;
    let mockSetDefaultOutputLanguage: jest.Mock;

    beforeEach(() => {
        mockSetDefaultInputLanguage = SettingsHandlerAdapter.setDefaultInputLanguage as jest.Mock;
        mockSetDefaultOutputLanguage = SettingsHandlerAdapter.setDefaultOutputLanguage as jest.Mock;
        mockSetDefaultInputLanguage.mockClear();
        mockSetDefaultOutputLanguage.mockClear();
    });

    it('renders nothing when there is no language config', () => {
        renderLanguagePicker({ languageConfig: null });
        expect(screen.queryByRole('button', { name: 'Languages' })).not.toBeInTheDocument();
    });

    it('renders nothing when the language config has no languages', () => {
        renderLanguagePicker({ languageConfig: { languages: [], defaultInputLanguage: 'English', defaultOutputLanguage: 'Ukrainian' } });
        expect(screen.queryByRole('button', { name: 'Languages' })).not.toBeInTheDocument();
    });

    it('renders the Languages trigger showing the current input and output languages', () => {
        renderLanguagePicker({
            languageConfig: { languages: ['English', 'Ukrainian', 'German'], defaultInputLanguage: 'English', defaultOutputLanguage: 'Ukrainian' },
        });

        const trigger = screen.getByRole('button', { name: 'Languages' });
        expect(trigger).toBeInTheDocument();
        expect(trigger).toHaveTextContent('English');
        expect(trigger).toHaveTextContent('Ukrainian');
    });

    it('opens the popover revealing In and Out comboboxes when the trigger is clicked', async () => {
        renderLanguagePicker({
            languageConfig: { languages: ['English', 'Ukrainian', 'German'], defaultInputLanguage: 'English', defaultOutputLanguage: 'Ukrainian' },
        });

        await userEvent.click(screen.getByRole('button', { name: 'Languages' }));

        expect(await screen.findByRole('combobox', { name: 'In' })).toBeInTheDocument();
        expect(screen.getByRole('combobox', { name: 'Out' })).toBeInTheDocument();
    });

    it('dispatches setDefaultInputLanguage with the selected language when a new In option is chosen', async () => {
        renderLanguagePicker({
            languageConfig: { languages: ['English', 'Ukrainian', 'German'], defaultInputLanguage: 'English', defaultOutputLanguage: 'Ukrainian' },
        });

        await userEvent.click(screen.getByRole('button', { name: 'Languages' }));
        await userEvent.click(await screen.findByRole('combobox', { name: 'In' }));
        await userEvent.click(screen.getByRole('option', { name: 'German' }));

        expect(mockSetDefaultInputLanguage).toHaveBeenCalledWith('German');
    });

    it('dispatches setDefaultOutputLanguage with the selected language when a new Out option is chosen', async () => {
        renderLanguagePicker({
            languageConfig: { languages: ['English', 'Ukrainian', 'German'], defaultInputLanguage: 'English', defaultOutputLanguage: 'Ukrainian' },
        });

        await userEvent.click(screen.getByRole('button', { name: 'Languages' }));
        await userEvent.click(await screen.findByRole('combobox', { name: 'Out' }));
        await userEvent.click(screen.getByRole('option', { name: 'German' }));

        expect(mockSetDefaultOutputLanguage).toHaveBeenCalledWith('German');
    });
});
