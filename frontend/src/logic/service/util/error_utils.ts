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
 * Handles all JavaScript types and provides detailed error information
 *
 * @param error - The unknown error to parse
 * @param includeOriginal - Whether to include the original error in the result (default: false)
 * @returns ParsedErrorResult with structured error information
 */
export function parseError(error: unknown, includeOriginal: boolean = false): ParsedErrorResult {
    const timestamp = new Date();
    let errorType: ParsedErrorType = 'UnknownError';
    let errorMessage: string = 'Unknown error occurred';

    if (error === null) {
        errorType = 'NullError';
        errorMessage = 'Received null value';
    } else if (error === undefined) {
        errorType = 'UndefinedError';
        errorMessage = 'Received undefined value';
    } else if (error instanceof Error) {
        errorType = (error.name as ParsedErrorType) || 'Error';
        errorMessage = error.message || 'No error message available';
    } else if (typeof error === 'string') {
        errorType = 'StringError';
        errorMessage = error;
    } else if (typeof error === 'object') {
        const errObj = error as Record<string, unknown>;

        // If the object contains relevant name or message properties, extract them
        if ('name' in errObj || 'message' in errObj) {
            errorType = typeof errObj.name === 'string' && errObj.name.length > 0 ? (String(errObj.name) as ParsedErrorType) : 'ObjectError';

            try {
                errorMessage = typeof errObj.message === 'string' ? errObj.message : JSON.stringify(error);
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

/**
 * Formats a parsed error result into a human-readable string
 *
 * @param parsedError - The parsed error result
 * @param includeTimestamp - Whether to include timestamp in the output (default: true)
 * @returns Formatted error string
 */
export function formatParsedError(parsedError: ParsedErrorResult, includeTimestamp: boolean = true): string {
    const timestampPart = includeTimestamp ? `[${parsedError.timestamp.toISOString()}] ` : '';
    return `${timestampPart}${parsedError.type}: ${parsedError.message}`;
}

/**
 * Creates an error message with context information
 *
 * @param context - Context information about where the error occurred
 * @param error - The error to wrap with context
 * @param additionalInfo - Additional information to include
 * @returns ParsedErrorResult with context information
 */
export function createContextualError(context: string, error: unknown, additionalInfo?: Record<string, unknown>): ParsedErrorResult {
    const parsed = parseError(error);

    // Add context to the error message
    const contextMessage = additionalInfo ? `${context} (${JSON.stringify(additionalInfo)})` : context;

    return { ...parsed, message: `${contextMessage}: ${parsed.message}` };
}

/**
 * Checks if an error is a network error
 *
 * @param error - The error to check
 * @returns true if the error appears to be network-related
 */
export function isNetworkError(error: unknown): boolean {
    const parsed = parseError(error);

    // Common network error patterns
    const networkErrorPatterns = [
        'Failed to fetch',
        'Network request failed',
        'net::ERR',
        'Failed to connect',
        'Timeout',
        'ECONNABORTED',
        'ECONNREFUSED',
        'ENOTFOUND',
    ];

    return networkErrorPatterns.some((pattern) => parsed.message.includes(pattern) || parsed.type.includes('Network'));
}
