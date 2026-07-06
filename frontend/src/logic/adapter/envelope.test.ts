import { apperr } from '../../../wailsjs/go/models';

jest.mock('../store', () => ({ store: { dispatch: jest.fn() } }));
jest.mock('../store/notifications/slice', () => ({ notifyError: jest.fn((wire) => ({ type: 'notifications/enqueueNotification', payload: wire })) }));

import { store } from '../store';
import { tryUnwrap, unwrap } from './envelope';

const mockDispatch = store.dispatch as jest.Mock;
beforeEach(() => mockDispatch.mockClear());

function wireError(code: apperr.ErrorCode = apperr.ErrorCode.CodeInternal): apperr.WireError {
    return apperr.WireError.createFrom({ code, title: 'Error', message: 'Something failed', retryable: false });
}

describe('unwrap', () => {
    it('returns data when result has no error', () => {
        expect(unwrap({ data: 42 })).toBe(42);
        expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('dispatches notifyError and throws when result has error', () => {
        const err = wireError(apperr.ErrorCode.CodeTimeout);
        expect(() => unwrap({ error: err })).toThrow();
        expect(mockDispatch).toHaveBeenCalledTimes(1);
    });

    it('throws the WireError object (not a wrapped Error)', () => {
        const err = wireError();
        let caught: unknown;
        try {
            unwrap({ error: err });
        } catch (e) {
            caught = e;
        }
        expect(caught).toBe(err);
    });
});

describe('tryUnwrap', () => {
    it('returns result unchanged when there is no error', () => {
        const res = { data: 'hello' };
        expect(tryUnwrap(res)).toBe(res);
        expect(mockDispatch).not.toHaveBeenCalled();
    });

    it('dispatches notifyError but does NOT throw when result has error', () => {
        const err = wireError(apperr.ErrorCode.CodeInternal);
        const res = { data: 'partial', error: err };
        expect(() => tryUnwrap(res)).not.toThrow();
        expect(mockDispatch).toHaveBeenCalledTimes(1);
    });

    it('returns the full envelope (data AND error) for partial results', () => {
        const err = wireError(apperr.ErrorCode.CodeStepFailed);
        const res = { data: 'partial output', error: err };
        const out = tryUnwrap(res);
        expect(out.data).toBe('partial output');
        expect(out.error).toBe(err);
    });
});
