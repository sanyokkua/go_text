jest.mock('../../../../logic/adapter', () => ({
    getLogger: jest
        .fn()
        .mockReturnValue({
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

import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import aboutReducer from '../../../../logic/store/about/slice';
import type { AboutState } from '../../../../logic/store/about/types';
import actionsReducer from '../../../../logic/store/actions/slice';
import stacksSavedReducer from '../../../../logic/store/stacks/saved/slice';
import PromptInspector from './PromptInspector';

// The catalog name ('Summarise Text') deliberately differs from the preview
// chip name ('Summarise') so the title-resolution test proves the displayed
// title comes from the catalog rather than from the preview payload.
const SUMMARISE_ACTION = {
    id: 'a1',
    name: 'Summarise Text',
    category: 'Writing',
    family: 'single',
    directive: '',
    orderRank: 0,
    exclusivityGroup: '',
    mergeable: false,
    terminal: false,
    requires: [],
};

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
            parameters: { model: 'gpt-4o', temperature: 0.7, format: 'text', tokenParam: 'max_tokens', stream: false },
        },
    ],
    summary: 'Preview of Summarise',
};

interface BuildStoreOptions {
    aboutOverrides?: Record<string, unknown>;
    catalog?: unknown[];
    savedStacks?: unknown[];
}

function buildStore({ aboutOverrides = {}, catalog = [], savedStacks = [] }: BuildStoreOptions = {}) {
    return configureStore({
        reducer: { about: aboutReducer, actions: actionsReducer, stacksSaved: stacksSavedReducer },
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
            } as AboutState,
            actions: { catalog, catalogStatus: 'success', availableModels: [], modelsStatus: 'idle' } as never,
            stacksSaved: { stacks: savedStacks, status: 'idle', error: null } as never,
        },
    });
}

describe('PromptInspector', () => {
    it('shows empty placeholder when no item is selected', () => {
        render(
            <Provider store={buildStore()}>
                <PromptInspector />
            </Provider>,
        );
        expect(screen.getByText(/Select an action or stack/)).toBeInTheDocument();
    });

    it('shows loading spinner while inspectorLoading is true', () => {
        const store = buildStore({ aboutOverrides: { selectedItemId: 'a1', selectedItemType: 'action', inspectorLoading: true } });
        render(
            <Provider store={store}>
                <PromptInspector />
            </Provider>,
        );
        expect(screen.getByText(/Loading preview/i)).toBeInTheDocument();
    });

    it('shows error message when inspectorError is set', () => {
        const store = buildStore({ aboutOverrides: { selectedItemId: 'a1', selectedItemType: 'action', inspectorError: 'Action not found' } });
        render(
            <Provider store={store}>
                <PromptInspector />
            </Provider>,
        );
        expect(screen.getByRole('alert')).toHaveTextContent('Action not found');
    });

    it('renders preview groups when inspectorData is set', () => {
        const store = buildStore({ aboutOverrides: { selectedItemId: 'a1', selectedItemType: 'action', inspectorData: mockPreview } });
        render(
            <Provider store={store}>
                <PromptInspector />
            </Provider>,
        );
        expect(screen.getByText('You are helpful.')).toBeInTheDocument();
        expect(screen.getByText(/Summarise: \{\{user_text\}\}/)).toBeInTheDocument();
    });

    it('resolves the action name from the catalog instead of showing the raw id', () => {
        const store = buildStore({
            aboutOverrides: { selectedItemId: 'a1', selectedItemType: 'action', inspectorData: mockPreview },
            catalog: [SUMMARISE_ACTION],
        });
        render(
            <Provider store={store}>
                <PromptInspector />
            </Provider>,
        );
        // The resolved human-readable name is rendered for the selected action,
        // not the raw 'a1' id.
        expect(screen.getByText('Summarise Text')).toBeInTheDocument();
    });

    it('resolves the stack name from the saved stacks list', () => {
        const savedStack = {
            id: 's1',
            name: 'My Cleanup Stack',
            icon: '',
            steps: ['a1'],
            defaultFormat: 'text',
            defaultInLang: '',
            defaultOutLang: '',
            createdAt: 0,
            updatedAt: 0,
        };
        const store = buildStore({
            aboutOverrides: { selectedItemId: 's1', selectedItemType: 'stack', inspectorData: mockPreview },
            savedStacks: [savedStack],
        });
        render(
            <Provider store={store}>
                <PromptInspector />
            </Provider>,
        );
        expect(screen.getByText('My Cleanup Stack')).toBeInTheDocument();
    });

    it('renders the System and User prompts in separate labelled sections', () => {
        const store = buildStore({
            aboutOverrides: { selectedItemId: 'a1', selectedItemType: 'action', inspectorData: mockPreview },
            catalog: [SUMMARISE_ACTION],
        });
        render(
            <Provider store={store}>
                <PromptInspector />
            </Provider>,
        );

        const systemSection = screen.getByLabelText(/system prompt/i);
        const userSection = screen.getByLabelText(/user prompt/i);

        // Each prompt lives inside its own labelled container, isolated from the other.
        expect(within(systemSection).getByText('You are helpful.')).toBeInTheDocument();
        expect(within(systemSection).queryByText(/Summarise: \{\{user_text\}\}/)).not.toBeInTheDocument();

        expect(within(userSection).getByText(/Summarise: \{\{user_text\}\}/)).toBeInTheDocument();
        expect(within(userSection).queryByText('You are helpful.')).not.toBeInTheDocument();
    });

    it('renders parameter badges with the values from the preview group', () => {
        const store = buildStore({
            aboutOverrides: { selectedItemId: 'a1', selectedItemType: 'action', inspectorData: mockPreview },
            catalog: [SUMMARISE_ACTION],
        });
        render(
            <Provider store={store}>
                <PromptInspector />
            </Provider>,
        );

        // model + temperature + format are surfaced as parameter badges.
        expect(screen.getByText('gpt-4o')).toBeInTheDocument();
        expect(screen.getByText('0.7')).toBeInTheDocument();
        expect(screen.getByText('text')).toBeInTheDocument();
    });

    it('renders a context-window badge with the formatted value when the context window is enabled', () => {
        const previewWithContextWindow = {
            ...mockPreview,
            groups: [{ ...mockPreview.groups[0], parameters: { ...mockPreview.groups[0].parameters, contextWindow: 1024 } }],
        };
        const store = buildStore({
            aboutOverrides: { selectedItemId: 'a1', selectedItemType: 'action', inspectorData: previewWithContextWindow },
            catalog: [SUMMARISE_ACTION],
        });
        render(
            <Provider store={store}>
                <PromptInspector />
            </Provider>,
        );

        expect(screen.getByText('context')).toBeInTheDocument();
        expect(screen.getByText('1,024')).toBeInTheDocument();
    });

    it('omits the context-window badge when the context window is disabled', () => {
        const store = buildStore({
            aboutOverrides: { selectedItemId: 'a1', selectedItemType: 'action', inspectorData: mockPreview },
            catalog: [SUMMARISE_ACTION],
        });
        render(
            <Provider store={store}>
                <PromptInspector />
            </Provider>,
        );

        expect(screen.queryByText('context')).not.toBeInTheDocument();
    });

    it('toggles previewInputEnabled when "Use current input" checkbox is clicked', async () => {
        const store = buildStore({ aboutOverrides: { selectedItemId: 'a1', selectedItemType: 'action', inspectorData: mockPreview } });
        render(
            <Provider store={store}>
                <PromptInspector />
            </Provider>,
        );
        const checkbox = screen.getByRole('checkbox', { name: /use current input/i });
        expect(checkbox).not.toBeChecked();
        await userEvent.click(checkbox);
        expect(store.getState().about.previewInputEnabled).toBe(true);
    });
});
