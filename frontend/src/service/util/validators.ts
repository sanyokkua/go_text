/**
 * Validation result type
 * Either returns empty string (valid) or error message (invalid)
 */
export type ValidationResult = string;

/**
 * Endpoint validation options
 */
export interface EndpointValidationOptions {
    /** Allow empty endpoints (default: false) */
    allowEmpty?: boolean;
    /** Require leading slash (default: true) */
    requireLeadingSlash?: boolean;
    /** Allow trailing slash (default: false) */
    allowTrailingSlash?: boolean;
    /** Minimum length (default: 1) */
    minLength?: number;
    /** Maximum length (default: 255) */
    maxLength?: number;
}

/**
 * Validates an endpoint path
 *
 * @param endpointPath - The endpoint path to validate
 * @param endpointName - Human-readable name for error messages
 * @param options - Validation options
 * @returns Empty string if valid, error message if invalid
 */
export function validateEndpoint(endpointPath: string, endpointName: string, options: EndpointValidationOptions = {}): ValidationResult {
    const { allowEmpty = false, requireLeadingSlash = true, allowTrailingSlash = false, minLength = 1, maxLength = 255 } = options;

    // Check if empty
    if (!allowEmpty && (!endpointPath || endpointPath.trim().length === 0)) {
        return `${endpointName} cannot be empty`;
    }

    // Check minimum length
    if (endpointPath.trim().length < minLength) {
        return `${endpointName} must be at least ${minLength} character${minLength !== 1 ? 's' : ''} long`;
    }

    // Check maximum length
    if (endpointPath.length > maxLength) {
        return `${endpointName} cannot exceed ${maxLength} characters`;
    }

    // Check leading slash requirement
    if (requireLeadingSlash && !endpointPath.startsWith('/')) {
        return `${endpointName} must start with '/' symbol`;
    }

    // Check trailing slash restriction
    if (!allowTrailingSlash && endpointPath.endsWith('/')) {
        return `${endpointName} must not end with '/' symbol`;
    }

    // Check for invalid characters
    if (/[\s\\"'<>]/.test(endpointPath)) {
        return `${endpointName} contains invalid characters`;
    }

    return ''; // Empty string indicates valid
}

/**
 * Validates a URL
 *
 * @param url - The URL to validate
 * @param urlName - Human-readable name for error messages
 */
export function validateUrl(url: string, urlName: string): ValidationResult {
    if (!url || url.trim().length === 0) {
        return `${urlName} cannot be empty`;
    }

    try {
        new URL(url);
        return '';
    } catch (error) {
        return `${urlName} is not a valid URL: ${error instanceof Error ? error.message : 'Invalid format'}`;
    }
}

/**
 * Validates a URL with protocol requirement
 *
 * @param url - The URL to validate
 * @param urlName - Human-readable name for error messages
 * @param requiredProtocols - Required protocol (e.g., 'https:')
 * @returns Empty string if valid, error message if invalid
 */
export function validateUrlWithProtocol(url: string, urlName: string, requiredProtocols: string[] = ['http:', 'https:']): ValidationResult {
    const urlValidation = validateUrl(url, urlName);
    if (urlValidation) {
        return urlValidation;
    }

    try {
        const parsedUrl = new URL(url);
        if (requiredProtocols.includes(parsedUrl.protocol)) {
            return `${urlName} must use ${requiredProtocols} protocol`;
        }
        return '';
    } catch {
        return `${urlName} is not a valid URL`;
    }
}

/**
 * Validates a header key
 *
 * @param headerKey - The header key to validate
 * @returns Empty string if valid, error message if invalid
 */
export function validateHeaderKey(headerKey: string): ValidationResult {
    if (!headerKey || headerKey.trim().length === 0) {
        return 'Header key cannot be empty';
    }

    // Check for invalid characters in header keys
    if (/[\s:\\"'<>]/.test(headerKey)) {
        return 'Header key contains invalid characters';
    }

    return '';
}

/**
 * Validates a header value
 *
 * @param headerValue - The header value to validate
 * @returns Empty string if valid, error message if invalid
 */
export function validateHeaderValue(headerValue: string): ValidationResult {
    if (headerValue === undefined || headerValue === null) {
        return ''; // Null/undefined values are allowed
    }

    // Check for invalid characters in header values
    if (/[\\"'\n\r]/.test(headerValue)) {
        return 'Header value contains invalid characters';
    }

    return '';
}

/**
 * Validates a complete headers record
 *
 * @param headers - The headers record to validate
 * @returns Empty string if valid, error message if invalid
 */
export function validateHeaders(headers: Record<string, string>): ValidationResult {
    for (const [key, value] of Object.entries(headers)) {
        const keyValidation = validateHeaderKey(key);
        if (keyValidation) {
            return `Invalid header: ${keyValidation}`;
        }

        const valueValidation = validateHeaderValue(value);
        if (valueValidation) {
            return `Invalid header value for '${key}': ${valueValidation}`;
        }
    }

    return '';
}

/**
 * Validates a provider name
 *
 * @param providerName - The provider name to validate
 * @returns Empty string if valid, error message if invalid
 */
export function validateProviderName(providerName: string): ValidationResult {
    if (!providerName || providerName.trim().length === 0) {
        return 'Provider name cannot be empty';
    }

    if (providerName.trim().length > 100) {
        return 'Provider name cannot exceed 100 characters';
    }

    if (/[\s\\"'<>]/.test(providerName)) {
        return 'Provider name contains invalid characters';
    }

    return '';
}

/**
 * Validates a model name
 *
 * @param modelName - The model name to validate
 * @returns Empty string if valid, error message if invalid
 */
export function validateModelName(modelName: string): ValidationResult {
    if (!modelName || modelName.trim().length === 0) {
        return 'Model name cannot be empty';
    }

    if (modelName.trim().length > 200) {
        return 'Model name cannot exceed 200 characters';
    }

    return '';
}
