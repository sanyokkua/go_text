import React, { useState } from 'react';
import { Color, Size } from '../../../logic/common/types';

export interface SelectItem {
    itemId: string;
    displayText: string;
}

interface SelectProps {
    items: SelectItem[];
    selectedItem: string | SelectItem;
    onSelect: (selectItem: SelectItem) => void;

    size?: Size;
    colorStyle?: Color;
    disabled?: boolean;
    block?: boolean;
    id?: string;
    useFilter?: boolean;
}

const Select: React.FC<SelectProps> = ({
    id,
    items,
    selectedItem,
    onSelect,
    size = 'default',
    colorStyle = '',
    disabled = false,
    block = false,
    useFilter = false,
}) => {
    const [filterText, setFilterText] = useState('');

    const handleChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
        const itemId = e.target.value;
        const foundItem = items.find((it) => it.itemId === itemId);
        if (!foundItem) {
            throw Error(`Could not find item: ${itemId}`);
        }
        onSelect(foundItem);
    };

    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        setFilterText(e.target.value);
    };

    const selectedItemId: string = typeof selectedItem === 'string' ? selectedItem : selectedItem.itemId;

    // Filter items case-insensitively when useFilter is true
    const filteredItems = useFilter ? items.filter((item) => item.displayText.toLowerCase().includes(filterText.toLowerCase())) : items;

    if (useFilter && filterText && filterText.length > 0 && filteredItems.length > 0) {
        onSelect(filteredItems[0]);
    }

    const classes = [
        'select-base',
        size !== 'default' && `select-${size}`,
        disabled && 'select-disabled',
        colorStyle && `color-${colorStyle}`,
        block && 'select-block',
    ]
        .filter(Boolean)
        .join(' ');

    return (
        <>
            {useFilter && <input type="text" value={filterText} onChange={handleFilterChange} placeholder="Filter items..." disabled={disabled} />}
            <select id={id} value={selectedItemId} onChange={handleChange} className={classes} disabled={disabled}>
                {filteredItems.map((item) => (
                    <option key={item.itemId} value={item.itemId}>
                        {item.displayText}
                    </option>
                ))}
                {useFilter && filteredItems.length === 0 && (
                    <option value="" disabled>
                        No items found
                    </option>
                )}
            </select>
        </>
    );
};

Select.displayName = 'Select';
export default Select;
