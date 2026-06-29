import React from 'react';

import { ProviderConfig } from '../../../../../../logic/adapter/models';
import styles from './ProviderList.module.css';

interface ProviderListProps {
    providers: ProviderConfig[];
    currentId: string;
    selectedId: string | null;
    onSelect: (id: string) => void;
    onNew: () => void;
}

const ProviderList: React.FC<ProviderListProps> = ({ providers, currentId, selectedId, onSelect, onNew }) => (
    <nav aria-label="Provider list" className={styles.nav}>
        <h2 className={styles.header}>Providers</h2>

        <ul role="listbox" aria-label="Providers" className={styles.list}>
            {providers.length === 0 ? (
                <li className={styles.empty}>(no providers)</li>
            ) : (
                providers.map((provider) => {
                    const isSelected = provider.providerId === selectedId;
                    const isCurrent = provider.providerId === currentId;

                    return (
                        <li key={provider.providerId} role="option" aria-selected={isSelected}>
                            <button
                                type="button"
                                onClick={() => onSelect(provider.providerId)}
                                aria-label={isCurrent ? `${provider.providerName} (current)` : provider.providerName}
                                className={styles.item}
                            >
                                <span aria-hidden="true" className={`${styles.dot} ${isCurrent ? styles.dotCurrent : ''}`}>
                                    {isCurrent ? '●' : '○'}
                                </span>
                                <span className={styles.itemName}>{provider.providerName}</span>

                                {isCurrent && (
                                    <span aria-label="current provider" className={styles.currentBadge}>
                                        current
                                    </span>
                                )}
                            </button>
                        </li>
                    );
                })
            )}
        </ul>

        <div className={styles.newBtnWrap}>
            <button
                type="button"
                onClick={onNew}
                aria-label="New provider"
                className={styles.newBtn}
            >
                + New provider
            </button>
        </div>
    </nav>
);

ProviderList.displayName = 'ProviderList';
export default ProviderList;
