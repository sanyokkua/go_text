import { action, settings } from '../../../../wailsjs/go/models';
import {
    FrontAction,
    FrontActionRequest,
    FrontActions,
    FrontGroup,
    FrontLanguageConfig,
    FrontModelConfig,
    FrontProviderConfig,
    FrontSettings,
} from './models';

/**
 * Converts a frontend Action to a backend action.Action
 * @param input - Frontend action to convert
 * @returns Backend action.Action instance
 */
export const toBackendAction = (input: FrontAction): action.Action => {
    return action.Action.createFrom({ id: input.id, text: input.text });
};

/**
 * Converts a backend action.Action to a frontend Action
 * @param input - Backend action to convert
 * @returns Frontend Action instance
 */
export const fromBackendAction = (input: action.Action): FrontAction => {
    return { id: input.id, text: input.text };
};

/**
 * Converts a frontend ActionRequest to a backend action.ActionRequest
 * @param input - Frontend action request to convert
 * @returns Backend action.ActionRequest instance
 */
export const toBackendActionRequest = (input: FrontActionRequest): action.ActionRequest => {
    return action.ActionRequest.createFrom({
        id: input.id,
        inputText: input.inputText,
        outputText: input.outputText,
        inputLanguageId: input.inputLanguageId,
        outputLanguageId: input.outputLanguageId,
    });
};

/**
 * Converts a backend action.ActionRequest to a frontend ActionRequest
 * @param input - Backend action request to convert
 * @returns Frontend ActionRequest instance
 */
export const fromBackendActionRequest = (input: action.ActionRequest): FrontActionRequest => {
    return {
        id: input.id,
        inputText: input.inputText,
        ...(input.outputText !== undefined && { outputText: input.outputText }),
        ...(input.inputLanguageId !== undefined && { inputLanguageId: input.inputLanguageId }),
        ...(input.outputLanguageId !== undefined && { outputLanguageId: input.outputLanguageId }),
    };
};

/**
 * Converts a frontend Group to a backend action.Group
 * @param input - Frontend group to convert
 * @returns Backend action.Group instance
 */
export const toBackendGroup = (input: FrontGroup): action.Group => {
    return action.Group.createFrom({ groupName: input.groupName, groupActions: input.groupActions.map(toBackendAction) });
};

/**
 * Converts a backend action.Group to a frontend Group
 * @param input - Backend group to convert
 * @returns Frontend Group instance
 */
export const fromBackendGroup = (input: action.Group): FrontGroup => {
    return { groupName: input.groupName, groupActions: input.groupActions.map(fromBackendAction) };
};

/**
 * Converts frontend Actions to backend action.Actions
 * @param input - Frontend actions to convert
 * @returns Backend action.Actions instance
 */
export const toBackendActions = (input: FrontActions): action.Actions => {
    return action.Actions.createFrom({ actionGroups: input.actionGroups.map(toBackendGroup) });
};

/**
 * Converts backend action.Actions to frontend Actions
 * @param input - Backend actions to convert
 * @returns Frontend Actions instance
 */
export const fromBackendActions = (input: action.Actions): FrontActions => {
    return { actionGroups: input.actionGroups.map(fromBackendGroup) };
};

/**
 * Converts a frontend LanguageConfig to a backend settings.LanguageConfig
 * @param input - Frontend language config to convert
 * @returns Backend settings.LanguageConfig instance
 */
export const toBackendLanguageConfig = (input: FrontLanguageConfig): settings.LanguageConfig => {
    return settings.LanguageConfig.createFrom({
        languages: input.languages,
        defaultInputLanguage: input.defaultInputLanguage,
        defaultOutputLanguage: input.defaultOutputLanguage,
    });
};

/**
 * Converts a backend settings.LanguageConfig to a frontend LanguageConfig
 * @param input - Backend language config to convert
 * @returns Frontend LanguageConfig instance
 */
export const fromBackendLanguageConfig = (input: settings.LanguageConfig): FrontLanguageConfig => {
    return { languages: input.languages, defaultInputLanguage: input.defaultInputLanguage, defaultOutputLanguage: input.defaultOutputLanguage };
};

/**
 * Converts a frontend ModelConfig to a backend setting.LlmModelConfig
 * @param input - Frontend model config to convert
 * @returns Backend settings.LlmModelConfig instance
 */
export const toBackendModelConfig = (input: FrontModelConfig): settings.LlmModelConfig => {
    return settings.LlmModelConfig.createFrom({
        modelName: input.modelName,
        isTemperatureEnabled: input.isTemperatureEnabled,
        temperature: input.temperature,
    });
};

/**
 * Converts a backend settings.LlmModelConfig to a frontend ModelConfig
 * @param input - Backend model config to convert
 * @returns Frontend ModelConfig instance
 */
export const fromBackendModelConfig = (input: settings.LlmModelConfig): FrontModelConfig => {
    return { modelName: input.modelName, isTemperatureEnabled: input.isTemperatureEnabled, temperature: input.temperature };
};

/**
 * Converts a frontend ProviderConfig to a backend settings.ProviderConfig
 * @param input - Frontend provider config to convert
 * @returns Backend settings.ProviderConfig instance
 */
export const toBackendProviderConfig = (input: FrontProviderConfig): settings.ProviderConfig => {
    return settings.ProviderConfig.createFrom({
        providerName: input.providerName,
        providerType: input.providerType,
        baseUrl: input.baseUrl,
        modelsEndpoint: input.modelsEndpoint,
        completionEndpoint: input.completionEndpoint,
        headers: input.headers,
    });
};

/**
 * Converts a backend settings.ProviderConfig to a frontend ProviderConfig
 * @param input - Backend provider config to convert
 * @returns Frontend ProviderConfig instance
 */
export const fromBackendProviderConfig = (input: settings.ProviderConfig): FrontProviderConfig => {
    return {
        providerName: input.providerName,
        providerType: input.providerType,
        baseUrl: input.baseUrl,
        modelsEndpoint: input.modelsEndpoint,
        completionEndpoint: input.completionEndpoint,
        headers: input.headers,
    };
};

/**
 * Converts frontend Settings to backend settings.Settings
 * @param input - Frontend settings to convert
 * @returns Backend settings.Settings instance
 */
export const toBackendSettings = (input: FrontSettings): settings.Settings => {
    return settings.Settings.createFrom({
        availableProviderConfigs: input.availableProviderConfigs.map(toBackendProviderConfig),
        currentProviderConfig: toBackendProviderConfig(input.currentProviderConfig),
        modelConfig: toBackendModelConfig(input.modelConfig),
        languageConfig: toBackendLanguageConfig(input.languageConfig),
        useMarkdownForOutput: input.useMarkdownForOutput,
    });
};

/**
 * Converts backend settings.Settings to frontend Settings
 * @param input - Backend settings to convert
 * @returns Frontend Settings instance
 */
export const fromBackendSettings = (input: settings.Settings): FrontSettings => {
    return {
        availableProviderConfigs: input.availableProviderConfigs.map(fromBackendProviderConfig),
        currentProviderConfig: fromBackendProviderConfig(input.currentProviderConfig),
        modelConfig: fromBackendModelConfig(input.modelConfig),
        languageConfig: fromBackendLanguageConfig(input.languageConfig),
        useMarkdownForOutput: input.useMarkdownForOutput,
    };
};
