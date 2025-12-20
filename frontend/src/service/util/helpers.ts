import { v4 as uuidv4 } from 'uuid';

/**
 * Generates a unique button ID with timestamp prefix
 * Format: {timestamp}-{uuid}
 *
 * @returns Unique button ID string
 */
export function generateUniqueId(): string {
    const timePrefix = new Date().getUTCMilliseconds().toString();
    const uniqueId = uuidv4();
    return `${timePrefix}-${uniqueId}`;
}

/**
 * Generates a unique ID with custom prefix
 *
 * @param prefix - Custom prefix for the ID
 * @returns Unique ID with custom prefix
 */
export function generatePrefixedId(prefix: string): string {
    if (!prefix || prefix.trim() === '') {
        throw new Error('Prefix cannot be empty');
    }
    return `${prefix.trim()}-${uuidv4()}`;
}

/**
 * Generates a timestamp-based ID
 * Useful for sorting or ordering operations
 *
 * @returns Timestamp-based ID string
 */
export function generateTimestampId(): string {
    return Date.now().toString();
}

/**
 * Generates a short random ID (8 characters)
 * Useful for temporary IDs or non-critical identifiers
 *
 * @returns Short random ID string
 */
export function generateShortId(): string {
    return uuidv4().substring(0, 8);
}

/**
 * Validates if a string is a valid UUID v4
 *
 * @param id - String to validate
 * @returns true if the string is a valid UUID v4
 */
export function isValidUuid(id: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(id);
}

/**
 * Extracts UUID from a prefixed ID
 *
 * @param prefixedId - ID with prefix (e.g., "btn-550e8400-e29b-41d4-a716-446655440000")
 * @returns Extracted UUID or null if not found
 */
export function extractUuidFromPrefixedId(prefixedId: string): string | null {
    if (!prefixedId) {
        return null;
    }

    // Split by last dash to handle complex prefixes
    const parts = prefixedId.split('-');
    if (parts.length < 5) {
        return null;
    }

    // Reconstruct potential UUID from last 5 parts
    const potentialUuid = parts.slice(-5).join('-');

    return isValidUuid(potentialUuid) ? potentialUuid : null;
}
