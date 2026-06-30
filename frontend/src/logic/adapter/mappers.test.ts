import { apperr } from '../../../wailsjs/go/models';
import { fromWireBehavior, fromWireMetadata, fromWireProvider, fromWireUIPreferences, toWireBehavior, toWireProvider, toWireUIPreferences } from './mappers';
import { UIPreferencesConfig } from './models';

const wireProvider: apperr.ProviderConfig = apperr.ProviderConfig.createFrom({
    id: 'p1',
    name: 'Local Ollama',
    kind: 'ollama',
    baseUrl: 'http://localhost:11434',
    authScheme: 'none',
    apiKeyEnvVar: '',
    completionPath: '/v1/chat/completions',
    modelsPath: '/v1/models',
    useCustomModels: false,
    headers: {},
    customModels: [],
});

describe('fromWireProvider', () => {
    it('maps wire fields to domain fields', () => {
        const p = fromWireProvider(wireProvider);
        expect(p.providerId).toBe('p1');
        expect(p.providerName).toBe('Local Ollama');
        expect(p.providerType).toBe('ollama');
        expect(p.baseUrl).toBe('http://localhost:11434');
        expect(p.authType).toBe('none');
        expect(p.authToken).toBe('');
        expect(p.useAuthTokenFromEnv).toBe(false);
        expect(p.envVarTokenName).toBe('');
        expect(p.useCustomHeaders).toBe(false);
        expect(p.headers).toEqual({});
        expect(p.useCustomModels).toBe(false);
        expect(p.customModels).toEqual([]);
    });

    it('sets useAuthTokenFromEnv true when apiKeyEnvVar is non-empty', () => {
        const w = apperr.ProviderConfig.createFrom({ ...wireProvider, apiKeyEnvVar: 'OLLAMA_KEY' });
        expect(fromWireProvider(w).useAuthTokenFromEnv).toBe(true);
        expect(fromWireProvider(w).envVarTokenName).toBe('OLLAMA_KEY');
    });
});

describe('toWireProvider', () => {
    it('round-trips through fromWireProvider', () => {
        const domain = fromWireProvider(wireProvider);
        const wire2 = toWireProvider(domain);
        expect(wire2.id).toBe('p1');
        expect(wire2.name).toBe('Local Ollama');
        expect(wire2.kind).toBe('ollama');
    });
});

describe('fromWireMetadata', () => {
    it('maps wire field names to domain field names', () => {
        const w = new apperr.AppSettingsMetadata();
        w.authSchemes = ['none', 'bearer'];
        w.providerKinds = ['ollama', 'openai'];
        w.settingsFolder = '/home/user/.config';
        w.databaseFile = 'SettingsV2.db';
        w.logsFolder = '/home/user/.local/state';
        const m = fromWireMetadata(w);
        expect(m.authTypes).toEqual(['none', 'bearer']);
        expect(m.providerTypes).toEqual(['ollama', 'openai']);
        expect(m.settingsFolder).toBe('/home/user/.config');
        expect(m.settingsFile).toBe('SettingsV2.db');
        expect(m.logsFolder).toBe('/home/user/.local/state');
    });
});

describe('fromWireBehavior / toWireBehavior', () => {
    it('fromWireBehavior sets logDirectory to empty string and passes through v3 fields', () => {
        const w = apperr.AppBehaviorConfig.createFrom({ enableTaskLogging: true, historyEnabled: true, historyMaxEntries: 50 });
        const b = fromWireBehavior(w);
        expect(b.enableTaskLogging).toBe(true);
        expect(b.logDirectory).toBe('');
        expect(b.historyEnabled).toBe(true);
        expect(b.historyMaxEntries).toBe(50);
    });

    it('toWireBehavior omits logDirectory and preserves historyEnabled/historyMaxEntries', () => {
        const w = toWireBehavior({ enableTaskLogging: false, logDirectory: '/some/path', historyEnabled: true, historyMaxEntries: 100 });
        expect(w.enableTaskLogging).toBe(false);
        expect(w.historyEnabled).toBe(true);
        expect(w.historyMaxEntries).toBe(100);
    });

    it('toWireBehavior defaults historyEnabled and historyMaxEntries when absent', () => {
        const w = toWireBehavior({ enableTaskLogging: true, logDirectory: '' });
        expect(w.historyEnabled).toBe(false);
        expect(w.historyMaxEntries).toBe(0);
    });
});

describe('fromWireUIPreferences / toWireUIPreferences', () => {
    describe('theme field', () => {
        it('passes through "light"', () => {
            const w = apperr.UIPreferencesConfig.createFrom({ theme: 'light', layout: 'side', sidebarCollapsed: false, historyOpen: false, viewMode: 'preview' });
            expect(fromWireUIPreferences(w).theme).toBe('light');
        });

        it('passes through "dark"', () => {
            const w = apperr.UIPreferencesConfig.createFrom({ theme: 'dark', layout: 'side', sidebarCollapsed: false, historyOpen: false, viewMode: 'preview' });
            expect(fromWireUIPreferences(w).theme).toBe('dark');
        });

        it('defaults to "auto" for unknown theme values', () => {
            const w = apperr.UIPreferencesConfig.createFrom({ theme: 'solarized', layout: 'side', sidebarCollapsed: false, historyOpen: false, viewMode: 'preview' });
            expect(fromWireUIPreferences(w).theme).toBe('auto');
        });

        it('defaults to "auto" when theme is empty string', () => {
            const w = apperr.UIPreferencesConfig.createFrom({ theme: '', layout: 'side', sidebarCollapsed: false, historyOpen: false, viewMode: 'preview' });
            expect(fromWireUIPreferences(w).theme).toBe('auto');
        });
    });

    describe('layout field', () => {
        it('passes through "side"', () => {
            const w = apperr.UIPreferencesConfig.createFrom({ theme: 'auto', layout: 'side', sidebarCollapsed: false, historyOpen: false, viewMode: 'preview' });
            expect(fromWireUIPreferences(w).layout).toBe('side');
        });

        it('passes through "stacked"', () => {
            const w = apperr.UIPreferencesConfig.createFrom({ theme: 'auto', layout: 'stacked', sidebarCollapsed: false, historyOpen: false, viewMode: 'preview' });
            expect(fromWireUIPreferences(w).layout).toBe('stacked');
        });

        it('defaults to "side" for unknown layout values', () => {
            const w = apperr.UIPreferencesConfig.createFrom({ theme: 'auto', layout: 'grid', sidebarCollapsed: false, historyOpen: false, viewMode: 'preview' });
            expect(fromWireUIPreferences(w).layout).toBe('side');
        });
    });

    describe('viewMode field', () => {
        it('passes through "preview"', () => {
            const w = apperr.UIPreferencesConfig.createFrom({ theme: 'auto', layout: 'side', sidebarCollapsed: false, historyOpen: false, viewMode: 'preview' });
            expect(fromWireUIPreferences(w).viewMode).toBe('preview');
        });

        it('passes through "source"', () => {
            const w = apperr.UIPreferencesConfig.createFrom({ theme: 'auto', layout: 'side', sidebarCollapsed: false, historyOpen: false, viewMode: 'source' });
            expect(fromWireUIPreferences(w).viewMode).toBe('source');
        });

        it('passes through "diff"', () => {
            const w = apperr.UIPreferencesConfig.createFrom({ theme: 'auto', layout: 'side', sidebarCollapsed: false, historyOpen: false, viewMode: 'diff' });
            expect(fromWireUIPreferences(w).viewMode).toBe('diff');
        });

        it('defaults to "preview" for unknown viewMode values', () => {
            const w = apperr.UIPreferencesConfig.createFrom({ theme: 'auto', layout: 'side', sidebarCollapsed: false, historyOpen: false, viewMode: 'split' });
            expect(fromWireUIPreferences(w).viewMode).toBe('preview');
        });
    });

    describe('boolean fields', () => {
        it('maps sidebarCollapsed=true as Boolean true', () => {
            const w = apperr.UIPreferencesConfig.createFrom({ theme: 'auto', layout: 'side', sidebarCollapsed: true, historyOpen: false, viewMode: 'preview' });
            expect(fromWireUIPreferences(w).sidebarCollapsed).toBe(true);
        });

        it('maps sidebarCollapsed=false as Boolean false', () => {
            const w = apperr.UIPreferencesConfig.createFrom({ theme: 'auto', layout: 'side', sidebarCollapsed: false, historyOpen: false, viewMode: 'preview' });
            expect(fromWireUIPreferences(w).sidebarCollapsed).toBe(false);
        });

        it('maps historyOpen=true as Boolean true', () => {
            const w = apperr.UIPreferencesConfig.createFrom({ theme: 'auto', layout: 'side', sidebarCollapsed: false, historyOpen: true, viewMode: 'preview' });
            expect(fromWireUIPreferences(w).historyOpen).toBe(true);
        });

        it('maps historyOpen=false as Boolean false', () => {
            const w = apperr.UIPreferencesConfig.createFrom({ theme: 'auto', layout: 'side', sidebarCollapsed: false, historyOpen: false, viewMode: 'preview' });
            expect(fromWireUIPreferences(w).historyOpen).toBe(false);
        });
    });

    describe('toWireUIPreferences', () => {
        it('round-trips all 5 fields', () => {
            const domain: UIPreferencesConfig = {
                theme: 'dark',
                layout: 'stacked',
                sidebarCollapsed: true,
                historyOpen: true,
                viewMode: 'diff',
            };
            const wire = toWireUIPreferences(domain);
            expect(wire.theme).toBe('dark');
            expect(wire.layout).toBe('stacked');
            expect(wire.sidebarCollapsed).toBe(true);
            expect(wire.historyOpen).toBe(true);
            expect(wire.viewMode).toBe('diff');
        });

        it('maps all fields for light/side/preview combination', () => {
            const domain: UIPreferencesConfig = {
                theme: 'light',
                layout: 'side',
                sidebarCollapsed: false,
                historyOpen: false,
                viewMode: 'preview',
            };
            const wire = toWireUIPreferences(domain);
            expect(wire.theme).toBe('light');
            expect(wire.layout).toBe('side');
            expect(wire.sidebarCollapsed).toBe(false);
            expect(wire.historyOpen).toBe(false);
            expect(wire.viewMode).toBe('preview');
        });
    });
});
