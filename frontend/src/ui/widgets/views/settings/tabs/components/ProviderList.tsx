import React from 'react';

import { ProviderConfig } from '../../../../../../logic/adapter/models';

interface ProviderListProps {
    providers: ProviderConfig[];
    currentId: string;
    selectedId: string | null;
    onSelect: (id: string) => void;
    onNew: () => void;
}

const ProviderList: React.FC<ProviderListProps> = ({ providers, currentId, selectedId, onSelect, onNew }) => (
    <nav
        aria-label="Provider list"
        style={{
            width: '178px',
            flexShrink: 0,
            height: '100%',
            borderRight: '1px solid var(--line)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
        }}
    >
        <div style={{ padding: 'var(--space-2)' }}>
            <button
                type="button"
                onClick={onNew}
                aria-label="New provider"
                style={{
                    width: '100%',
                    padding: 'var(--space-2) var(--space-3)',
                    border: '1px solid var(--teal)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'transparent',
                    color: 'var(--teal)',
                    cursor: 'pointer',
                    fontSize: '0.8125rem',
                    fontFamily: 'var(--font)',
                    fontWeight: 500,
                    textAlign: 'center',
                }}
            >
                + New provider
            </button>
        </div>

        <ul
            role="listbox"
            aria-label="Providers"
            style={{
                flex: 1,
                overflowY: 'auto',
                margin: 0,
                padding: 0,
                listStyle: 'none',
            }}
        >
            {providers.length === 0 ? (
                <li
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        height: '100%',
                        color: 'var(--ink-3)',
                        fontSize: '0.8125rem',
                        padding: 'var(--space-4)',
                        textAlign: 'center',
                    }}
                >
                    (no providers)
                </li>
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
                                style={{
                                    width: '100%',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-1)',
                                    padding: 'var(--space-2) var(--space-3)',
                                    borderLeft: `3px solid ${isSelected ? 'var(--teal)' : 'transparent'}`,
                                    background: isSelected ? 'var(--surface-2)' : 'transparent',
                                    border: 'none',
                                    borderLeftWidth: '3px',
                                    borderLeftStyle: 'solid',
                                    borderLeftColor: isSelected ? 'var(--teal)' : 'transparent',
                                    cursor: 'pointer',
                                    textAlign: 'left',
                                    fontSize: '0.8125rem',
                                    fontFamily: 'var(--font)',
                                    color: 'var(--ink)',
                                    flexWrap: 'wrap',
                                }}
                            >
                                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {provider.providerName}
                                </span>

                                {isCurrent && (
                                    <span
                                        aria-label="current provider"
                                        style={{
                                            fontSize: '0.65rem',
                                            background: 'rgba(0, 150, 136, 0.15)',
                                            border: '1px solid var(--teal)',
                                            color: 'var(--teal)',
                                            borderRadius: '999px',
                                            padding: '1px 5px',
                                            marginLeft: 'var(--space-1)',
                                            flexShrink: 0,
                                            lineHeight: 1.4,
                                        }}
                                    >
                                        current
                                    </span>
                                )}
                            </button>
                        </li>
                    );
                })
            )}
        </ul>
    </nav>
);

ProviderList.displayName = 'ProviderList';
export default ProviderList;
