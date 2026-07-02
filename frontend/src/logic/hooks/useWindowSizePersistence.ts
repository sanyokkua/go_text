import { useEffect } from 'react';
import { WindowGetSize } from '../../../wailsjs/runtime';
import { saveWindowSize } from '../adapter';

const RESIZE_DEBOUNCE_MS = 500;

/**
 * Persists the native window size to the backend whenever the user resizes it.
 *
 * Wails v2 has no "window resized" backend event, so resize is detected via the
 * browser's native `resize` event and debounced to avoid hammering the DB during
 * a live drag-resize (which can fire dozens of events per second).
 */
export function useWindowSizePersistence(): void {
    useEffect(() => {
        let timeoutId: ReturnType<typeof setTimeout> | undefined;
        const handleResize = () => {
            if (timeoutId) clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                WindowGetSize()
                    .then((size) => saveWindowSize(size.w, size.h))
                    .catch(() => {});
            }, RESIZE_DEBOUNCE_MS);
        };
        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
            if (timeoutId) clearTimeout(timeoutId);
        };
    }, []);
}
