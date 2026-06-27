jest.mock('../../../../logic/adapter', () => ({
    getLogger: jest.fn().mockReturnValue({
        logDebug: jest.fn(),
        logInfo: jest.fn(),
        logError: jest.fn(),
        logWarning: jest.fn(),
        logTrace: jest.fn(),
        logPrint: jest.fn(),
        logFatal: jest.fn(),
    }),
    unwrap: jest.fn((res: { data?: unknown; error?: unknown }) => {
        if (res.error) throw res.error;
        return res.data;
    }),
    tryUnwrap: jest.fn((res: { data?: unknown; error?: unknown }) => res),
    ActionHandlerAdapter: { previewPrompt: jest.fn().mockResolvedValue({ data: null, error: null }) },
    SettingsHandlerAdapter: {},
    StackHandler: {},
}));

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import aboutReducer from '../../../../logic/store/about/slice';
import PromptInspector from './PromptInspector';

const mockPreview = {
    kind: 'single',
    inferences: 1,
    groups: [
        {
            index: 0,
            family: 'single',
            appliedActions: [{ id: 'a1', name: 'Summarise', category: 'Writing' }],
            systemPrompt: 'You are helpful.',
            userPrompt: 'Summarise: {{user_text}}',
            parameters: { model: 'gpt-4o', format: 'text', tokenParam: 'max_tokens', stream: false },
        },
    ],
    summary: 'Preview of Summarise',
};

function buildStore(aboutOverrides = {}) {
    return configureStore({
        reducer: { about: aboutReducer },
        preloadedState: {
            about: {
                activeSection: 'actions-stacks',
                selectedItemId: null,
                selectedItemType: null,
                inspectorOpen: false,
                inspectorLoading: false,
                inspectorData: null,
                inspectorError: null,
                previewInputEnabled: false,
                ...aboutOverrides,
            },
        },
    });
}

describe('PromptInspector', () => {
    it('shows empty placeholder when no item is selected', () => {
        render(<Provider store={buildStore()}><PromptInspector /></Provider>);
        expect(screen.getByText(/Select an action or stack/)).toBeInTheDocument();
    });

    it('shows loading spinner while inspectorLoading is true', () => {
        const store = buildStore({
            selectedItemId: 'a1',
            selectedItemType: 'action',
            inspectorLoading: true,
        });
        render(<Provider store={store}><PromptInspector /></Provider>);
        expect(screen.getByText(/Loading preview/i)).toBeInTheDocument();
    });

    it('shows error message when inspectorError is set', () => {
        const store = buildStore({
            selectedItemId: 'a1',
            selectedItemType: 'action',
            inspectorError: 'Action not found',
        });
        render(<Provider store={store}><PromptInspector /></Provider>);
        expect(screen.getByRole('alert')).toHaveTextContent('Action not found');
    });

    it('renders preview groups when inspectorData is set', () => {
        const store = buildStore({
            selectedItemId: 'a1',
            selectedItemType: 'action',
            inspectorData: mockPreview,
        });
        render(<Provider store={store}><PromptInspector /></Provider>);
        expect(screen.getByText('You are helpful.')).toBeInTheDocument();
        expect(screen.getByText(/Summarise: \{\{user_text\}\}/)).toBeInTheDocument();
    });

    it('toggles previewInputEnabled when "Use current input" checkbox is clicked', async () => {
        const store = buildStore({
            selectedItemId: 'a1',
            selectedItemType: 'action',
            inspectorData: mockPreview,
        });
        render(<Provider store={store}><PromptInspector /></Provider>);
        const checkbox = screen.getByRole('checkbox', { name: /use current input/i });
        expect(checkbox).not.toBeChecked();
        await userEvent.click(checkbox);
        expect(store.getState().about.previewInputEnabled).toBe(true);
    });
});
