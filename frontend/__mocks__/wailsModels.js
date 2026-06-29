// Mock for Wails auto-generated models — mirrors the real apperr namespace
// so tests can import { apperr } from '...wailsjs/go/models' without ES module issues.
// eslint-disable-next-line no-undef
const ErrorCode = {
    CodeAuth: 'auth',
    CodeBusy: 'busy',
    CodeCancelled: 'cancelled',
    CodeContextWindow: 'context_window',
    CodeEmptyCompletion: 'empty_completion',
    CodeInternal: 'internal',
    CodeInvalidPlan: 'invalid_plan',
    CodeMissingCredential: 'missing_credential',
    CodeModelNotFound: 'model_not_found',
    CodeProviderUnreachable: 'provider_unreachable',
    CodeRateLimited: 'rate_limited',
    CodeStepFailed: 'step_failed',
    CodeTimeout: 'timeout',
    CodeUpstream: 'upstream',
    CodeValidation: 'validation',
};

class WireError {
    constructor(source = {}) {
        this.code = source['code'];
        this.title = source['title'] ?? '';
        this.message = source['message'] ?? '';
        this.details = source['details'];
        this.retryable = source['retryable'] ?? false;
    }

    static createFrom(source = {}) {
        return new WireError(source);
    }
}

class ProviderConfig {
    constructor(source = {}) {
        if (typeof source === 'string') source = JSON.parse(source);
        this.id = source['id'];
        this.name = source['name'];
        this.kind = source['kind'];
        this.baseUrl = source['baseUrl'];
        this.authScheme = source['authScheme'];
        this.apiKeyEnvVar = source['apiKeyEnvVar'] ?? '';
        this.apiVersion = source['apiVersion'] ?? '';
        this.selectedModel = source['selectedModel'] ?? '';
        this.completionPath = source['completionPath'];
        this.modelsPath = source['modelsPath'];
        this.useCustomModels = source['useCustomModels'] ?? false;
        this.headers = source['headers'] ?? {};
        this.customModels = source['customModels'] ?? [];
        this.createdAt = source['createdAt'] ?? 0;
        this.updatedAt = source['updatedAt'] ?? 0;
    }

    static createFrom(source = {}) {
        return new ProviderConfig(source);
    }
}

class AppBehaviorConfig {
    constructor(source = {}) {
        if (typeof source === 'string') source = JSON.parse(source);
        this.enableTaskLogging = source['enableTaskLogging'] ?? false;
        this.historyEnabled = source['historyEnabled'] ?? false;
        this.historyMaxEntries = source['historyMaxEntries'] ?? 0;
    }

    static createFrom(source = {}) {
        return new AppBehaviorConfig(source);
    }
}

class AppSettingsMetadata {
    constructor(source = {}) {
        if (typeof source === 'string') source = JSON.parse(source);
        this.authSchemes = source['authSchemes'] ?? [];
        this.providerKinds = source['providerKinds'] ?? [];
        this.settingsFolder = source['settingsFolder'] ?? '';
        this.databaseFile = source['databaseFile'] ?? '';
        this.logsFolder = source['logsFolder'] ?? '';
        this.appVersion = source['appVersion'] ?? '';
    }

    static createFrom(source = {}) {
        return new AppSettingsMetadata(source);
    }
}

class InferenceBaseConfig {
    constructor(source = {}) {
        if (typeof source === 'string') source = JSON.parse(source);
        this.timeout = source['timeout'] ?? 0;
        this.maxRetries = source['maxRetries'] ?? 0;
        this.useMarkdownForOutput = source['useMarkdownForOutput'] ?? false;
    }

    static createFrom(source = {}) {
        return new InferenceBaseConfig(source);
    }
}

class LanguageConfig {
    constructor(source = {}) {
        if (typeof source === 'string') source = JSON.parse(source);
        this.languages = source['languages'] ?? [];
        this.defaultInputLanguage = source['defaultInputLanguage'] ?? '';
        this.defaultOutputLanguage = source['defaultOutputLanguage'] ?? '';
    }

    static createFrom(source = {}) {
        return new LanguageConfig(source);
    }
}

class ModelConfig {
    constructor(source = {}) {
        if (typeof source === 'string') source = JSON.parse(source);
        this.name = source['name'] ?? '';
        this.useTemperature = source['useTemperature'] ?? false;
        this.temperature = source['temperature'] ?? 0;
        this.useContextWindow = source['useContextWindow'] ?? false;
        this.contextWindow = source['contextWindow'] ?? 0;
        this.useLegacyMaxTokens = source['useLegacyMaxTokens'] ?? false;
    }

    static createFrom(source = {}) {
        return new ModelConfig(source);
    }
}

class Settings {
    constructor(source = {}) {
        if (typeof source === 'string') source = JSON.parse(source);
        this.availableProviderConfigs = (source['availableProviderConfigs'] ?? []).map(
            (p) => new ProviderConfig(p)
        );
        this.currentProviderConfig = new ProviderConfig(source['currentProviderConfig'] ?? {});
        this.inferenceBaseConfig = new InferenceBaseConfig(source['inferenceBaseConfig'] ?? {});
        this.modelConfig = new ModelConfig(source['modelConfig'] ?? {});
        this.languageConfig = new LanguageConfig(source['languageConfig'] ?? {});
        this.appBehaviorConfig = new AppBehaviorConfig(source['appBehaviorConfig'] ?? {});
    }

    static createFrom(source = {}) {
        return new Settings(source);
    }
}

class PromptPreviewRequest {
    constructor(source = {}) {
        if (typeof source === 'string') source = JSON.parse(source);
        this.actionId = source['actionId'];
        this.stackId = source['stackId'];
        this.steps = source['steps'];
        this.useMarkdown = source['useMarkdown'] ?? false;
        this.inputLanguageId = source['inputLanguageId'] ?? '';
        this.outputLanguageId = source['outputLanguageId'] ?? '';
        this.sampleInput = source['sampleInput'];
    }

    static createFrom(source = {}) {
        return new PromptPreviewRequest(source);
    }
}

class ChainStep {
    constructor(source = {}) {
        if (typeof source === 'string') source = JSON.parse(source);
        this.actionId = source['actionId'];
        this.targetModel = source['targetModel'];
        this.goal = source['goal'];
    }

    static createFrom(source = {}) {
        return new ChainStep(source);
    }
}

class ChainRequest {
    constructor(source = {}) {
        if (typeof source === 'string') source = JSON.parse(source);
        this.runId = source['runId'];
        this.inputText = source['inputText'];
        this.steps = source['steps'] ?? [];
        this.inputLanguageId = source['inputLanguageId'];
        this.outputLanguageId = source['outputLanguageId'];
        this.useMarkdown = source['useMarkdown'] ?? false;
    }

    static createFrom(source = {}) {
        return new ChainRequest(source);
    }
}

class SavedStack {
    constructor(source = {}) {
        if (typeof source === 'string') source = JSON.parse(source);
        this.id = source['id'] ?? '';
        this.name = source['name'] ?? '';
        this.icon = source['icon'] ?? '';
        this.steps = source['steps'] ?? [];
        this.defaultFormat = source['defaultFormat'] ?? '';
        this.defaultInLang = source['defaultInLang'] ?? '';
        this.defaultOutLang = source['defaultOutLang'] ?? '';
        this.createdAt = source['createdAt'] ?? 0;
        this.updatedAt = source['updatedAt'] ?? 0;
    }

    static createFrom(source = {}) {
        return new SavedStack(source);
    }
}

// eslint-disable-next-line no-undef
module.exports = {
    apperr: {
        ErrorCode,
        WireError,
        ProviderConfig,
        AppBehaviorConfig,
        AppSettingsMetadata,
        InferenceBaseConfig,
        LanguageConfig,
        ModelConfig,
        Settings,
        PromptPreviewRequest,
        SavedStack,
        ChainStep,
        ChainRequest,
    },
};
