import { apperr } from '../../../../../wailsjs/go/models';

export type StacksStatus = 'idle' | 'loading' | 'saving' | 'deleting' | 'error';

export interface StacksSavedState {
    stacks: apperr.SavedStack[];
    status: StacksStatus;
    error: string | null;
}
