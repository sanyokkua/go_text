import React from 'react';

import { useAppDispatch, useAppSelector } from '../../../logic/store';
import { selectCurrentProvider, selectProviderItems } from '../../../logic/store/settings/selectors';
import { setAsCurrentProviderConfig } from '../../../logic/store/settings/thunks';
import { Select } from '../../primitives/Select';
import styles from './ProviderPicker.module.css';

const ProviderPicker: React.FC = () => {
    const dispatch = useAppDispatch();
    const currentProvider = useAppSelector(selectCurrentProvider);
    const providerItems = useAppSelector(selectProviderItems);

    if (providerItems.length === 0 || !currentProvider) {
        return null;
    }

    return (
        <div className={styles.root}>
            <Select
                value={currentProvider.providerId}
                onValueChange={(id) => void dispatch(setAsCurrentProviderConfig(id))}
                items={providerItems}
                keyLabel="Provider"
                accent
            />
        </div>
    );
};

ProviderPicker.displayName = 'ProviderPicker';
export default ProviderPicker;
