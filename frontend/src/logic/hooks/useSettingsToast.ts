import { useCallback } from 'react';

import { useAppDispatch } from '../store';
import { enqueueNotification } from '../store/notifications/slice';

/**
 * A dispatched RTK thunk promise. Only `.unwrap()` is consumed here, so the
 * helper stays agnostic of the thunk's return/reject generics.
 */
interface UnwrappablePromise {
    unwrap(): Promise<unknown>;
}

/**
 * Work the helper can await: either a dispatched RTK thunk (resolved via
 * `.unwrap()` so a rejected thunk throws) or a plain adapter promise.
 */
export type AwaitableWork = UnwrappablePromise | Promise<unknown>;

function isUnwrappable(work: AwaitableWork): work is UnwrappablePromise {
    return typeof (work as UnwrappablePromise).unwrap === 'function';
}

export interface SettingsToastMessages {
    /** Toast shown when the write resolves successfully. */
    success: string;
    /** Optional title for the success toast. */
    successTitle?: string;
    /**
     * Optional error toast.
     *
     * Most settings writes route through the adapter `unwrap` helper, which
     * already dispatches a rich, per-ErrorCode error toast on failure. Omit
     * `error` for those to avoid a duplicate toast — the helper only swallows
     * the rejection. Provide `error` (and optionally `errorTitle`) for writes
     * that bypass that auto-toast, such as opening a path.
     */
    error?: string;
    errorTitle?: string;
}

export type RunWithToast = (work: AwaitableWork, messages: SettingsToastMessages) => Promise<void>;

/**
 * Returns a `runWithToast` helper that awaits a dispatched settings-write thunk
 * and emits a success toast on completion. On failure it swallows the rejection
 * (preventing an unhandled promise) and, only when `messages.error` is set,
 * emits an error toast — otherwise it defers to the adapter's existing
 * error toast.
 */
export function useSettingsToast(): RunWithToast {
    const dispatch = useAppDispatch();

    return useCallback(
        async (work, messages) => {
            try {
                await (isUnwrappable(work) ? work.unwrap() : work);
                dispatch(
                    enqueueNotification({
                        severity: 'success',
                        surface: 'toast',
                        message: messages.success,
                        ...(messages.successTitle === undefined ? {} : { title: messages.successTitle }),
                    }),
                );
            } catch {
                if (messages.error !== undefined) {
                    dispatch(
                        enqueueNotification({
                            severity: 'error',
                            surface: 'toast',
                            message: messages.error,
                            ...(messages.errorTitle === undefined ? {} : { title: messages.errorTitle }),
                        }),
                    );
                }
            }
        },
        [dispatch],
    );
}
