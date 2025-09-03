export function extractErrorDetails(error: unknown): string {
    let errorType: string = 'Unknown';
    let errorMessage: string;

    if (error === null) {
        errorType = 'NullError';
        errorMessage = 'Received null';
    } else if (error === undefined) {
        errorType = 'UndefinedError';
        errorMessage = 'Received undefined';
    } else if (error instanceof Error) {
        errorType = error.name || 'Error';
        errorMessage = error.message || 'No error message available';
    } else if (typeof error === 'string') {
        errorType = 'StringError';
        errorMessage = error;
    } else if (typeof error === 'object') {
        const errObj = error as Record<string, unknown>;
        // If the object contains a relevant name or message property, try to extract them.
        if ('name' in errObj || 'message' in errObj) {
            errorType = typeof errObj.name === 'string' && errObj.name.length > 0 ? String(errObj.name) : 'ObjectError';
            try {
                errorMessage = typeof errObj.message === 'string' ? errObj.message : JSON.stringify(error);
            } catch {
                errorMessage = 'No error message available';
            }
        } else {
            // For plain objects without name/message, simply JSON.stringify
            try {
                errorType = 'ObjectError';
                errorMessage = JSON.stringify(error);
            } catch {
                errorMessage = 'No error message available';
            }
        }
    } else {
        // For types like number, boolean, symbol, function, or bigint.
        errorType = typeof error + 'Error';
        try {
            // eslint-disable-next-line  @typescript-eslint/no-base-to-string
            errorMessage = error.toString();
        } catch {
            errorMessage = 'No error message available';
        }
    }
    return `${errorType}. ${errorMessage}`;
}
