import React from 'react';

import { useAppDispatch, useAppSelector } from '../../../logic/store';
import { selectCurrentProvider, selectProviderItems } from '../../../logic/store/settings/selectors';
import { setAsCurrentProviderConfig } from '../../../logic/store/settings/thunks';
import { Select } from '../../primitives/Select';

const ProviderPicker: React.FC = () => {
    const dispatch = useAppDispatch();
    const currentProvider = useAppSelector(selectCurrentProvider);
    const providerItems = useAppSelector(selectProviderItems);

    if (providerItems.length === 0 || !currentProvider) {
        return null;
    }

    // The active provider pill carries the teal accent treatment (mockup .sel.accent)
    // so the toolbar signals which provider is live without a separate status dot.
    return (
        <Select
            value={currentProvider.providerId}
            onValueChange={(id) => void dispatch(setAsCurrentProviderConfig(id))}
            items={providerItems}
            keyLabel="Provider"
            accent
        />
    );
};

ProviderPicker.displayName = 'ProviderPicker';
export default ProviderPicker;
