export namespace apperr {
	
	export enum ErrorCode {
	    CodeAuth = "auth",
	    CodeBusy = "busy",
	    CodeCancelled = "cancelled",
	    CodeContextWindow = "context_window",
	    CodeEmptyCompletion = "empty_completion",
	    CodeInternal = "internal",
	    CodeInvalidPlan = "invalid_plan",
	    CodeMissingCredential = "missing_credential",
	    CodeModelNotFound = "model_not_found",
	    CodeProviderUnreachable = "provider_unreachable",
	    CodeRateLimited = "rate_limited",
	    CodeStepFailed = "step_failed",
	    CodeTimeout = "timeout",
	    CodeUpstream = "upstream",
	    CodeValidation = "validation",
	}
	export class ActionMeta {
	    id: string;
	    name: string;
	    category: string;
	    family: string;
	    directive: string;
	    orderRank: number;
	    exclusivityGroup: string;
	    mergeable: boolean;
	    terminal: boolean;
	    requires: string[];
	
	    static createFrom(source: any = {}) {
	        return new ActionMeta(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.category = source["category"];
	        this.family = source["family"];
	        this.directive = source["directive"];
	        this.orderRank = source["orderRank"];
	        this.exclusivityGroup = source["exclusivityGroup"];
	        this.mergeable = source["mergeable"];
	        this.terminal = source["terminal"];
	        this.requires = source["requires"];
	    }
	}
	export class AppBehaviorConfig {
	    enableTaskLogging: boolean;
	    historyEnabled: boolean;
	    historyMaxEntries: number;
	
	    static createFrom(source: any = {}) {
	        return new AppBehaviorConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.enableTaskLogging = source["enableTaskLogging"];
	        this.historyEnabled = source["historyEnabled"];
	        this.historyMaxEntries = source["historyMaxEntries"];
	    }
	}
	export class WireError {
	    code: ErrorCode;
	    title: string;
	    message: string;
	    details?: Record<string, string>;
	    retryable: boolean;
	
	    static createFrom(source: any = {}) {
	        return new WireError(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.code = source["code"];
	        this.title = source["title"];
	        this.message = source["message"];
	        this.details = source["details"];
	        this.retryable = source["retryable"];
	    }
	}
	export class AppBehaviorResult {
	    data?: AppBehaviorConfig;
	    error?: WireError;
	
	    static createFrom(source: any = {}) {
	        return new AppBehaviorResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.data = this.convertValues(source["data"], AppBehaviorConfig);
	        this.error = this.convertValues(source["error"], WireError);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class AppSettingsMetadata {
	    authSchemes: string[];
	    providerKinds: string[];
	    settingsFolder: string;
	    databaseFile: string;
	    logsFolder: string;
	    appVersion: string;
	
	    static createFrom(source: any = {}) {
	        return new AppSettingsMetadata(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.authSchemes = source["authSchemes"];
	        this.providerKinds = source["providerKinds"];
	        this.settingsFolder = source["settingsFolder"];
	        this.databaseFile = source["databaseFile"];
	        this.logsFolder = source["logsFolder"];
	        this.appVersion = source["appVersion"];
	    }
	}
	export class AppliedAction {
	    id: string;
	    name: string;
	    category: string;
	
	    static createFrom(source: any = {}) {
	        return new AppliedAction(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.category = source["category"];
	    }
	}
	export class CatalogResult {
	    data: ActionMeta[];
	    error?: WireError;
	
	    static createFrom(source: any = {}) {
	        return new CatalogResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.data = this.convertValues(source["data"], ActionMeta);
	        this.error = this.convertValues(source["error"], WireError);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ChainStep {
	    actionId: string;
	    targetModel?: string;
	    goal?: string;
	
	    static createFrom(source: any = {}) {
	        return new ChainStep(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.actionId = source["actionId"];
	        this.targetModel = source["targetModel"];
	        this.goal = source["goal"];
	    }
	}
	export class ChainRequest {
	    runId: string;
	    inputText: string;
	    steps: ChainStep[];
	    inputLanguageId: string;
	    outputLanguageId: string;
	    useMarkdown: boolean;
	
	    static createFrom(source: any = {}) {
	        return new ChainRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.runId = source["runId"];
	        this.inputText = source["inputText"];
	        this.steps = this.convertValues(source["steps"], ChainStep);
	        this.inputLanguageId = source["inputLanguageId"];
	        this.outputLanguageId = source["outputLanguageId"];
	        this.useMarkdown = source["useMarkdown"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ChainResult {
	    finalText: string;
	    completed: number;
	    failedIndex?: number;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new ChainResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.finalText = source["finalText"];
	        this.completed = source["completed"];
	        this.failedIndex = source["failedIndex"];
	        this.error = source["error"];
	    }
	}
	export class ChainResultEnv {
	    data?: ChainResult;
	    error?: WireError;
	
	    static createFrom(source: any = {}) {
	        return new ChainResultEnv(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.data = this.convertValues(source["data"], ChainResult);
	        this.error = this.convertValues(source["error"], WireError);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class HistoryEntry {
	    id: string;
	    createdAt: number;
	    kind: string;
	    title: string;
	    inputText: string;
	    outputText: string;
	    applied: AppliedAction[];
	    providerName: string;
	    model: string;
	    inputLang: string;
	    outputLang: string;
	    format: string;
	    durationMs: number;
	    inferences: number;
	    status: string;
	    errorCode: string;
	    failedIndex: number;
	
	    static createFrom(source: any = {}) {
	        return new HistoryEntry(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.createdAt = source["createdAt"];
	        this.kind = source["kind"];
	        this.title = source["title"];
	        this.inputText = source["inputText"];
	        this.outputText = source["outputText"];
	        this.applied = this.convertValues(source["applied"], AppliedAction);
	        this.providerName = source["providerName"];
	        this.model = source["model"];
	        this.inputLang = source["inputLang"];
	        this.outputLang = source["outputLang"];
	        this.format = source["format"];
	        this.durationMs = source["durationMs"];
	        this.inferences = source["inferences"];
	        this.status = source["status"];
	        this.errorCode = source["errorCode"];
	        this.failedIndex = source["failedIndex"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class HistoryEntryResult {
	    data?: HistoryEntry;
	    error?: WireError;
	
	    static createFrom(source: any = {}) {
	        return new HistoryEntryResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.data = this.convertValues(source["data"], HistoryEntry);
	        this.error = this.convertValues(source["error"], WireError);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class HistoryListResult {
	    data: HistoryEntry[];
	    error?: WireError;
	
	    static createFrom(source: any = {}) {
	        return new HistoryListResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.data = this.convertValues(source["data"], HistoryEntry);
	        this.error = this.convertValues(source["error"], WireError);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class InferenceBaseConfig {
	    timeout: number;
	    maxRetries: number;
	    useMarkdownForOutput: boolean;
	
	    static createFrom(source: any = {}) {
	        return new InferenceBaseConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.timeout = source["timeout"];
	        this.maxRetries = source["maxRetries"];
	        this.useMarkdownForOutput = source["useMarkdownForOutput"];
	    }
	}
	export class InferenceResult {
	    data?: InferenceBaseConfig;
	    error?: WireError;
	
	    static createFrom(source: any = {}) {
	        return new InferenceResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.data = this.convertValues(source["data"], InferenceBaseConfig);
	        this.error = this.convertValues(source["error"], WireError);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class LanguageConfig {
	    languages: string[];
	    defaultInputLanguage: string;
	    defaultOutputLanguage: string;
	
	    static createFrom(source: any = {}) {
	        return new LanguageConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.languages = source["languages"];
	        this.defaultInputLanguage = source["defaultInputLanguage"];
	        this.defaultOutputLanguage = source["defaultOutputLanguage"];
	    }
	}
	export class LanguageResult {
	    data?: LanguageConfig;
	    error?: WireError;
	
	    static createFrom(source: any = {}) {
	        return new LanguageResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.data = this.convertValues(source["data"], LanguageConfig);
	        this.error = this.convertValues(source["error"], WireError);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class LanguagesResult {
	    data: string[];
	    error?: WireError;
	
	    static createFrom(source: any = {}) {
	        return new LanguagesResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.data = source["data"];
	        this.error = this.convertValues(source["error"], WireError);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class LoggingConfig {
	    logFileEnabled: boolean;
	    logLevel: string;
	    logDirectory: string;
	    logMaxSizeMB: number;
	    logMaxBackups: number;
	    logMaxAgeDays: number;
	    logCompress: boolean;
	
	    static createFrom(source: any = {}) {
	        return new LoggingConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.logFileEnabled = source["logFileEnabled"];
	        this.logLevel = source["logLevel"];
	        this.logDirectory = source["logDirectory"];
	        this.logMaxSizeMB = source["logMaxSizeMB"];
	        this.logMaxBackups = source["logMaxBackups"];
	        this.logMaxAgeDays = source["logMaxAgeDays"];
	        this.logCompress = source["logCompress"];
	    }
	}
	export class LoggingResult {
	    data?: LoggingConfig;
	    error?: WireError;
	
	    static createFrom(source: any = {}) {
	        return new LoggingResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.data = this.convertValues(source["data"], LoggingConfig);
	        this.error = this.convertValues(source["error"], WireError);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class MetadataResult {
	    data?: AppSettingsMetadata;
	    error?: WireError;
	
	    static createFrom(source: any = {}) {
	        return new MetadataResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.data = this.convertValues(source["data"], AppSettingsMetadata);
	        this.error = this.convertValues(source["error"], WireError);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ModelCaps {
	    maxPromptTokens?: number;
	    supportsTemperature?: boolean;
	    supportsSystemPrompt?: boolean;
	
	    static createFrom(source: any = {}) {
	        return new ModelCaps(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.maxPromptTokens = source["maxPromptTokens"];
	        this.supportsTemperature = source["supportsTemperature"];
	        this.supportsSystemPrompt = source["supportsSystemPrompt"];
	    }
	}
	export class ModelConfig {
	    name: string;
	    useTemperature: boolean;
	    temperature: number;
	    useContextWindow: boolean;
	    contextWindow: number;
	    useLegacyMaxTokens: boolean;
	
	    static createFrom(source: any = {}) {
	        return new ModelConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.useTemperature = source["useTemperature"];
	        this.temperature = source["temperature"];
	        this.useContextWindow = source["useContextWindow"];
	        this.contextWindow = source["contextWindow"];
	        this.useLegacyMaxTokens = source["useLegacyMaxTokens"];
	    }
	}
	export class ModelConfigResult {
	    data?: ModelConfig;
	    error?: WireError;
	
	    static createFrom(source: any = {}) {
	        return new ModelConfigResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.data = this.convertValues(source["data"], ModelConfig);
	        this.error = this.convertValues(source["error"], WireError);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ModelInfo {
	    id: string;
	    label: string;
	    caps?: ModelCaps;
	
	    static createFrom(source: any = {}) {
	        return new ModelInfo(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.label = source["label"];
	        this.caps = this.convertValues(source["caps"], ModelCaps);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ModelsResult {
	    data: ModelInfo[];
	    error?: WireError;
	
	    static createFrom(source: any = {}) {
	        return new ModelsResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.data = this.convertValues(source["data"], ModelInfo);
	        this.error = this.convertValues(source["error"], WireError);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class PreviewParams {
	    model: string;
	    temperature?: number;
	    format: string;
	    inputLang?: string;
	    outputLang?: string;
	    tokenParam: string;
	    stream: boolean;
	
	    static createFrom(source: any = {}) {
	        return new PreviewParams(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.model = source["model"];
	        this.temperature = source["temperature"];
	        this.format = source["format"];
	        this.inputLang = source["inputLang"];
	        this.outputLang = source["outputLang"];
	        this.tokenParam = source["tokenParam"];
	        this.stream = source["stream"];
	    }
	}
	export class PreviewGroup {
	    index: number;
	    family: string;
	    appliedActions: AppliedAction[];
	    systemPrompt: string;
	    userPrompt: string;
	    parameters: PreviewParams;
	
	    static createFrom(source: any = {}) {
	        return new PreviewGroup(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.index = source["index"];
	        this.family = source["family"];
	        this.appliedActions = this.convertValues(source["appliedActions"], AppliedAction);
	        this.systemPrompt = source["systemPrompt"];
	        this.userPrompt = source["userPrompt"];
	        this.parameters = this.convertValues(source["parameters"], PreviewParams);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	export class PromptPreview {
	    kind: string;
	    inferences: number;
	    groups: PreviewGroup[];
	    summary: string;
	
	    static createFrom(source: any = {}) {
	        return new PromptPreview(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.kind = source["kind"];
	        this.inferences = source["inferences"];
	        this.groups = this.convertValues(source["groups"], PreviewGroup);
	        this.summary = source["summary"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class PromptPreviewRequest {
	    actionId?: string;
	    steps?: ChainStep[];
	    stackId?: string;
	    useMarkdown: boolean;
	    inputLanguageId: string;
	    outputLanguageId: string;
	    sampleInput?: string;
	
	    static createFrom(source: any = {}) {
	        return new PromptPreviewRequest(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.actionId = source["actionId"];
	        this.steps = this.convertValues(source["steps"], ChainStep);
	        this.stackId = source["stackId"];
	        this.useMarkdown = source["useMarkdown"];
	        this.inputLanguageId = source["inputLanguageId"];
	        this.outputLanguageId = source["outputLanguageId"];
	        this.sampleInput = source["sampleInput"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class PromptPreviewResult {
	    data?: PromptPreview;
	    error?: WireError;
	
	    static createFrom(source: any = {}) {
	        return new PromptPreviewResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.data = this.convertValues(source["data"], PromptPreview);
	        this.error = this.convertValues(source["error"], WireError);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ProviderConfig {
	    id: string;
	    name: string;
	    kind: string;
	    baseUrl: string;
	    authScheme: string;
	    apiKeyEnvVar: string;
	    apiVersion: string;
	    selectedModel: string;
	    completionPath: string;
	    modelsPath: string;
	    useCustomModels: boolean;
	    headers: Record<string, string>;
	    customModels: string[];
	    createdAt: number;
	    updatedAt: number;
	
	    static createFrom(source: any = {}) {
	        return new ProviderConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.kind = source["kind"];
	        this.baseUrl = source["baseUrl"];
	        this.authScheme = source["authScheme"];
	        this.apiKeyEnvVar = source["apiKeyEnvVar"];
	        this.apiVersion = source["apiVersion"];
	        this.selectedModel = source["selectedModel"];
	        this.completionPath = source["completionPath"];
	        this.modelsPath = source["modelsPath"];
	        this.useCustomModels = source["useCustomModels"];
	        this.headers = source["headers"];
	        this.customModels = source["customModels"];
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	    }
	}
	export class ProviderPreset {
	    name: string;
	    kind: string;
	    baseUrl: string;
	    authScheme: string;
	    completionPath: string;
	    modelsPath: string;
	    apiKeyEnvVar: string;
	    headers: string;
	
	    static createFrom(source: any = {}) {
	        return new ProviderPreset(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.kind = source["kind"];
	        this.baseUrl = source["baseUrl"];
	        this.authScheme = source["authScheme"];
	        this.completionPath = source["completionPath"];
	        this.modelsPath = source["modelsPath"];
	        this.apiKeyEnvVar = source["apiKeyEnvVar"];
	        this.headers = source["headers"];
	    }
	}
	export class ProviderPresetsResult {
	    data?: ProviderPreset[];
	    error?: WireError;
	
	    static createFrom(source: any = {}) {
	        return new ProviderPresetsResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.data = this.convertValues(source["data"], ProviderPreset);
	        this.error = this.convertValues(source["error"], WireError);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ProviderResult {
	    data?: ProviderConfig;
	    error?: WireError;
	
	    static createFrom(source: any = {}) {
	        return new ProviderResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.data = this.convertValues(source["data"], ProviderConfig);
	        this.error = this.convertValues(source["error"], WireError);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ProvidersResult {
	    data: ProviderConfig[];
	    error?: WireError;
	
	    static createFrom(source: any = {}) {
	        return new ProvidersResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.data = this.convertValues(source["data"], ProviderConfig);
	        this.error = this.convertValues(source["error"], WireError);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class SavedStack {
	    id: string;
	    name: string;
	    icon: string;
	    steps: string[];
	    defaultFormat: string;
	    defaultInLang: string;
	    defaultOutLang: string;
	    createdAt: number;
	    updatedAt: number;
	
	    static createFrom(source: any = {}) {
	        return new SavedStack(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.icon = source["icon"];
	        this.steps = source["steps"];
	        this.defaultFormat = source["defaultFormat"];
	        this.defaultInLang = source["defaultInLang"];
	        this.defaultOutLang = source["defaultOutLang"];
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	    }
	}
	export class Settings {
	    availableProviderConfigs: ProviderConfig[];
	    currentProviderConfig: ProviderConfig;
	    inferenceBaseConfig: InferenceBaseConfig;
	    modelConfig: ModelConfig;
	    languageConfig: LanguageConfig;
	    appBehaviorConfig: AppBehaviorConfig;
	
	    static createFrom(source: any = {}) {
	        return new Settings(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.availableProviderConfigs = this.convertValues(source["availableProviderConfigs"], ProviderConfig);
	        this.currentProviderConfig = this.convertValues(source["currentProviderConfig"], ProviderConfig);
	        this.inferenceBaseConfig = this.convertValues(source["inferenceBaseConfig"], InferenceBaseConfig);
	        this.modelConfig = this.convertValues(source["modelConfig"], ModelConfig);
	        this.languageConfig = this.convertValues(source["languageConfig"], LanguageConfig);
	        this.appBehaviorConfig = this.convertValues(source["appBehaviorConfig"], AppBehaviorConfig);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class SettingsResult {
	    data?: Settings;
	    error?: WireError;
	
	    static createFrom(source: any = {}) {
	        return new SettingsResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.data = this.convertValues(source["data"], Settings);
	        this.error = this.convertValues(source["error"], WireError);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class StackResult {
	    data?: SavedStack;
	    error?: WireError;
	
	    static createFrom(source: any = {}) {
	        return new StackResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.data = this.convertValues(source["data"], SavedStack);
	        this.error = this.convertValues(source["error"], WireError);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class StacksResult {
	    data: SavedStack[];
	    error?: WireError;
	
	    static createFrom(source: any = {}) {
	        return new StacksResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.data = this.convertValues(source["data"], SavedStack);
	        this.error = this.convertValues(source["error"], WireError);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class StringResult {
	    data: string;
	    error?: WireError;
	
	    static createFrom(source: any = {}) {
	        return new StringResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.data = source["data"];
	        this.error = this.convertValues(source["error"], WireError);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class SuggestedStack {
	    name: string;
	    icon: string;
	    actionIds: string[];
	    actionNames: string[];
	
	    static createFrom(source: any = {}) {
	        return new SuggestedStack(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.icon = source["icon"];
	        this.actionIds = source["actionIds"];
	        this.actionNames = source["actionNames"];
	    }
	}
	export class SuggestedStacksResult {
	    data?: SuggestedStack[];
	    error?: WireError;
	
	    static createFrom(source: any = {}) {
	        return new SuggestedStacksResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.data = this.convertValues(source["data"], SuggestedStack);
	        this.error = this.convertValues(source["error"], WireError);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class UIPreferencesConfig {
	    theme: string;
	    layout: string;
	    sidebarCollapsed: boolean;
	    historyOpen: boolean;
	    viewMode: string;
	
	    static createFrom(source: any = {}) {
	        return new UIPreferencesConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.theme = source["theme"];
	        this.layout = source["layout"];
	        this.sidebarCollapsed = source["sidebarCollapsed"];
	        this.historyOpen = source["historyOpen"];
	        this.viewMode = source["viewMode"];
	    }
	}
	export class UIPreferencesResult {
	    data?: UIPreferencesConfig;
	    error?: WireError;
	
	    static createFrom(source: any = {}) {
	        return new UIPreferencesResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.data = this.convertValues(source["data"], UIPreferencesConfig);
	        this.error = this.convertValues(source["error"], WireError);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class VerifyOutcome {
	    check: string;
	    ok: boolean;
	    durationMs: number;
	    modelCount?: number;
	    sample?: string;
	
	    static createFrom(source: any = {}) {
	        return new VerifyOutcome(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.check = source["check"];
	        this.ok = source["ok"];
	        this.durationMs = source["durationMs"];
	        this.modelCount = source["modelCount"];
	        this.sample = source["sample"];
	    }
	}
	export class VerifyResult {
	    data?: VerifyOutcome;
	    error?: WireError;
	
	    static createFrom(source: any = {}) {
	        return new VerifyResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.data = this.convertValues(source["data"], VerifyOutcome);
	        this.error = this.convertValues(source["error"], WireError);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class VoidResult {
	    error?: WireError;
	
	    static createFrom(source: any = {}) {
	        return new VoidResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.error = this.convertValues(source["error"], WireError);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

export namespace logging {
	
	export class Logger {
	
	
	    static createFrom(source: any = {}) {
	        return new Logger(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	
	    }
	}

}

export namespace settings {
	
	export class ProviderConfig {
	    id: string;
	    name: string;
	    kind: string;
	    baseUrl: string;
	    authScheme: string;
	    apiKeyEnvVar: string;
	    apiVersion: string;
	    selectedModel: string;
	    completionPath: string;
	    modelsPath: string;
	    useCustomModels: boolean;
	    headers: Record<string, string>;
	    customModels: string[];
	    createdAt: number;
	    updatedAt: number;
	
	    static createFrom(source: any = {}) {
	        return new ProviderConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.name = source["name"];
	        this.kind = source["kind"];
	        this.baseUrl = source["baseUrl"];
	        this.authScheme = source["authScheme"];
	        this.apiKeyEnvVar = source["apiKeyEnvVar"];
	        this.apiVersion = source["apiVersion"];
	        this.selectedModel = source["selectedModel"];
	        this.completionPath = source["completionPath"];
	        this.modelsPath = source["modelsPath"];
	        this.useCustomModels = source["useCustomModels"];
	        this.headers = source["headers"];
	        this.customModels = source["customModels"];
	        this.createdAt = source["createdAt"];
	        this.updatedAt = source["updatedAt"];
	    }
	}

}

export namespace zerolog {
	
	export class Logger {
	
	
	    static createFrom(source: any = {}) {
	        return new Logger(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	
	    }
	}

}

