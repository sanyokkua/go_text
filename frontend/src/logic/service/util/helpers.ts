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
 * Generates a short random ID (8 characters)
 * Useful for temporary IDs or non-critical identifiers
 *
 * @returns Short random ID string
 */
export function generateShortId(): string {
    return uuidv4().substring(0, 8);
}