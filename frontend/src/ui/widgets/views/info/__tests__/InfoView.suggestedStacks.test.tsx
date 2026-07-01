import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';

import { apperr } from '../../../../../../wailsjs/go/models';
import aboutReducer from '../../../../../logic/store/about/slice';
import { AboutState } from '../../../../../logic/store/about/types';
import actionsReducer from '../../../../../logic/store/actions/slice';
import InfoView from '../InfoView';

const getSuggestedStacksMock = jest.fn<Promise<apperr.SuggestedStack[]>, []>();

jest.mock('../../../../../logic/adapter', () => ({
    getLogger: () => ({ logInfo: jest.fn(), logError: jest.fn(), logDebug: jest.fn(), logWarn: jest.fn() }),
    ActionHandlerAdapter: { previewPrompt: jest.fn().mockResolvedValue({ data: null }) },
    getSuggestedStacks: () => getSuggestedStacksMock(),
    unwrap: jest.fn((r: unknown) => (r as { data: unknown } | undefined)?.data),
}));

jest.mock('../CatalogList', () => ({ __esModule: true, default: () => <input aria-label="Filter actions and stacks" /> }));

jest.mock('../PromptInspector', () => ({ __esModule: true, default: () => <div data-testid="prompt-inspector" /> }));

const FIXTURES: apperr.SuggestedStack[] = [
    { name: 'Bug report', icon: '🐛', actionIds: ['a'], actionNames: ['Proofread', 'Summarize'] },
    { name: 'Release notes', icon: '📝', actionIds: ['b'], actionNames: ['Rewrite'] },
];

function makeStore(suggestedStacks: apperr.SuggestedStack[]) {
    const aboutPreloaded: AboutState = {
        activeSection: 'guide',
        selectedItemId: null,
        selectedItemType: null,
        inspectorOpen: false,
        inspectorLoading: false,
        inspectorData: null,
        inspectorError: null,
        previewInputEnabled: false,
        suggestedStacks,
    };
    return configureStore({ reducer: { about: aboutReducer, actions: actionsReducer }, preloadedState: { about: aboutPreloaded } });
}

describe('InfoView suggested stacks', () => {
    beforeEach(() => {
        getSuggestedStacksMock.mockReset();
    });

    it('renders each suggested stack name and its action chips when the about slice is preloaded', () => {
        // Arrange
        getSuggestedStacksMock.mockResolvedValue([]);

        // Act
        render(
            <Provider store={makeStore(FIXTURES)}>
                <InfoView />
            </Provider>,
        );

        // Assert
        expect(screen.getByText('Bug report')).toBeInTheDocument();
        expect(screen.getByText('Release notes')).toBeInTheDocument();
        expect(screen.getByText('Proofread')).toBeInTheDocument();
        expect(screen.getByText('Summarize')).toBeInTheDocument();
        expect(screen.getByRole('heading', { name: /Suggested stacks/i })).toBeInTheDocument();
    });

    it('fetches suggestions on mount when none are present and renders the resolved stacks', async () => {
        // Arrange
        getSuggestedStacksMock.mockResolvedValue(FIXTURES);

        // Act
        render(
            <Provider store={makeStore([])}>
                <InfoView />
            </Provider>,
        );

        // Assert
        expect(await screen.findByText('Bug report')).toBeInTheDocument();
        expect(screen.getByText('Release notes')).toBeInTheDocument();
        expect(screen.getByText('Proofread')).toBeInTheDocument();
    });
});
