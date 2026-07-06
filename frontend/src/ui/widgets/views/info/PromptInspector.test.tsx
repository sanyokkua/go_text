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
    ClipboardServiceAdapter: { setText: jest.fn().mockResolvedValue(true) },
}));

import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import aboutReducer from '../../../../logic/store/about/slice';
import type { AboutState } from '../../../../logic/store/about/types';
import actionsReducer from '../../../../logic/store/actions/slice';
import notificationsReducer from '../../../../logic/store/notifications/slice';
import type { NotificationsState } from '../../../../logic/store/notifications/types';
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
    notifications?: NotificationsState;
}

function buildStore({ aboutOverrides = {}, catalog = [], savedStacks = [], notifications = { queue: [] } }: BuildStoreOptions = {}) {
    return configureStore({
        reducer: { about: aboutReducer, actions: actionsReducer, stacksSaved: stacksSavedReducer, notifications: notificationsReducer },
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
            notifications,
        },
    });
}

const multiFamilyPreview = {
    kind: 'stack',
    inferences: 2,
    groups: [
        {
            index: 0,
            family: 'rewrite',
            appliedActions: [{ id: 'a1', name: 'Rewrite Text', category: 'Writing' }],
            systemPrompt: 'You rewrite text.',
            userPrompt: 'Rewrite: {{user_text}}',
            parameters: { model: 'gpt-4o', format: 'text', tokenParam: 'max_tokens', stream: false },
        },
        {
            index: 1,
            family: 'summarize',
            appliedActions: [{ id: 'a2', name: 'Summarize Text', category: 'Writing' }],
            systemPrompt: 'You summarize text.',
            userPrompt: 'Summarize: {{user_text}}',
            parameters: { model: 'gpt-4o', format: 'text', tokenParam: 'max_tokens', stream: false },
        },
    ],
    summary: 'Preview of a two-step stack',
};

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

    it('renders a title-cased family chip for each inference group', () => {
        const store = buildStore({ aboutOverrides: { selectedItemId: 's1', selectedItemType: 'stack', inspectorData: multiFamilyPreview } });
        render(
            <Provider store={store}>
                <PromptInspector />
            </Provider>,
        );

        const firstGroupHeader = screen.getByText('Inference 1').closest('div');
        const secondGroupHeader = screen.getByText('Inference 2').closest('div');
        expect(firstGroupHeader).not.toBeNull();
        expect(secondGroupHeader).not.toBeNull();

        // Each group shows its own family, title-cased, next to its "Inference N" label.
        expect(within(firstGroupHeader as HTMLElement).getByText('Rewrite')).toBeInTheDocument();
        expect(within(secondGroupHeader as HTMLElement).getByText('Summarize')).toBeInTheDocument();
    });

    it('copies the full composed prompt text to the clipboard when "Copy all" is clicked', async () => {
        const { ClipboardServiceAdapter } = await import('../../../../logic/adapter');
        const store = buildStore({ aboutOverrides: { selectedItemId: 'a1', selectedItemType: 'action', inspectorData: mockPreview } });
        render(
            <Provider store={store}>
                <PromptInspector />
            </Provider>,
        );

        await userEvent.click(screen.getByRole('button', { name: /copy all/i }));

        const expectedText = 'Inference 1 — Single\nSystem:\nYou are helpful.\n\nUser:\nSummarise: {{user_text}}';
        expect(ClipboardServiceAdapter.setText).toHaveBeenCalledWith(expectedText);
    });

    it('shows a success notification after "Copy all" succeeds', async () => {
        const store = buildStore({ aboutOverrides: { selectedItemId: 'a1', selectedItemType: 'action', inspectorData: mockPreview } });
        render(
            <Provider store={store}>
                <PromptInspector />
            </Provider>,
        );

        await userEvent.click(screen.getByRole('button', { name: /copy all/i }));

        await waitFor(() =>
            expect(store.getState().notifications.queue).toContainEqual(
                expect.objectContaining({ message: 'Copied full prompt to clipboard', severity: 'success' }),
            ),
        );
    });

    it('shows an error notification instead of crashing when "Copy all" fails', async () => {
        const { ClipboardServiceAdapter } = await import('../../../../logic/adapter');
        (ClipboardServiceAdapter.setText as jest.Mock).mockRejectedValueOnce(new Error('clipboard access denied'));
        const store = buildStore({ aboutOverrides: { selectedItemId: 'a1', selectedItemType: 'action', inspectorData: mockPreview } });
        render(
            <Provider store={store}>
                <PromptInspector />
            </Provider>,
        );

        await userEvent.click(screen.getByRole('button', { name: /copy all/i }));

        await waitFor(() =>
            expect(store.getState().notifications.queue).toContainEqual(
                expect.objectContaining({ message: 'Failed to copy prompt', severity: 'error' }),
            ),
        );
        // The component keeps rendering the preview normally instead of crashing on the rejection.
        expect(screen.getByText(/Summarise: \{\{user_text\}\}/)).toBeInTheDocument();
    });
});
