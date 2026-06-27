import { createSelector } from '@reduxjs/toolkit';
import { apperr } from '../../../../wailsjs/go/models';
import { RootState } from '../index';
import { LoadStatus } from './types';

export const selectActionCatalog = (state: RootState): apperr.ActionMeta[] => state.actions.catalog;
export const selectCatalogStatus = (state: RootState): LoadStatus => state.actions.catalogStatus;
export const selectAvailableModels = (state: RootState): apperr.ModelInfo[] => state.actions.availableModels;
export const selectModelsStatus = (state: RootState): LoadStatus => state.actions.modelsStatus;

// Groups the flat ActionMeta[] by category, sorted by category name.
// Returns a stable array of { category, actions } pairs for sidebar rendering.
export const selectCatalogByCategory = createSelector([selectActionCatalog], (catalog) => {
    const map = new Map<string, typeof catalog>();
    for (const action of catalog) {
        const existing = map.get(action.category);
        if (existing) {
            existing.push(action);
        } else {
            map.set(action.category, [action]);
        }
    }
    return Array.from(map.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([category, actions]) => ({ category, actions }));
});
