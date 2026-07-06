// Heavy shell sub-components are mocked to keep these tests focused on ⌘K palette wiring.
// AppBar and MainContent pull in many sub-trees irrelevant to this feature.
jest.mock('../base/AppBar', () => {
    const React = require('react');
    const MockAppBar: React.FC = () => React.createElement('div', { 'data-testid': 'app-bar' });
    MockAppBar.displayName = 'MockAppBar';
    return { __esModule: true, default: MockAppBar };
});
jest.mock('./MainContent', () => {
    const React = require('react');
    const MockMainContent: React.FC = () => React.createElement('div', { 'data-testid': 'main-content' });
    MockMainContent.displayName = 'MockMainContent';
    return { __esModule: true, default: MockMainContent };
});

import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import aboutReducer from '../../../logic/store/about/slice';
import actionsReducer from '../../../logic/store/actions/slice';
import editorReducer from '../../../logic/store/editor/slice';
import historyReducer from '../../../logic/store/history/slice';
import notificationsReducer from '../../../logic/store/notifications/slice';
import runReducer from '../../../logic/store/run/slice';
import settingsReducer from '../../../logic/store/settings/slice';
import stacksBuilderReducer from '../../../logic/store/stacks/builder/slice';
import stacksSavedReducer from '../../../logic/store/stacks/saved/slice';
import uiReducer from '../../../logic/store/ui/slice';
import AppMainView from './AppMainView';

const MOCK_SUMMARISE_ACTION = {
    id: 'act-1',
    name: 'Summarise',
    category: 'Writing',
    family: 'single',
    directive: '',
    orderRank: 0,
    exclusivityGroup: '',
    mergeable: false,
    terminal: true,
    requires: [],
};

// Mock adapter so no real Wails calls go out.
// getActionCatalog returns Summarise so the init thunk does not wipe the preloaded catalog.
// NOTE: jest.mock is hoisted above variable declarations, so the action object is inlined here.
jest.mock('../../../logic/adapter', () => ({
    getLogger: () => ({
        logInfo: jest.fn(),
        logError: jest.fn(),
        logDebug: jest.fn(),
        logWarn: jest.fn(),
        logWarning: jest.fn(),
        logTrace: jest.fn(),
        logPrint: jest.fn(),
        logFatal: jest.fn(),
    }),
    ActionHandlerAdapter: {
        processPromptChain: jest.fn().mockResolvedValue({ data: { steps: [], finalText: '' }, error: undefined }),
        getActionCatalog: jest
            .fn()
            .mockResolvedValue({
                data: [
                    {
                        id: 'act-1',
                        name: 'Summarise',
                        category: 'Writing',
                        family: 'single',
                        directive: '',
                        orderRank: 0,
                        exclusivityGroup: '',
                        mergeable: false,
                        terminal: true,
                        requires: [],
                    },
                ],
                error: undefined,
            }),
        cancelChain: jest.fn().mockResolvedValue({ data: undefined, error: undefined }),
        cancelAllRuns: jest.fn().mockResolvedValue(undefined),
    },
    SettingsHandlerAdapter: {
        getAppSettingsMetadata: jest.fn().mockResolvedValue({ data: null, error: undefined }),
        getSettings: jest.fn().mockResolvedValue({ data: null, error: undefined }),
    },
    StackHandlerAdapter: { listStacks: jest.fn().mockResolvedValue({ data: [], error: undefined }) },
    ClipboardServiceAdapter: { getText: jest.fn().mockResolvedValue(''), setText: jest.fn().mockResolvedValue(true) },
    HistoryHandlerAdapter: { listHistory: jest.fn().mockResolvedValue({ data: { entries: [], hasMore: false }, error: undefined }) },
    unwrap: jest.fn((r: { data?: unknown }) => r?.data),
    tryUnwrap: jest.fn((r: unknown) => r),
}));

jest.mock('../../../logic/store/run/thunks', () => {
    const actual = jest.requireActual('../../../logic/store/run/thunks');
    return { ...actual, runSingleAction: jest.fn(() => ({ type: 'run/runSingleAction/pending', unwrap: () => Promise.resolve() })) };
});

function buildStore() {
    return configureStore({
        reducer: {
            ui: uiReducer,
            about: aboutReducer,
            actions: actionsReducer,
            stacksBuilder: stacksBuilderReducer,
            stacksSaved: stacksSavedReducer,
            settings: settingsReducer,
            editor: editorReducer,
            run: runReducer,
            history: historyReducer,
            notifications: notificationsReducer,
        },
        preloadedState: {
            actions: { catalog: [MOCK_SUMMARISE_ACTION], catalogStatus: 'success' as const, availableModels: [], modelsStatus: 'idle' as const },
        },
    });
}

describe('AppMainView ⌘K palette', () => {
    it('opens CommandPalette when ⌘K is pressed', async () => {
        render(
            <Provider store={buildStore()}>
                <AppMainView />
            </Provider>,
        );

        await userEvent.keyboard('{Meta>}k{/Meta}');

        expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
    });

    it('opens CommandPalette when Ctrl+K is pressed', async () => {
        render(
            <Provider store={buildStore()}>
                <AppMainView />
            </Provider>,
        );

        await userEvent.keyboard('{Control>}k{/Control}');

        expect(screen.getByRole('dialog', { name: 'Command palette' })).toBeInTheDocument();
    });

    it('lists action names in the palette', async () => {
        render(
            <Provider store={buildStore()}>
                <AppMainView />
            </Provider>,
        );

        await userEvent.keyboard('{Meta>}k{/Meta}');

        expect(screen.getByText('Summarise')).toBeInTheDocument();
    });
});
