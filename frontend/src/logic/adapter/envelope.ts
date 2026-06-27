import { apperr } from '../../../wailsjs/go/models';
import { store } from '../store';
import { notifyError } from '../store/notifications/slice';

export function unwrap<T>(res: { data?: T; error?: apperr.WireError }): T {
    if (res.error) {
        store.dispatch(notifyError(res.error));
        throw res.error;
    }
    return res.data as T;
}

export function tryUnwrap<T>(res: { data?: T; error?: apperr.WireError }): { data?: T; error?: apperr.WireError } {
    if (res.error) {
        store.dispatch(notifyError(res.error));
    }
    return res;
}
