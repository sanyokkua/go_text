import { describe, expect, it } from '@jest/globals';
import { createContextualError, formatParsedError, isNetworkError, ParsedErrorResult, parseError } from './error_utils';

describe('Error Utils', () => {
    describe('parseError', () => {
        it('returns NullError when error is null', () => {
            // Arrange
            const error = null;

            // Act
            const result = parseError(error);

            // Assert
            expect(result).toMatchObject({ type: 'NullError', message: 'Received null value', timestamp: expect.any(Date) });
            expect(result.originalError).toBeUndefined();
        });

        it('returns UndefinedError when error is undefined', () => {
            // Arrange
            const error = undefined;

            // Act
            const result = parseError(error);

            // Assert
            expect(result).toMatchObject({ type: 'UndefinedError', message: 'Received undefined value', timestamp: expect.any(Date) });
            expect(result.originalError).toBeUndefined();
        });

        it('returns Error type when error is an Error instance', () => {
            // Arrange
            const error = new Error('Test error message');

            // Act
            const result = parseError(error);

            // Assert
            expect(result).toMatchObject({ type: 'Error', message: 'Test error message', timestamp: expect.any(Date) });
            expect(result.originalError).toBeUndefined();
        });

        it('returns Error type with default message when Error has no message', () => {
            // Arrange
            const error = new Error('');

            // Act
            const result = parseError(error);

            // Assert
            expect(result).toMatchObject({ type: 'Error', message: 'No error message available', timestamp: expect.any(Date) });
        });

        it('returns StringError when error is a string', () => {
            // Arrange
            const error = 'This is a string error';

            // Act
            const result = parseError(error);

            // Assert
            expect(result).toMatchObject({ type: 'StringError', message: 'This is a string error', timestamp: expect.any(Date) });
        });

        it('returns ObjectError when error is a plain object without name/message', () => {
            // Arrange
            const error = { field1: 'value1', field2: 'value2' };

            // Act
            const result = parseError(error);

            // Assert
            expect(result).toMatchObject({ type: 'ObjectError', message: JSON.stringify(error), timestamp: expect.any(Date) });
        });

        it('returns ObjectError with extracted name when object has name property', () => {
            // Arrange
            const error = { name: 'CustomError', message: 'Custom error message', extra: 'data' };

            // Act
            const result = parseError(error);

            // Assert
            expect(result).toMatchObject({ type: 'CustomError', message: 'Custom error message', timestamp: expect.any(Date) });
        });

        it('returns ObjectError when object has name but no message', () => {
            // Arrange
            const error = { name: 'CustomError', extra: 'data' };

            // Act
            const result = parseError(error);

            // Assert
            expect(result).toMatchObject({ type: 'CustomError', message: JSON.stringify(error), timestamp: expect.any(Date) });
        });

        it('returns NumberError when error is a number', () => {
            // Arrange
            const error = 42;

            // Act
            const result = parseError(error);

            // Assert
            expect(result).toMatchObject({ type: 'NumberError', message: '42', timestamp: expect.any(Date) });
        });

        it('returns BooleanError when error is a boolean', () => {
            // Arrange
            const error = true;

            // Act
            const result = parseError(error);

            // Assert
            expect(result).toMatchObject({ type: 'BooleanError', message: 'true', timestamp: expect.any(Date) });
        });

        it('returns SymbolError when error is a symbol', () => {
            // Arrange
            const error = Symbol('test-symbol');

            // Act
            const result = parseError(error);

            // Assert
            expect(result).toMatchObject({ type: 'SymbolError', message: expect.any(String), timestamp: expect.any(Date) });
        });

        it('returns FunctionError when error is a function', () => {
            // Arrange
            const error = () => {
                throw new Error('Function error');
            };

            // Act
            const result = parseError(error);

            // Assert
            expect(result).toMatchObject({ type: 'FunctionError', message: expect.any(String), timestamp: expect.any(Date) });
        });

        it('returns BigIntError when error is a bigint', () => {
            // Arrange
            const error = BigInt(9007199254740991);

            // Act
            const result = parseError(error);

            // Assert
            expect(result).toMatchObject({ type: 'BigintError', message: '9007199254740991', timestamp: expect.any(Date) });
        });

        it('includes original error when includeOriginal is true', () => {
            // Arrange
            const error = new Error('Original error');

            // Act
            const result = parseError(error, true);

            // Assert
            expect(result).toMatchObject({ type: 'Error', message: 'Original error', timestamp: expect.any(Date), originalError: error });
        });

        it('does not include original error when includeOriginal is false', () => {
            // Arrange
            const error = new Error('Original error');

            // Act
            const result = parseError(error, false);

            // Assert
            expect(result).toMatchObject({ type: 'Error', message: 'Original error', timestamp: expect.any(Date) });
            expect(result.originalError).toBeUndefined();
        });
    });

    describe('formatParsedError', () => {
        it('formats parsed error with timestamp by default', () => {
            // Arrange
            const parsedError: ParsedErrorResult = { type: 'Error', message: 'Test error', timestamp: new Date('2024-01-01T00:00:00.000Z') };

            // Act
            const result = formatParsedError(parsedError);

            // Assert
            expect(result).toBe('[2024-01-01T00:00:00.000Z] Error: Test error');
        });

        it('formats parsed error without timestamp when includeTimestamp is false', () => {
            // Arrange
            const parsedError: ParsedErrorResult = { type: 'Error', message: 'Test error', timestamp: new Date('2024-01-01T00:00:00.000Z') };

            // Act
            const result = formatParsedError(parsedError, false);

            // Assert
            expect(result).toBe('Error: Test error');
        });

        it('formats parsed error with current timestamp', () => {
            // Arrange
            const parsedError: ParsedErrorResult = { type: 'NullError', message: 'Null value', timestamp: new Date() };

            // Act
            const result = formatParsedError(parsedError);

            // Assert
            expect(result).toMatch(/^\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z] NullError: Null value$/);
        });
    });

    describe('createContextualError', () => {
        it('creates contextual error with context message', () => {
            // Arrange
            const context = 'UserService.createUser';
            const error = new Error('Database connection failed');

            // Act
            const result = createContextualError(context, error);

            // Assert
            expect(result).toMatchObject({
                type: 'Error',
                message: 'UserService.createUser: Database connection failed',
                timestamp: expect.any(Date),
            });
        });

        it('creates contextual error with additional info', () => {
            // Arrange
            const context = 'PaymentService.processPayment';
            const error = 'Insufficient funds';
            const additionalInfo = { userId: 123, amount: 1000 };

            // Act
            const result = createContextualError(context, error, additionalInfo);

            // Assert
            expect(result).toMatchObject({
                type: 'StringError',
                message: 'PaymentService.processPayment ({"userId":123,"amount":1000}): Insufficient funds',
                timestamp: expect.any(Date),
            });
        });

        it('creates contextual error with null error', () => {
            // Arrange
            const context = 'ConfigService.loadConfig';
            const error = null;

            // Act
            const result = createContextualError(context, error);

            // Assert
            expect(result).toMatchObject({
                type: 'NullError',
                message: 'ConfigService.loadConfig: Received null value',
                timestamp: expect.any(Date),
            });
        });

        it('creates contextual error with undefined error', () => {
            // Arrange
            const context = 'ApiService.fetchData';
            const error = undefined;

            // Act
            const result = createContextualError(context, error);

            // Assert
            expect(result).toMatchObject({
                type: 'UndefinedError',
                message: 'ApiService.fetchData: Received undefined value',
                timestamp: expect.any(Date),
            });
        });
    });

    describe('isNetworkError', () => {
        it('returns true for Failed to fetch error', () => {
            // Arrange
            const error = new Error('Failed to fetch');

            // Act
            const result = isNetworkError(error);

            // Assert
            expect(result).toBe(true);
        });

        it('returns true for Network request failed error', () => {
            // Arrange
            const error = 'Network request failed';

            // Act
            const result = isNetworkError(error);

            // Assert
            expect(result).toBe(true);
        });

        it('returns true for net::ERR_CONNECTION error', () => {
            // Arrange
            const error = { message: 'net::ERR_CONNECTION_REFUSED' };

            // Act
            const result = isNetworkError(error);

            // Assert
            expect(result).toBe(true);
        });

        it('returns true for Timeout error', () => {
            // Arrange
            const error = new Error('Timeout: Request took too long');

            // Act
            const result = isNetworkError(error);

            // Assert
            expect(result).toBe(true);
        });

        it('returns true for ECONNABORTED error', () => {
            // Arrange
            const error = { message: 'ECONNABORTED: Connection aborted' };

            // Act
            const result = isNetworkError(error);

            // Assert
            expect(result).toBe(true);
        });

        it('returns true for ECONNREFUSED error', () => {
            // Arrange
            const error = 'ECONNREFUSED';

            // Act
            const result = isNetworkError(error);

            // Assert
            expect(result).toBe(true);
        });

        it('returns true for ENOTFOUND error', () => {
            // Arrange
            const error = { message: 'ENOTFOUND: DNS lookup failed' };

            // Act
            const result = isNetworkError(error);

            // Assert
            expect(result).toBe(true);
        });

        it('returns false for non-network error', () => {
            // Arrange
            const error = new Error('Invalid input data');

            // Act
            const result = isNetworkError(error);

            // Assert
            expect(result).toBe(false);
        });

        it('returns false for null error', () => {
            // Arrange
            const error = null;

            // Act
            const result = isNetworkError(error);

            // Assert
            expect(result).toBe(false);
        });

        it('returns false for undefined error', () => {
            // Arrange
            const error = undefined;

            // Act
            const result = isNetworkError(error);

            // Assert
            expect(result).toBe(false);
        });

        it('returns false for generic error', () => {
            // Arrange
            const error = 'Something went wrong';

            // Act
            const result = isNetworkError(error);

            // Assert
            expect(result).toBe(false);
        });
    });
});
