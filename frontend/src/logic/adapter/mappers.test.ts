import { apperr } from '../../../wailsjs/go/models';
import { fromWireBehavior, fromWireMetadata, fromWireProvider, toWireBehavior, toWireProvider } from './mappers';

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
        const w = apperr.AppBehaviorConfig.createFrom({
            enableTaskLogging: true,
            historyEnabled: true,
            historyMaxEntries: 50,
        });
        const b = fromWireBehavior(w);
        expect(b.enableTaskLogging).toBe(true);
        expect(b.logDirectory).toBe('');
        expect(b.historyEnabled).toBe(true);
        expect(b.historyMaxEntries).toBe(50);
    });

    it('toWireBehavior omits logDirectory and preserves historyEnabled/historyMaxEntries', () => {
        const w = toWireBehavior({
            enableTaskLogging: false,
            logDirectory: '/some/path',
            historyEnabled: true,
            historyMaxEntries: 100,
        });
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
