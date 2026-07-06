import { apperr } from '../../../../../wailsjs/go/models';
import { RootState } from '../../index';
import { StacksStatus } from './types';

export const selectSavedStacks = (state: RootState): apperr.SavedStack[] => state.stacksSaved.stacks;

export const selectStacksStatus = (state: RootState): StacksStatus => state.stacksSaved.status;

export const selectStacksError = (state: RootState): string | null => state.stacksSaved.error;
