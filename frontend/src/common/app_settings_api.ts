import { models } from '../../wailsjs/go/models';
import {
    LoadSettings,
    ResetToDefaultSettings,
    SaveSettings,
    ValidateConnection,
} from '../../wailsjs/go/ui/appUISettingsApiStruct';
import { LogDebug } from '../../wailsjs/runtime';
import { ISettingsApi } from './app_backend_api';
import { AppSettings } from './types';
import Settings = models.Settings;

export class AppSettingsApi implements ISettingsApi {
    async loadSettings(): Promise<AppSettings> {
        try {
            const settings = await LoadSettings();
            return {
                baseUrl: settings.BaseUrl,
                headers: settings.Headers,
                modelName: settings.ModelName,
                temperature: settings.Temperature,
                defaultInputLanguage: settings.DefaultInputLanguage,
                defaultOutputLanguage: settings.DefaultOutputLanguage,
                languages: settings.Languages,
                useMarkdownForOutput: settings.UseMarkdownForOutput,
            };
        } catch (error) {
            LogDebug('Error loading settings');
            throw error;
        }
    }

    async resetToDefaultSettings(): Promise<AppSettings> {
        try {
            const settings = await ResetToDefaultSettings();
            return {
                baseUrl: settings.BaseUrl,
                headers: settings.Headers,
                modelName: settings.ModelName,
                temperature: settings.Temperature,
                defaultInputLanguage: settings.DefaultInputLanguage,
                defaultOutputLanguage: settings.DefaultOutputLanguage,
                languages: settings.Languages,
                useMarkdownForOutput: settings.UseMarkdownForOutput,
            };
        } catch (error) {
            LogDebug('Error resetting settings to default settings');
            throw error;
        }
    }

    async saveSettings(settings: AppSettings): Promise<void> {
        try {
            let baseUrl = settings.baseUrl;
            let headers = settings.headers;

            if (!(baseUrl.startsWith('http://') || baseUrl.startsWith('https://'))) {
                baseUrl = 'http://' + baseUrl;
            }

            if (headers['']) {
                const { ['']: _, ...rest } = headers;
                headers = rest;
            }

            const settingsObj = Settings.createFrom({
                BaseUrl: baseUrl,
                Headers: headers,
                ModelName: settings.modelName,
                Temperature: settings.temperature,
                DefaultInputLanguage: settings.defaultInputLanguage,
                DefaultOutputLanguage: settings.defaultOutputLanguage,
                Languages: settings.languages,
                UseMarkdownForOutput: settings.useMarkdownForOutput,
            });
            await SaveSettings(settingsObj);
        } catch (error) {
            LogDebug('Error saving settings');
            throw error;
        }
    }

    async validateConnection(baseUrl: string, headers: Record<string, string>): Promise<boolean> {
        try {
            return await ValidateConnection(baseUrl, headers);
        } catch (error) {
            LogDebug('Error validate connection');
            return false;
        }
    }
}
