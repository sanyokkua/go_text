// frontend/src/ui/widgets/base/__tests__/NotificationContainer.test.tsx
import { configureStore } from '@reduxjs/toolkit';
import '@testing-library/jest-dom';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { axe } from 'jest-axe';
import { Provider } from 'react-redux';
import notificationsReducer, { enqueueNotification } from '../../../../logic/store/notifications/slice';
import NotificationContainer from '../NotificationContainer';

function makeStore() {
    return configureStore({ reducer: { notifications: notificationsReducer } });
}

function renderWithStore(store = makeStore()) {
    return {
        store,
        ...render(
            <Provider store={store}>
                <NotificationContainer />
            </Provider>,
        ),
    };
}

describe('NotificationContainer', () => {
    it('has no accessibility violations with a toast in the queue', async () => {
        const store = makeStore();
        store.dispatch(enqueueNotification({ severity: 'error', surface: 'toast', title: 'Auth failed', message: 'Check your key.' }));
        const { container } = renderWithStore(store);
        expect(await axe(container)).toHaveNoViolations();
    });

    it('renders title and message for a toast notification', () => {
        const store = makeStore();
        store.dispatch(enqueueNotification({ severity: 'error', surface: 'toast', title: 'Auth failed', message: 'Check your key.' }));
        renderWithStore(store);
        expect(screen.getByText('Auth failed')).toBeInTheDocument();
        expect(screen.getByText('Check your key.')).toBeInTheDocument();
    });

    it('renders nothing when the queue is empty', () => {
        renderWithStore();
        expect(screen.queryByRole('button', { name: 'Dismiss notification' })).not.toBeInTheDocument();
    });

    it('does not render inline-surface notifications as toasts', () => {
        const store = makeStore();
        store.dispatch(enqueueNotification({ severity: 'error', surface: 'inline', title: 'Invalid field', message: 'Must be positive.' }));
        renderWithStore(store);
        expect(screen.queryByText('Invalid field')).not.toBeInTheDocument();
    });

    it('dispatches removeNotification when dismiss button is clicked', async () => {
        const store = makeStore();
        store.dispatch(enqueueNotification({ severity: 'warning', surface: 'toast', title: 'Already running', message: 'Wait for it to finish.' }));
        const { store: s } = renderWithStore(store);
        await userEvent.click(screen.getByRole('button', { name: 'Dismiss notification' }));
        expect(s.getState().notifications.queue).toHaveLength(0);
    });

    it('renders a warning (busy) toast with correct text', () => {
        const store = makeStore();
        store.dispatch(
            enqueueNotification({
                severity: 'warning',
                surface: 'toast',
                title: 'Already running',
                message: 'An inference is already running — wait for it to finish before starting another.',
            }),
        );
        renderWithStore(store);
        expect(screen.getByText('Already running')).toBeInTheDocument();
        expect(screen.getByText(/wait for it to finish/i)).toBeInTheDocument();
    });

    it('renders an info toast for cancelled run', () => {
        const store = makeStore();
        store.dispatch(enqueueNotification({ severity: 'info', surface: 'toast', title: 'Cancelled', message: 'Run cancelled after step 2.' }));
        renderWithStore(store);
        expect(screen.getByText('Cancelled')).toBeInTheDocument();
        expect(screen.getByText('Run cancelled after step 2.')).toBeInTheDocument();
    });
});
