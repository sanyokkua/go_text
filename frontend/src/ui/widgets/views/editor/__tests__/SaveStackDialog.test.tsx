import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { selectBuilderIcon } from '../../../../../logic/store/stacks/builder/selectors';
import actionsReducer from '../../../../../logic/store/actions/slice';
import notificationsReducer from '../../../../../logic/store/notifications/slice';
import stacksBuilderReducer from '../../../../../logic/store/stacks/builder/slice';
import stacksSavedReducer from '../../../../../logic/store/stacks/saved/slice';
import uiReducer from '../../../../../logic/store/ui/slice';
import SaveStackDialog from '../SaveStackDialog';

jest.mock('../../../../../logic/adapter', () => ({
    StackHandlerAdapter: {
        createStack: jest
            .fn()
            .mockResolvedValue({
                data: {
                    id: 'new-stack',
                    name: 'Test',
                    icon: '📝',
                    steps: [],
                    defaultFormat: 'PlainText',
                    defaultInLang: '',
                    defaultOutLang: '',
                    createdAt: 0,
                    updatedAt: 0,
                },
                error: null,
            }),
        updateStack: jest
            .fn()
            .mockResolvedValue({
                data: {
                    id: 'stack-1',
                    name: 'Updated',
                    icon: '📝',
                    steps: [],
                    defaultFormat: 'PlainText',
                    defaultInLang: '',
                    defaultOutLang: '',
                    createdAt: 0,
                    updatedAt: 0,
                },
                error: null,
            }),
        listStacks: jest.fn().mockResolvedValue({ data: [], error: null }),
    },
    getLogger: () => ({ logInfo: jest.fn(), logDebug: jest.fn(), logError: jest.fn(), logWarn: jest.fn() }),
    unwrap: jest.fn((res: { data: unknown; error: unknown }) => {
        if (res.error) throw res.error;
        return res.data;
    }),
    tryUnwrap: jest.fn(),
}));

const EXISTING_STACK = {
    id: 'existing',
    name: 'My Stack',
    icon: '📝',
    steps: [],
    defaultFormat: 'PlainText',
    defaultInLang: '',
    defaultOutLang: '',
    createdAt: 0,
    updatedAt: 0,
};

interface StoreOverrides {
    steps?: string[];
    savedStacks?: object[];
    editingStackId?: string | null;
}

function makeStore(overrides: StoreOverrides = {}) {
    return configureStore({
        reducer: {
            stacksBuilder: stacksBuilderReducer,
            stacksSaved: stacksSavedReducer,
            actions: actionsReducer,
            ui: uiReducer,
            notifications: notificationsReducer,
        },
        preloadedState: {
            stacksBuilder: { steps: overrides.steps ?? ['proofread'], name: '', icon: '' },
            stacksSaved: { stacks: (overrides.savedStacks ?? []) as never, status: 'idle' as const, error: null },
            actions: { catalog: [], catalogStatus: 'idle' as const, availableModels: [], modelsStatus: 'idle' as const },
            ui: {
                layout: 'side' as const,
                sidebarCollapsed: false,
                historyOpen: false,
                inferenceRunning: false,
                currentView: 'main' as const,
                armedActionId: null,
                armedStackId: null,
                activeActionsTab: null,
                buildMode: true,
                editingStackId: overrides.editingStackId ?? null,
                activeSettingsTab: 0,
                theme: { mode: 'auto' as const, effective: 'light' as const },
            },
            notifications: { queue: [] },
        },
    });
}

describe('SaveStackDialog', () => {
    it('renders the dialog title when open', () => {
        render(
            <Provider store={makeStore()}>
                <SaveStackDialog open onOpenChange={jest.fn()} />
            </Provider>,
        );
        expect(screen.getByText(/save custom stack/i)).toBeInTheDocument();
    });

    it('shows a name input field', () => {
        render(
            <Provider store={makeStore()}>
                <SaveStackDialog open onOpenChange={jest.fn()} />
            </Provider>,
        );
        expect(screen.getByRole('textbox', { name: /name/i })).toBeInTheDocument();
    });

    it('Save button is disabled when name is empty', async () => {
        render(
            <Provider store={makeStore()}>
                <SaveStackDialog open onOpenChange={jest.fn()} />
            </Provider>,
        );
        const nameInput = screen.getByRole('textbox', { name: /name/i });
        await userEvent.clear(nameInput);
        expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled();
    });

    it('Save button is disabled when name is a duplicate', async () => {
        render(
            <Provider store={makeStore({ savedStacks: [EXISTING_STACK] })}>
                <SaveStackDialog open onOpenChange={jest.fn()} />
            </Provider>,
        );
        const nameInput = screen.getByRole('textbox', { name: /name/i });
        await userEvent.clear(nameInput);
        await userEvent.type(nameInput, 'My Stack');
        expect(screen.getByRole('button', { name: /^save$/i })).toBeDisabled();
    });

    it('shows a duplicate-name validation message', async () => {
        render(
            <Provider store={makeStore({ savedStacks: [EXISTING_STACK] })}>
                <SaveStackDialog open onOpenChange={jest.fn()} />
            </Provider>,
        );
        const nameInput = screen.getByRole('textbox', { name: /name/i });
        await userEvent.clear(nameInput);
        await userEvent.type(nameInput, 'My Stack');
        expect(screen.getByText(/name already exists/i)).toBeInTheDocument();
    });

    it('Save button is enabled with a valid unique name', async () => {
        render(
            <Provider store={makeStore()}>
                <SaveStackDialog open onOpenChange={jest.fn()} />
            </Provider>,
        );
        const nameInput = screen.getByRole('textbox', { name: /name/i });
        await userEvent.clear(nameInput);
        await userEvent.type(nameInput, 'New Stack');
        expect(screen.getByRole('button', { name: /^save$/i })).toBeEnabled();
    });

    it('Cancel button calls onOpenChange(false)', async () => {
        const onOpenChange = jest.fn();
        render(
            <Provider store={makeStore()}>
                <SaveStackDialog open onOpenChange={onOpenChange} />
            </Provider>,
        );
        await userEvent.click(screen.getByRole('button', { name: /^cancel$/i }));
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('shows step count summary', () => {
        render(
            <Provider store={makeStore({ steps: ['proofread'] })}>
                <SaveStackDialog open onOpenChange={jest.fn()} />
            </Provider>,
        );
        expect(screen.getByText(/1 step/i)).toBeInTheDocument();
    });

    it('shows the emoji picker grid buttons', () => {
        render(
            <Provider store={makeStore()}>
                <SaveStackDialog open onOpenChange={jest.fn()} />
            </Provider>,
        );
        expect(screen.getAllByRole('button', { name: /icon/i }).length).toBeGreaterThan(0);
    });

    it('updates the builder icon when a grid emoji is selected', async () => {
        // Arrange
        const store = makeStore();
        render(
            <Provider store={store}>
                <SaveStackDialog open onOpenChange={jest.fn()} />
            </Provider>,
        );

        // Act
        await userEvent.click(screen.getByRole('button', { name: 'Icon 🚀' }));

        // Assert
        expect(selectBuilderIcon(store.getState() as Parameters<typeof selectBuilderIcon>[0])).toBe('🚀');
    });

    it('updates the builder icon when an arbitrary emoji is entered in the free-text field', () => {
        // Arrange
        const store = makeStore();
        render(
            <Provider store={store}>
                <SaveStackDialog open onOpenChange={jest.fn()} />
            </Provider>,
        );
        const iconField = screen.getByPlaceholderText(/emoji/i);

        // Act: the field is pre-filled to its maxLength, so replace the value outright.
        fireEvent.change(iconField, { target: { value: '🦄' } });

        // Assert
        expect(selectBuilderIcon(store.getState() as Parameters<typeof selectBuilderIcon>[0])).toBe('🦄');
    });

    it('icon value is displayed only in the input field, not in a separate preview element', () => {
        render(
            <Provider store={makeStore()}>
                <SaveStackDialog open onOpenChange={jest.fn()} />
            </Provider>,
        );
        // Exactly 2 text inputs: name and icon — no extra display element
        expect(screen.getAllByRole('textbox')).toHaveLength(2);
        expect(screen.getByRole('textbox', { name: /selected icon/i })).toBeInTheDocument();
    });

    it('renders the hint label for copy-paste', () => {
        render(
            <Provider store={makeStore()}>
                <SaveStackDialog open onOpenChange={jest.fn()} />
            </Provider>,
        );
        expect(screen.getByText(/copy any emoji from the internet/i)).toBeInTheDocument();
    });

    it('renders the Paste button', () => {
        render(
            <Provider store={makeStore()}>
                <SaveStackDialog open onOpenChange={jest.fn()} />
            </Provider>,
        );
        expect(screen.getByRole('button', { name: /^paste$/i })).toBeInTheDocument();
    });

    describe('Paste button clipboard integration', () => {
        afterEach(() => {
            Object.defineProperty(navigator, 'clipboard', {
                value: undefined,
                configurable: true,
                writable: true,
            });
        });

        it('reads clipboard and updates the icon', async () => {
            // Arrange
            Object.defineProperty(navigator, 'clipboard', {
                value: { readText: jest.fn().mockResolvedValue('🎉') },
                configurable: true,
                writable: true,
            });
            const store = makeStore();
            render(
                <Provider store={store}>
                    <SaveStackDialog open onOpenChange={jest.fn()} />
                </Provider>,
            );

            // Act
            await userEvent.click(screen.getByRole('button', { name: /^paste$/i }));

            // Assert
            expect(selectBuilderIcon(store.getState() as Parameters<typeof selectBuilderIcon>[0])).toBe('🎉');
        });

        it('handles clipboard permission error gracefully', async () => {
            // Arrange
            Object.defineProperty(navigator, 'clipboard', {
                value: { readText: jest.fn().mockRejectedValue(new DOMException('NotAllowedError', 'NotAllowedError')) },
                configurable: true,
                writable: true,
            });
            const store = makeStore();
            render(
                <Provider store={store}>
                    <SaveStackDialog open onOpenChange={jest.fn()} />
                </Provider>,
            );
            const initialIcon = selectBuilderIcon(store.getState() as Parameters<typeof selectBuilderIcon>[0]);

            // Act — must not throw
            await userEvent.click(screen.getByRole('button', { name: /^paste$/i }));

            // Assert — icon is unchanged
            expect(selectBuilderIcon(store.getState() as Parameters<typeof selectBuilderIcon>[0])).toBe(initialIcon);
        });
    });
});
