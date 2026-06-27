// frontend/src/ui/primitives/Combobox.tsx
import { Command } from 'cmdk';
import { Popover } from 'radix-ui';
import * as React from 'react';
import styles from './Combobox.module.css';

export interface ComboboxItem {
    value: string;
    label: string;
    meta?: string;
}

export interface ComboboxProps {
    items: ComboboxItem[];
    value: string;
    onValueChange: (value: string) => void;
    keyLabel?: string;
    placeholder?: string;
    loading?: boolean;
    onRefresh?: () => void;
    emptyContent?: React.ReactNode;
}

export const Combobox: React.FC<ComboboxProps> = ({
    items,
    value,
    onValueChange,
    keyLabel,
    placeholder = 'Search…',
    loading,
    onRefresh,
    emptyContent,
}) => {
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState('');

    const selected = items.find((i) => i.value === value);

    return (
        <Popover.Root open={open} onOpenChange={setOpen}>
            <Popover.Trigger asChild>
                <button type="button" className={styles.trigger} aria-haspopup="listbox" aria-expanded={open}>
                    {keyLabel && <span className={styles.keyLabel}>{keyLabel}</span>}
                    <span className={styles.valueLabel}>{selected?.label ?? value}</span>
                    <span className={styles.caret} aria-hidden>
                        ▾
                    </span>
                </button>
            </Popover.Trigger>

            <Popover.Portal>
                <Popover.Content className={styles.content} align="start" sideOffset={4}>
                    <Command className={styles.command} shouldFilter>
                        <div className={styles.searchRow}>
                            <Command.Input
                                value={search}
                                onValueChange={setSearch}
                                placeholder={placeholder}
                                className={styles.input}
                                aria-label="Search"
                            />
                            {onRefresh && (
                                <button
                                    type="button"
                                    className={`${styles.refreshBtn} ${loading ? styles.spinning : ''}`}
                                    onClick={onRefresh}
                                    aria-label="Refresh list"
                                >
                                    ⟳
                                </button>
                            )}
                        </div>

                        <Command.List className={styles.list}>
                            <Command.Empty className={styles.empty}>{emptyContent ?? 'No results.'}</Command.Empty>
                            {items.map((item) => (
                                <Command.Item
                                    key={item.value}
                                    value={item.label}
                                    onSelect={() => {
                                        onValueChange(item.value);
                                        setSearch('');
                                        setOpen(false);
                                    }}
                                    className={styles.item}
                                >
                                    {item.value === value && (
                                        <span className={styles.check} aria-hidden>
                                            ✓
                                        </span>
                                    )}
                                    <span className={styles.itemLabel}>{item.label}</span>
                                    {item.meta && <span className={styles.meta}>{item.meta}</span>}
                                </Command.Item>
                            ))}
                        </Command.List>

                        <div className={styles.footer}>
                            {items.length} model{items.length !== 1 ? 's' : ''}
                        </div>
                    </Command>
                </Popover.Content>
            </Popover.Portal>
        </Popover.Root>
    );
};

Combobox.displayName = 'Combobox';
