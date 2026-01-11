/**
 * Error type discriminator for parsed errors
 */
export type ParsedErrorType =
    | 'NullError'
    | 'UndefinedError'
    | 'Error'
    | 'StringError'
    | 'ObjectError'
    | 'NumberError'
    | 'BooleanError'
    | 'SymbolError'
    | 'FunctionError'
    | 'BigIntError'
    | 'UnknownError';

/**
 * Formats backend error messages by splitting on colons and joining with newlines
 *
 * Backend errors often contain multiple levels of wrapping separated by colons,
 * making them difficult to read. This function improves readability by converting
 * them to a multi-line format.
 *
 * @param message - The error message to format
 * @returns Formatted message with better readability for backend errors
 */
function formatBackendError(message: string): string {
    // Check if this looks like a backend error (contains colons)
    if (message.includes(':')) {
        // Split by colons, trim whitespace, and filter out empty segments
        const parts = message
            .split(':')
            .map((part) => part.trim())
            .filter((part) => part.length > 0);

        // If we have multiple parts, join with newlines
        if (parts.length > 1) {
            return parts.join('. ');
        }
    }
    return message;
}

/**
 * Parsed error result with structured error information
 */
export interface ParsedErrorResult {
    type: ParsedErrorType;
    message: string;
    originalError?: unknown;
    timestamp: Date;
}

/**
 * Parses unknown errors into structured error information
 *
 * Handles all JavaScript types with comprehensive error type discrimination.
 * Provides consistent error structure regardless of input type.
 *
 * Error Handling Strategy:
 * - Null/Undefined: Creates specific error types for missing values
 * - Error objects: Extracts name and message properties
 * - String errors: Wraps in StringError type
 * - Object errors: Attempts JSON serialization with fallback
 * - Primitive types: Converts to string with type-specific error types
 *
 * @param error - The unknown error to parse
 * @param includeOriginal - Whether to include the original error (default: false)
 * @returns ParsedErrorResult with consistent error structure
 */
export function parseError(error: unknown, includeOriginal: boolean = false): ParsedErrorResult {
    const timestamp = new Date();
    let errorType: ParsedErrorType = 'UnknownError';
    let errorMessage: string;

    if (error === null) {
        errorType = 'NullError';
        errorMessage = 'Received null value';
    } else if (error === undefined) {
        errorType = 'UndefinedError';
        errorMessage = 'Received undefined value';
    } else if (error instanceof Error) {
        errorType = (error.name as ParsedErrorType) || 'Error';
        errorMessage = formatBackendError(error.message || 'No error message available');
    } else if (typeof error === 'string') {
        errorType = 'StringError';
        errorMessage = formatBackendError(error);
    } else if (typeof error === 'object') {
        const errObj = error as Record<string, unknown>;

        // If the object contains relevant name or message properties, extract them
        if ('name' in errObj || 'message' in errObj) {
            errorType = typeof errObj.name === 'string' && errObj.name.length > 0 ? (String(errObj.name) as ParsedErrorType) : 'ObjectError';

            try {
                errorMessage = typeof errObj.message === 'string' ? formatBackendError(errObj.message) : JSON.stringify(error);
            } catch {
                errorMessage = 'Failed to serialize error object';
            }
        } else {
            // For plain objects without name/message properties
            try {
                errorType = 'ObjectError';
                errorMessage = JSON.stringify(error);
            } catch {
                errorMessage = 'Failed to serialize error object';
            }
        }
    } else {
        // Handle primitive types: number, boolean, symbol, function, bigint
        const typeName = typeof error;
        errorType = `${typeName.charAt(0).toUpperCase() + typeName.slice(1)}Error` as ParsedErrorType;

        try {
            errorMessage = String(error);
        } catch {
            errorMessage = `Failed to convert ${typeName} to string`;
        }
    }

    const result: ParsedErrorResult = { type: errorType, message: errorMessage, timestamp };

    if (includeOriginal) {
        result.originalError = error;
    }

    return result;
}
