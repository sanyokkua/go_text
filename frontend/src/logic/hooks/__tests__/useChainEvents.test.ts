// jest.mock calls are hoisted before imports — place them first
jest.mock('../../store', () => ({ useAppDispatch: jest.fn() }));

jest.mock('../../store/run', () => ({ progressReceived: jest.fn((data: unknown) => ({ type: 'run/progressReceived', payload: data })) }));

import { renderHook } from '@testing-library/react';
import { useAppDispatch } from '../../store';
import { progressReceived } from '../../store/run';
import { useChainEvents } from '../useChainEvents';
// 4-level path resolves to frontend/wailsjs/runtime/ (has runtime.d.ts); moduleNameMapper
// maps this same pattern to wailsRuntime.js — same instance that useChainEvents.ts uses
import { EventsOff, EventsOn } from '../../../../wailsjs/runtime';

describe('useChainEvents', () => {
    const mockDispatch = jest.fn();

    beforeEach(() => {
        (useAppDispatch as unknown as jest.Mock).mockReturnValue(mockDispatch);
    });

    it('subscribes to chain:progress event on mount', () => {
        // Arrange + Act
        renderHook(() => useChainEvents());

        // Assert
        expect(EventsOn).toHaveBeenCalledWith('chain:progress', expect.any(Function));
    });

    it('dispatches progressReceived action when a chain:progress event fires', () => {
        // Arrange
        renderHook(() => useChainEvents());
        const handler = (EventsOn as unknown as jest.Mock).mock.calls[0][1] as (data: unknown) => void;
        const progress = { runId: 'run-1', groupIndex: 1, totalGroups: 3, family: 'single', status: 'running' as const };

        // Act
        handler(progress);

        // Assert
        expect(progressReceived).toHaveBeenCalledWith(progress);
        expect(mockDispatch).toHaveBeenCalledWith({ type: 'run/progressReceived', payload: progress });
    });

    it('unsubscribes from chain:progress on unmount', () => {
        // Arrange
        const { unmount } = renderHook(() => useChainEvents());

        // Act
        unmount();

        // Assert
        expect(EventsOff).toHaveBeenCalledWith('chain:progress');
    });
});
