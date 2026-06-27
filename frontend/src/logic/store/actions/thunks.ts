import { createAsyncThunk } from '@reduxjs/toolkit';
import { apperr } from '../../../../wailsjs/go/models';
import { ActionHandlerAdapter, getLogger, unwrap } from '../../adapter';
import { parseError } from '../../utils/error_utils';
import { RootState } from '../index';

const logger = getLogger('ActionsThunks');

export const loadActionCatalog = createAsyncThunk<apperr.ActionMeta[], void, { rejectValue: string }>(
    'actions/loadActionCatalog',
    async (_, { rejectWithValue }) => {
        try {
            const catalog = unwrap(await ActionHandlerAdapter.getActionCatalog());
            logger.logInfo(`Catalog loaded: ${catalog.length} actions`);
            return catalog;
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`loadActionCatalog failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

export const loadModels = createAsyncThunk<apperr.ModelInfo[], void, { rejectValue: string; state: RootState }>(
    'actions/loadModels',
    async (_, { getState, rejectWithValue }) => {
        try {
            const providerId = getState().settings.allSettings?.currentProviderConfig?.providerId ?? '';
            const models = unwrap(await ActionHandlerAdapter.getModels(providerId));
            logger.logInfo(`Models loaded: ${models.length}`);
            return models;
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`loadModels failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);

export const loadModelsForProvider = createAsyncThunk<apperr.ModelInfo[], string, { rejectValue: string }>(
    'actions/loadModelsForProvider',
    async (providerId, { rejectWithValue }) => {
        try {
            const models = unwrap(await ActionHandlerAdapter.getModels(providerId));
            logger.logInfo(`Models loaded: ${models.length} for provider ${providerId}`);
            return models;
        } catch (error: unknown) {
            const err = parseError(error);
            logger.logError(`loadModelsForProvider failed: ${err.message}`);
            return rejectWithValue(err.message);
        }
    },
);
