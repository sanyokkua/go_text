import '@testing-library/jest-dom';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { ProviderConfig } from '../../../../../../../logic/adapter/models';
import ProviderList from '../ProviderList';

function buildProvider(overrides: Partial<ProviderConfig> & Pick<ProviderConfig, 'providerId' | 'providerName'>): ProviderConfig {
    return {
        providerType: 'openai',
        baseUrl: 'http://localhost:1234',
        modelsEndpoint: '',
        completionEndpoint: '',
        authType: 'api-key',
        authToken: '',
        useAuthTokenFromEnv: true,
        envVarTokenName: '',
        apiVersion: '',
        selectedModel: '',
        useCustomHeaders: false,
        headers: {},
        useCustomModels: false,
        customModels: [],
        ...overrides,
    };
}

const PROVIDER_ONE = buildProvider({ providerId: 'p1', providerName: 'Provider One' });
const PROVIDER_TWO = buildProvider({ providerId: 'p2', providerName: 'Provider Two' });

interface RenderOverrides {
    providers?: ProviderConfig[];
    currentId?: string;
    selectedId?: string | null;
    onSelect?: (id: string) => void;
    onNew?: () => void;
}

function renderList(overrides: RenderOverrides = {}) {
    const onSelect = overrides.onSelect ?? jest.fn();
    const onNew = overrides.onNew ?? jest.fn();
    render(
        <ProviderList
            providers={overrides.providers ?? [PROVIDER_ONE, PROVIDER_TWO]}
            currentId={overrides.currentId ?? ''}
            selectedId={overrides.selectedId ?? null}
            onSelect={onSelect}
            onNew={onNew}
        />,
    );
    return { onSelect, onNew };
}

describe('ProviderList', () => {
    it('renders an empty-state message and no options when there are no providers', () => {
        renderList({ providers: [] });

        expect(screen.getByText('(no providers)')).toBeInTheDocument();
        expect(screen.queryAllByRole('option')).toHaveLength(0);
    });

    it('renders each provider as a listbox option with a button matching its name', () => {
        renderList();

        expect(screen.getByRole('listbox', { name: 'Providers' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Provider One' })).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Provider Two' })).toBeInTheDocument();
        expect(screen.getAllByRole('option')).toHaveLength(2);
    });

    it('marks only the option matching selectedId as selected', () => {
        renderList({ selectedId: 'p2' });

        const optionOne = screen.getByRole('button', { name: 'Provider One' }).closest('li');
        const optionTwo = screen.getByRole('button', { name: 'Provider Two' }).closest('li');

        expect(optionOne).toHaveAttribute('aria-selected', 'false');
        expect(optionTwo).toHaveAttribute('aria-selected', 'true');
    });

    it('shows a current-provider name suffix and badge only for the provider matching currentId', () => {
        renderList({ currentId: 'p1' });

        const currentButton = screen.getByRole('button', { name: 'Provider One (current)' });
        expect(within(currentButton).getByText('current')).toBeInTheDocument();

        const otherButton = screen.getByRole('button', { name: 'Provider Two' });
        expect(within(otherButton).queryByText('current')).not.toBeInTheDocument();
    });

    it('calls onSelect with the clicked provider id', async () => {
        const user = userEvent.setup();
        const { onSelect } = renderList();

        await user.click(screen.getByRole('button', { name: 'Provider Two' }));

        expect(onSelect).toHaveBeenCalledWith('p2');
    });

    it('calls onNew when the new-provider button is clicked', async () => {
        const user = userEvent.setup();
        const { onNew } = renderList();

        await user.click(screen.getByRole('button', { name: 'New provider' }));

        expect(onNew).toHaveBeenCalledTimes(1);
    });
});
