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
                baseUrl: settings.baseUrl,
                headers: settings.headers,
                modelName: settings.modelName,
                temperature: settings.temperature,
                defaultInputLanguage: settings.defaultInputLanguage,
                defaultOutputLanguage: settings.defaultOutputLanguage,
                languages: settings.languages,
                useMarkdownForOutput: settings.useMarkdownForOutput,
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
                baseUrl: settings.baseUrl,
                headers: settings.headers,
                modelName: settings.modelName,
                temperature: settings.temperature,
                defaultInputLanguage: settings.defaultInputLanguage,
                defaultOutputLanguage: settings.defaultOutputLanguage,
                languages: settings.languages,
                useMarkdownForOutput: settings.useMarkdownForOutput,
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
                baseUrl: baseUrl,
                headers: headers,
                modelName: settings.modelName,
                temperature: settings.temperature,
                defaultInputLanguage: settings.defaultInputLanguage,
                defaultOutputLanguage: settings.defaultOutputLanguage,
                languages: settings.languages,
                useMarkdownForOutput: settings.useMarkdownForOutput,
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
