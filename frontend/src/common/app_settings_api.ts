import { models } from '../../wailsjs/go/models';
import {
    AddCustomProvider,
    DeleteCustomProvider,
    GetCustomProviders,
    LoadSettings,
    ResetToDefaultSettings,
    SaveSettings,
    UpdateCustomProvider,
    ValidateCompletionRequest,
    ValidateModelsRequest,
} from '../../wailsjs/go/ui/appUISettingsApiStruct';
import { LogDebug } from '../../wailsjs/runtime';
import { ISettingsApi } from './app_backend_api';
import { AppSettings, ProviderType } from './types';
import Settings = models.Settings;
import ProviderConfig = models.ProviderConfig;
import ModelConfig = models.ModelConfig;
import LanguageConfig = models.LanguageConfig;

export interface AppSettingsWithProviderType {
    currentSettings: AppSettings;
    newProviderType: ProviderType;
}

export class AppSettingsApi implements ISettingsApi {
    async loadSettings(): Promise<AppSettings> {
        try {
            const settings = await LoadSettings();
            return this.mapBackendToFrontend(settings);
        } catch (error) {
            LogDebug('Error loading settings');
            throw error;
        }
    }

    async resetToDefaultSettings(): Promise<AppSettings> {
        try {
            const settings = await ResetToDefaultSettings();
            return this.mapBackendToFrontend(settings);
        } catch (error) {
            LogDebug('Error resetting settings to default settings');
            throw error;
        }
    }

    async saveSettings(settings: AppSettings): Promise<void> {
        try {
            const settingsObj = this.mapFrontendToBackend(settings);
            await SaveSettings(settingsObj);
        } catch (error) {
            LogDebug('Error saving settings');
            throw error;
        }
    }

    async validateModelsRequest(baseUrl: string, endpoint: string, headers: Record<string, string>): Promise<boolean> {
        try {
            return await ValidateModelsRequest(baseUrl, endpoint, headers);
        } catch (error) {
            LogDebug('Error validateModelsRequest');
            return false;
        }
    }

    async validateCompletionRequest(baseUrl: string, endpoint: string, modelName: string, headers: Record<string, string>): Promise<boolean> {
        try {
            return await ValidateCompletionRequest(baseUrl, endpoint, modelName, headers);
        } catch (error) {
            LogDebug('Error validateCompletionRequest');
            return false;
        }
    }

    async switchProviderType(param: AppSettingsWithProviderType): Promise<AppSettings> {
        try {
            const settingsObj = this.mapFrontendToBackend(param.currentSettings);
            settingsObj.currentProviderConfig.providerType = param.newProviderType;

            await SaveSettings(settingsObj);

            // After saving, reload to get the fresh state (simulating what SwitchProviderType would return)
            return await this.loadSettings();
        } catch (error) {
            LogDebug('Error switching provider type');
            throw error;
        }
    }

    async verifyProviderAvailability(baseUrl: string, modelsEndpoint: string, headers: Record<string, string>): Promise<boolean> {
        try {
            return await ValidateModelsRequest(baseUrl, modelsEndpoint, headers);
        } catch (error) {
            LogDebug('Error verifying provider availability');
            return false;
        }
    }

    // Custom provider management methods
    async addCustomProvider(provider: any): Promise<void> {
        try {
            await AddCustomProvider(provider);
        } catch (error) {
            LogDebug('Error adding custom provider');
            throw error;
        }
    }

    async updateCustomProvider(provider: any): Promise<void> {
        try {
            await UpdateCustomProvider(provider);
        } catch (error) {
            LogDebug('Error updating custom provider');
            throw error;
        }
    }

    async deleteCustomProvider(providerName: string): Promise<void> {
        try {
            await DeleteCustomProvider(providerName);
        } catch (error) {
            LogDebug('Error deleting custom provider');
            throw error;
        }
    }

    async getCustomProviders(): Promise<any[]> {
        try {
            return await GetCustomProviders();
        } catch (error) {
            LogDebug('Error getting custom providers');
            throw error;
        }
    }

    private mapProviderConfigFrontendToBackend(provider: ProviderConfig): ProviderConfig {
        // Validation logic for BaseURL
        let baseUrl = provider.baseUrl;
        if (baseUrl && !(baseUrl.startsWith('http://') || baseUrl.startsWith('https://'))) {
            baseUrl = 'http://' + baseUrl;
        }

        // Clean empty headers
        let headers = provider.headers;
        if (headers && headers['']) {
            const { ['']: _, ...rest } = headers;
            headers = rest;
        }

        return ProviderConfig.createFrom({
            providerType: provider.providerType,
            providerName: provider.providerName,
            baseUrl: baseUrl,
            modelsEndpoint: provider.modelsEndpoint,
            completionEndpoint: provider.completionEndpoint,
            headers: headers,
        });
    }

    private mapProviderConfigBackendToFrontend(provider: any): ProviderConfig {
        // Map the string providerType from backend to the ProviderType enum
        let mappedProviderType: ProviderType = 'custom'; // default
        if (provider.providerType === 'ollama') {
            mappedProviderType = 'ollama';
        } else if (provider.providerType === 'lm-studio') {
            mappedProviderType = 'lm-studio';
        } else if (provider.providerType === 'llama-cpp') {
            mappedProviderType = 'llama-cpp';
        } else if (provider.providerType === 'custom-open-ai') {
            mappedProviderType = 'custom';
        }

        return {
            providerType: mappedProviderType,
            providerName: provider.providerName,
            baseUrl: provider.baseUrl,
            modelsEndpoint: provider.modelsEndpoint,
            completionEndpoint: provider.completionEndpoint,
            headers: provider.headers || {},
        };
    }

    private mapBackendProviderArrayToFrontend(providers: any[]): ProviderConfig[] {
        return providers.map((p) => this.mapProviderConfigBackendToFrontend(p));
    }

    private mapBackendToFrontend(settings: Settings): AppSettings {
        return {
            availableProviderConfigs: settings.availableProviderConfigs
                ? settings.availableProviderConfigs.map((p) => ({
                      providerType: p.providerType as ProviderType,
                      providerName: p.providerName,
                      baseUrl: p.baseUrl,
                      modelsEndpoint: p.modelsEndpoint,
                      completionEndpoint: p.completionEndpoint,
                      headers: p.headers || {},
                  }))
                : [],
            currentProviderConfig: {
                providerType: settings.currentProviderConfig.providerType as ProviderType,
                providerName: settings.currentProviderConfig.providerName,
                baseUrl: settings.currentProviderConfig.baseUrl,
                modelsEndpoint: settings.currentProviderConfig.modelsEndpoint,
                completionEndpoint: settings.currentProviderConfig.completionEndpoint,
                headers: settings.currentProviderConfig.headers || {},
            },
            modelConfig: {
                modelName: settings.modelConfig.modelName,
                isTemperatureEnabled: settings.modelConfig.isTemperatureEnabled,
                temperature: settings.modelConfig.temperature,
            },
            languageConfig: {
                languages: settings.languageConfig.languages,
                defaultInputLanguage: settings.languageConfig.defaultInputLanguage,
                defaultOutputLanguage: settings.languageConfig.defaultOutputLanguage,
            },
            useMarkdownForOutput: settings.useMarkdownForOutput,
        };
    }

    private mapFrontendToBackend(settings: AppSettings): Settings {
        // Validation logic for BaseURL
        let baseUrl = settings.currentProviderConfig.baseUrl;
        if (baseUrl && !(baseUrl.startsWith('http://') || baseUrl.startsWith('https://'))) {
            baseUrl = 'http://' + baseUrl;
        }

        // Clean empty headers
        let headers = settings.currentProviderConfig.headers;
        if (headers && headers['']) {
            const { ['']: _, ...rest } = headers;
            headers = rest;
        }

        const currentProviderConfig = ProviderConfig.createFrom({
            providerType: settings.currentProviderConfig.providerType,
            providerName: settings.currentProviderConfig.providerName,
            baseUrl: baseUrl,
            modelsEndpoint: settings.currentProviderConfig.modelsEndpoint,
            completionEndpoint: settings.currentProviderConfig.completionEndpoint,
            headers: headers,
        });

        const availableProviderConfigs = settings.availableProviderConfigs.map((p) =>
            ProviderConfig.createFrom({
                providerType: p.providerType,
                providerName: p.providerName,
                baseUrl: p.baseUrl,
                modelsEndpoint: p.modelsEndpoint,
                completionEndpoint: p.completionEndpoint,
                headers: p.headers,
            }),
        );

        const modelConfig = ModelConfig.createFrom({
            modelName: settings.modelConfig.modelName,
            isTemperatureEnabled: settings.modelConfig.isTemperatureEnabled,
            temperature: settings.modelConfig.temperature,
        });

        const languageConfig = LanguageConfig.createFrom({
            languages: settings.languageConfig.languages,
            defaultInputLanguage: settings.languageConfig.defaultInputLanguage,
            defaultOutputLanguage: settings.languageConfig.defaultOutputLanguage,
        });

        return Settings.createFrom({
            availableProviderConfigs: availableProviderConfigs,
            currentProviderConfig: currentProviderConfig,
            modelConfig: modelConfig,
            languageConfig: languageConfig,
            useMarkdownForOutput: settings.useMarkdownForOutput,
        });
    }
}
