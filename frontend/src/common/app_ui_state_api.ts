import {
    GetCurrentModel,
    GetDefaultInputLanguage,
    GetDefaultOutputLanguage,
    GetFormattingItems,
    GetInputLanguages,
    GetModelsList,
    GetOutputLanguages,
    GetProofreadingItems,
    GetSummarizationItems,
    GetTransformingItems,
    GetTranslatingItems,
} from '../../wailsjs/go/ui/appUIStateApiStruct';
import { LogDebug } from '../../wailsjs/runtime';
import { IUiStateApi } from './app_backend_api';
import { AppActionItem, AppLanguageItem } from './types';

export class AppUiStateApi implements IUiStateApi {
    async getCurrentModel(): Promise<string> {
        try {
            return await GetCurrentModel();
        } catch (error) {
            LogDebug('Error getting current model');
            throw error;
        }
    }

    async getDefaultInputLanguage(): Promise<AppLanguageItem> {
        try {
            const languageItem = await GetDefaultInputLanguage();
            return { ...languageItem };
        } catch (error) {
            LogDebug('Error getting default input language');
            throw error;
        }
    }

    async getDefaultOutputLanguage(): Promise<AppLanguageItem> {
        try {
            const languageItem = await GetDefaultOutputLanguage();
            return { ...languageItem };
        } catch (error) {
            LogDebug('Error getting default output language');
            throw error;
        }
    }

    async getFormattingItems(): Promise<Array<AppActionItem>> {
        try {
            const actionItems = await GetFormattingItems();
            return actionItems.map((item) => {
                return { ...item };
            });
        } catch (error) {
            LogDebug('Error getting format items');
            throw error;
        }
    }

    async getInputLanguages(): Promise<Array<AppLanguageItem>> {
        try {
            const languageItems = await GetInputLanguages();
            return languageItems.map((item) => {
                return { ...item };
            });
        } catch (error) {
            LogDebug('Error getting input language items');
            throw error;
        }
    }

    async getModelsList(): Promise<Array<string>> {
        try {
            return await GetModelsList();
        } catch (error) {
            LogDebug('Error getting models list');
            throw error;
        }
    }

    async getOutputLanguages(): Promise<Array<AppLanguageItem>> {
        try {
            const languageItems = await GetOutputLanguages();
            return languageItems.map((item) => {
                return { ...item };
            });
        } catch (error) {
            LogDebug('Error getting output language items');
            throw error;
        }
    }

    async getProofreadingItems(): Promise<Array<AppActionItem>> {
        try {
            const actionItems = await GetProofreadingItems();
            return actionItems.map((item) => {
                return { ...item };
            });
        } catch (error) {
            LogDebug('Error getting proofread items');
            throw error;
        }
    }

    async getSummarizationItems(): Promise<Array<AppActionItem>> {
        try {
            const actionItems = await GetSummarizationItems();
            return actionItems.map((item) => {
                return { ...item };
            });
        } catch (error) {
            LogDebug('Error getting summary items');
            throw error;
        }
    }

    async getTransformingItems(): Promise<Array<AppActionItem>> {
        try {
            const actionItems = await GetTransformingItems();
            return actionItems.map((item) => {
                return { ...item };
            });
        } catch (error) {
            LogDebug('Error getting transforming items');
            throw error;
        }
    }

    async getTranslatingItems(): Promise<Array<AppActionItem>> {
        try {
            const actionItems = await GetTranslatingItems();
            return actionItems.map((item) => {
                return { ...item };
            });
        } catch (error) {
            LogDebug('Error getting translate items');
            throw error;
        }
    }
}
