import { apperr } from '../../../../wailsjs/go/models';

export type LoadStatus = 'idle' | 'loading' | 'success' | 'error';

export interface ActionsCatalogState {
    catalog: apperr.ActionMeta[];
    catalogStatus: LoadStatus;
    availableModels: apperr.ModelInfo[];
    modelsStatus: LoadStatus;
}
