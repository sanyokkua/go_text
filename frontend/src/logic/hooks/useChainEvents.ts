import { useEffect } from 'react';
import { EventsOff, EventsOn } from '../../../wailsjs/runtime';
import { progressReceived } from '../store/run';
import { useAppDispatch } from '../store';
import type { StepProgress } from '../store/run/types';

const EVENT_CHAIN_PROGRESS = 'chain:progress';

export function useChainEvents(): void {
    const dispatch = useAppDispatch();

    useEffect(() => {
        EventsOn(EVENT_CHAIN_PROGRESS, (data: StepProgress) => {
            dispatch(progressReceived(data));
        });
        return () => {
            EventsOff(EVENT_CHAIN_PROGRESS);
        };
    }, [dispatch]);
}
