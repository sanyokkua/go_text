// frontend/src/ui/primitives/CommandPalette.tsx
import { Command } from 'cmdk';
import * as React from 'react';
import { Dialog } from 'radix-ui';
import styles from './CommandPalette.module.css';

export interface CommandPaletteItem {
    value: string;
    label: string;
    group?: string;
}

export interface CommandPaletteProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    items: CommandPaletteItem[];
    placeholder?: string;
    onSelect: (value: string) => void;
    onShiftSelect?: (value: string) => void;
    disabled?: boolean;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({
    open,
    onOpenChange,
    items,
    placeholder = 'Type a command…',
    onSelect,
    onShiftSelect,
    disabled = false,
}) => {
    const [highlighted, setHighlighted] = React.useState('');

    const groups = React.useMemo(() => {
        const map = new Map<string, CommandPaletteItem[]>();
        items.forEach((item) => {
            const g = item.group ?? '';
            if (!map.has(g)) map.set(g, []);
            map.get(g)!.push(item);
        });
        return map;
    }, [items]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (disabled) return;
        if (e.key === 'Enter' && e.shiftKey && onShiftSelect && highlighted) {
            e.preventDefault();
            onShiftSelect(highlighted);
            onOpenChange(false);
        }
    };

    const handleSelect = (value: string) => {
        if (disabled) return;
        onSelect(value);
        onOpenChange(false);
    };

    return (
        <Dialog.Root open={open} onOpenChange={onOpenChange}>
            <Dialog.Portal>
                <Dialog.Overlay className={styles.overlay} />
                <Dialog.Content
                    className={styles.content}
                    aria-label="Command palette"
                    aria-disabled={disabled || undefined}
                >
                    <Command
                        className={styles.command}
                        value={highlighted}
                        onValueChange={setHighlighted}
                        onKeyDown={handleKeyDown}
                    >
                        <div className={styles.searchRow}>
                            <span className={styles.searchIcon} aria-hidden>⌕</span>
                            <Command.Input
                                placeholder={placeholder}
                                className={styles.input}
                                aria-label="Search commands"
                                disabled={disabled}
                            />
                            <span className={styles.escBadge}>esc</span>
                        </div>

                        <Command.List className={styles.list}>
                            <Command.Empty className={styles.empty}>No results.</Command.Empty>
                            {Array.from(groups.entries()).map(([group, groupItems]) => (
                                <Command.Group
                                    key={group || '__default__'}
                                    heading={group || undefined}
                                    className={styles.group}
                                >
                                    {groupItems.map((item) => (
                                        <Command.Item
                                            key={item.value}
                                            value={item.value}
                                            onSelect={() => handleSelect(item.value)}
                                            className={styles.item}
                                            aria-disabled={disabled || undefined}
                                        >
                                            <span className={styles.itemLabel}>{item.label}</span>
                                            <span className={styles.enterHint} aria-hidden>↵</span>
                                        </Command.Item>
                                    ))}
                                </Command.Group>
                            ))}
                        </Command.List>

                        <div className={styles.footer}>
                            {disabled ? (
                                <span>Inference in progress…</span>
                            ) : (
                                <>
                                    <span>↑↓ navigate</span>
                                    <span>↵ run</span>
                                    <span>⇧↵ add to stack</span>
                                </>
                            )}
                        </div>
                    </Command>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
};

CommandPalette.displayName = 'CommandPalette';
