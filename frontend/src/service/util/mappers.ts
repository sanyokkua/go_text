import { KeyValuePair } from '../../common/types';
import { SelectItem } from '../../widgets/base/Select';
import { generateUniqueId } from './helpers';

/**
 * Maps a single string value to a SelectItem
 *
 * @param value - String value to map
 * @returns SelectItem with the value as both ID and display text
 */
export function stringToSelectItem(value: string): SelectItem {
    return { itemId: value, displayText: value };
}

/**
 * Maps an array of strings to SelectItems
 *
 * @param list - Array of strings to map
 * @returns Array of SelectItems
 */
export function stringsToSelectItems(list: string[]): SelectItem[] {
    return list.map(stringToSelectItem);
}

/**
 * Maps a record (object) to an array of KeyValuePair objects
 * Each key-value pair gets a unique ID and is sorted by ID
 *
 * @param record - Record to map
 * @returns Array of KeyValuePair objects
 */
export function recordToKeyValuePairs(record: Record<string, string>): KeyValuePair[] {
    const keyValuePairs: KeyValuePair[] = [];

    Object.entries(record).forEach(([key, value]) => {
        const id = generateUniqueId();
        keyValuePairs.push({ id: id, key: key, value: value });
    });

    // Sort by ID for consistent ordering
    return keyValuePairs.sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Maps an array of KeyValuePair objects back to a record (object)
 *
 * @param keyValuePairs - Array of KeyValuePair objects
 * @returns Record object
 */
export function keyValuePairsToRecord(keyValuePairs: KeyValuePair[]): Record<string, string> {
    const record: Record<string, string> = {};

    keyValuePairs.forEach((item) => {
        // Skip items with empty keys
        if (item.key && item.key.trim()) {
            record[item.key.trim()] = item.value || '';
        }
    });

    return record;
}

/**
 * Maps an array of strings to KeyValuePair objects
 * Useful for creating key-value pairs where key and value are the same
 *
 * @param values - Array of strings
 * @returns Array of KeyValuePair objects
 */
export function stringsToKeyValuePairs(values: string[]): KeyValuePair[] {
    return values.map((value) => ({ id: generateUniqueId(), key: value, value: value })).sort((a, b) => a.id.localeCompare(b.id));
}

/**
 * Maps SelectItems to a record where itemId is the key and displayText is the value
 *
 * @param selectItems - Array of SelectItems
 * @returns Record object
 */
export function selectItemsToRecord(selectItems: SelectItem[]): Record<string, string> {
    const record: Record<string, string> = {};

    selectItems.forEach((item) => {
        if (item.itemId) {
            record[item.itemId] = item.displayText || item.itemId;
        }
    });

    return record;
}

/**
 * Creates SelectItems from a record (object)
 *
 * @param record - Record to convert
 * @returns Array of SelectItems
 */
export function recordToSelectItems(record: Record<string, string>): SelectItem[] {
    return Object.entries(record).map(([itemId, displayText]) => ({ itemId, displayText }));
}
