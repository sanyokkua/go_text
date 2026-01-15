import { describe, expect, it } from '@jest/globals';
import { parseError } from './error_utils';

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

        describe('Backend Error Formatting', () => {
            it('formats backend error with multiple levels separated by colons', () => {
                // Arrange
                const backendError =
                    'Connection test failed: LLMService.GetCompletionResponseForProvider: chat completion request failed: LLMService.completionRequest: completion request failed: LLMService.makeHttpRequest: remote server error: API returned error status 404: 404 Not Found';

                // Act
                const result = parseError(backendError);

                // Assert
                expect(result.type).toBe('StringError');
                expect(result.message).toContain('Connection test failed');
                expect(result.message).toContain('LLMService.GetCompletionResponseForProvider');
                expect(result.message).toContain('404 Not Found');
                expect(result.message).toContain('. ');
            });

            it('formats Error object with backend-style message', () => {
                // Arrange
                const error = new Error('Service failed: database connection: timeout exceeded');

                // Act
                const result = parseError(error);

                // Assert
                expect(result.type).toBe('Error');
                expect(result.message).toContain('Service failed');
                expect(result.message).toContain('database connection');
                expect(result.message).toContain('timeout exceeded');
                expect(result.message).toContain('. ');
            });

            it('formats object error with backend-style message', () => {
                // Arrange
                const error = { name: 'BackendError', message: 'Validation failed: field required: name cannot be empty' };

                // Act
                const result = parseError(error);

                // Assert
                expect(result.type).toBe('BackendError');
                expect(result.message).toContain('Validation failed');
                expect(result.message).toContain('field required');
                expect(result.message).toContain('name cannot be empty');
                expect(result.message).toContain('. ');
            });

            it('does not format single-level error messages', () => {
                // Arrange
                const error = 'Simple error message';

                // Act
                const result = parseError(error);

                // Assert
                expect(result.type).toBe('StringError');
                expect(result.message).toBe('Simple error message');
                expect(result.message).not.toContain('. ');
            });

            it('handles backend error with empty segments', () => {
                // Arrange
                const error = 'Error::multiple::colons::with::empty::segments';

                // Act
                const result = parseError(error);

                // Assert
                expect(result.type).toBe('StringError');
                expect(result.message).toContain('Error');
                expect(result.message).toContain('multiple');
                expect(result.message).toContain('colons');
                expect(result.message).toContain('with');
                expect(result.message).toContain('empty');
                expect(result.message).toContain('segments');
                // Should not contain empty lines
                expect(result.message).not.toMatch(/\n\n/);
            });

            it('handles backend error with whitespace', () => {
                // Arrange
                const error = '  Error  :  multiple  :  parts  :  with  :  spaces  ';

                // Act
                const result = parseError(error);

                // Assert
                expect(result.type).toBe('StringError');
                expect(result.message).toContain('Error');
                expect(result.message).toContain('multiple');
                expect(result.message).toContain('parts');
                expect(result.message).toContain('with');
                expect(result.message).toContain('spaces');
                // Should be properly trimmed
                expect(result.message).not.toMatch(/^\s/);
                expect(result.message).not.toMatch(/\s$/);
            });

            it('handles Error object with no message', () => {
                // Arrange
                const error = new Error('');

                // Act
                const result = parseError(error);

                // Assert
                expect(result.type).toBe('Error');
                expect(result.message).toBe('No error message available');
            });

            it('handles object with message property but no name', () => {
                // Arrange
                const error = { message: 'Backend error: service unavailable: retry later' };

                // Act
                const result = parseError(error);

                // Assert
                expect(result.type).toBe('ObjectError');
                expect(result.message).toContain('Backend error');
                expect(result.message).toContain('service unavailable');
                expect(result.message).toContain('retry later');
                expect(result.message).toContain('. ');
            });
        });
    });
});
