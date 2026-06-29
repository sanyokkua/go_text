import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Provider } from 'react-redux';
import { selectAboutSection } from '../../../../logic/store';
import aboutReducer from '../../../../logic/store/about/slice';
import actionsReducer from '../../../../logic/store/actions/slice';
import InfoView from './InfoView';

jest.mock('../../../../logic/adapter', () => ({
    getLogger: () => ({ logInfo: jest.fn(), logError: jest.fn(), logDebug: jest.fn(), logWarn: jest.fn() }),
    ActionHandlerAdapter: { previewPrompt: jest.fn().mockResolvedValue({ data: null }) },
    unwrap: jest.fn((r: unknown) => (r as { data: unknown } | undefined)?.data),
}));

jest.mock('./CatalogList', () => ({ __esModule: true, default: () => <input aria-label="Filter actions and stacks" /> }));

jest.mock('./PromptInspector', () => ({ __esModule: true, default: () => <div data-testid="prompt-inspector" /> }));

function makeStore() {
    return configureStore({ reducer: { about: aboutReducer, actions: actionsReducer } });
}

describe('InfoView', () => {
    it('renders the app title in the header', () => {
        render(
            <Provider store={makeStore()}>
                <InfoView />
            </Provider>,
        );
        expect(screen.getByRole('heading', { name: /GoText/i })).toBeInTheDocument();
    });

    it('shows Guide tab content by default', () => {
        render(
            <Provider store={makeStore()}>
                <InfoView />
            </Provider>,
        );
        expect(screen.getByText(/Quick Start/i)).toBeInTheDocument();
    });

    it('switches to Actions & Stacks tab when clicked', async () => {
        render(
            <Provider store={makeStore()}>
                <InfoView />
            </Provider>,
        );
        await userEvent.click(screen.getByRole('tab', { name: /Actions & Stacks/i }));
        expect(screen.getByRole('textbox', { name: /filter/i })).toBeInTheDocument();
    });

    it('persists the active section in Redux when tab changes', async () => {
        const store = makeStore();
        render(
            <Provider store={store}>
                <InfoView />
            </Provider>,
        );
        await userEvent.click(screen.getByRole('tab', { name: /Actions & Stacks/i }));
        expect(selectAboutSection(store.getState() as Parameters<typeof selectAboutSection>[0])).toBe('actions-stacks');
    });
});
