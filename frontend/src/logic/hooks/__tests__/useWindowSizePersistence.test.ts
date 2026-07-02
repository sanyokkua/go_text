// jest.mock calls are hoisted before imports — place them first
jest.mock('../../adapter', () => ({ saveWindowSize: jest.fn() }));

import { act, renderHook } from '@testing-library/react';
import { saveWindowSize } from '../../adapter';
// 4-level path resolves to frontend/wailsjs/runtime/ (has runtime.d.ts); moduleNameMapper
// maps this same pattern to wailsRuntime.js — same instance that the hook under test uses
import { WindowGetSize } from '../../../../wailsjs/runtime';
import { useWindowSizePersistence } from '../useWindowSizePersistence';

const DEBOUNCE_MS = 500;

describe('useWindowSizePersistence', () => {
    beforeEach(() => {
        jest.useFakeTimers();
    });

    afterEach(() => {
        jest.useRealTimers();
    });

    it('coalesces a burst of resize events into a single save once the debounce window elapses', async () => {
        (WindowGetSize as jest.Mock).mockResolvedValue({ w: 1600, h: 900 });
        renderHook(() => useWindowSizePersistence());

        await act(async () => {
            window.dispatchEvent(new Event('resize'));
            window.dispatchEvent(new Event('resize'));
            window.dispatchEvent(new Event('resize'));
            await jest.advanceTimersByTimeAsync(DEBOUNCE_MS);
        });

        expect(saveWindowSize).toHaveBeenCalledTimes(1);
    });

    it('saves the width and height that WindowGetSize resolves to', async () => {
        (WindowGetSize as jest.Mock).mockResolvedValue({ w: 1600, h: 900 });
        renderHook(() => useWindowSizePersistence());

        await act(async () => {
            window.dispatchEvent(new Event('resize'));
            await jest.advanceTimersByTimeAsync(DEBOUNCE_MS);
        });

        expect(saveWindowSize).toHaveBeenCalledWith(1600, 900);
    });

    it('does not save the window size when the component unmounts before the debounce timer fires', async () => {
        (WindowGetSize as jest.Mock).mockResolvedValue({ w: 1024, h: 768 });
        const { unmount } = renderHook(() => useWindowSizePersistence());

        window.dispatchEvent(new Event('resize'));
        unmount();

        await act(async () => {
            await jest.advanceTimersByTimeAsync(DEBOUNCE_MS);
        });

        expect(WindowGetSize).not.toHaveBeenCalled();
        expect(saveWindowSize).not.toHaveBeenCalled();
    });

    it('removes the resize listener on unmount so a resize dispatched afterwards has no effect', async () => {
        (WindowGetSize as jest.Mock).mockResolvedValue({ w: 1024, h: 768 });
        const { unmount } = renderHook(() => useWindowSizePersistence());
        unmount();

        window.dispatchEvent(new Event('resize'));

        await act(async () => {
            await jest.advanceTimersByTimeAsync(DEBOUNCE_MS);
        });

        expect(WindowGetSize).not.toHaveBeenCalled();
        expect(saveWindowSize).not.toHaveBeenCalled();
    });

    it('saves again for a second, independent resize cycle after the first debounce has completed', async () => {
        (WindowGetSize as jest.Mock).mockResolvedValue({ w: 800, h: 600 });
        renderHook(() => useWindowSizePersistence());

        await act(async () => {
            window.dispatchEvent(new Event('resize'));
            await jest.advanceTimersByTimeAsync(DEBOUNCE_MS);
        });
        expect(saveWindowSize).toHaveBeenCalledTimes(1);

        await act(async () => {
            window.dispatchEvent(new Event('resize'));
            await jest.advanceTimersByTimeAsync(DEBOUNCE_MS);
        });

        expect(saveWindowSize).toHaveBeenCalledTimes(2);
    });
});
