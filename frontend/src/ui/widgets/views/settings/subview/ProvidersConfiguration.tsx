import React, { useMemo, useState } from 'react';
import { KeyValuePair } from '../../../../../logic/common/types';
import { FrontProviderConfig, LoggerServiceInstance as log, validateEndpoint, validateProviderName, validateUrl } from '../../../../../logic/service';
import {
    settingsCreateNewProvider,
    settingsDeleteProvider,
    settingsGetCurrentSettings,
    settingsUpdateProvider,
    settingsValidateProvider,
} from '../../../../../logic/store/cfg/settings_thunks';
import {
    addNewEmptyProviderHeader,
    removeProviderHeader,
    setCurrentProviderConfig,
    setProviderSelected,
    updateProviderHeader,
} from '../../../../../logic/store/cfg/SettingsStateReducer';
import { useAppDispatch, useAppSelector } from '../../../../../logic/store/hooks';
import Button from '../../../base/Button';
import Select, { SelectItem } from '../../../base/Select';
import HeaderKeyValue from '../HeaderKeyValue';
import SettingsGroup from '../helpers/SettingsGroup';
import ValidationMessages from '../helpers/ValidationMessages'; // Default provider config for fallback

// Default provider config for fallback
const defaultProviderConfig: FrontProviderConfig = {
    providerName: '',
    providerType: 'custom',
    baseUrl: 'http://localhost:8080',
    modelsEndpoint: 'v1/models',
    completionEndpoint: 'v1/completions',
    headers: {},
};

const ProvidersConfiguration: React.FC = () => {
    const dispatch = useAppDispatch();

    // Redux Selectors from new state
    const loadedSettingsEditable = useAppSelector((state) => state.settingsState.loadedSettingsEditable);
    const providerList = useAppSelector((state) => state.settingsState.providerList);
    const providerSelected = useAppSelector((state) => state.settingsState.providerSelected);
    const providersTypes = useAppSelector((state) => state.settingsState.providersTypes);
    const providerHeaders = useAppSelector((state) => state.settingsState.providerHeaders);
    const isLoadingSettings = useAppSelector((state) => state.settingsState.isLoadingSettings);

    // Validation messages from new state
    const providerValidationSuccessMsg = useAppSelector((state) => state.settingsState.providerValidationSuccessMsg);
    const providerValidationErrorMsg = useAppSelector((state) => state.settingsState.providerValidationErrorMsg);

    // Local state for new provider form
    const [newProviderName, setNewProviderName] = useState('');
    const [newProviderType, setNewProviderType] = useState('');
    const [newBaseUrl, setNewBaseUrl] = useState('http://localhost:8080');
    const [newModelsEndpoint, setNewModelsEndpoint] = useState('/v1/models');
    const [validationModel, setValidationModel] = useState('');

    // Validation errors
    const [providerNameError, setProviderNameError] = useState('');
    const [baseUrlError, setBaseUrlError] = useState('');
    const [modelsEndpointError, setModelsEndpointError] = useState('');
    const [completionEndpointError, setCompletionEndpointError] = useState('');
    const [newCompletionEndpoint, setNewCompletionEndpoint] = useState('/v1/completions');
    const [isEditing, setIsEditing] = useState(false);

    // Current provider config from editable settings (with null check)
    const currentProviderConfig = loadedSettingsEditable.currentProviderConfig || defaultProviderConfig;

    // Prepare dropdown items for provider selection
    const providerItems: SelectItem[] = useMemo(() => {
        return [...providerList];
    }, [providerList]);

    // Handlers
    const handleProviderSelect = (item: SelectItem) => {
        if (!item.itemId) return;

        // Find the selected provider from available providers
        const selectedProvider = loadedSettingsEditable.availableProviderConfigs.find((p) => p.providerName === item.itemId);

        if (selectedProvider) {
            // Update provider configuration in editable settings only (no backend call)
            dispatch(setCurrentProviderConfig(selectedProvider));
            // Update provider selection UI state
            dispatch(setProviderSelected(item));
        }
    };

    const handleCreateNewClick = () => {
        setIsEditing(true);
        setNewProviderName('');
        setNewProviderType('custom');
        setNewBaseUrl('http://localhost:8080');
        setNewModelsEndpoint('v1/models');
        setNewCompletionEndpoint('v1/completions');
        setValidationModel('');
        // Clear validation errors
        setProviderNameError('');
        setBaseUrlError('');
        setModelsEndpointError('');
        setCompletionEndpointError('');
    };

    const validateFields = (providerName: string, baseUrl: string, modelsEndpoint: string, completionEndpoint: string): boolean => {
        let isValid = true;

        // Validate provider name
        const nameError = validateProviderName(providerName);
        setProviderNameError(nameError);
        if (nameError) isValid = false;

        // Validate base URL
        const urlError = validateUrl(baseUrl, 'Base URL');
        setBaseUrlError(urlError);
        if (urlError) isValid = false;

        // Validate models endpoint (allow empty, no leading slash requirement for relative paths)
        const modelsError = validateEndpoint(modelsEndpoint, 'Models Endpoint', { requireLeadingSlash: false });
        setModelsEndpointError(modelsError);
        if (modelsError) isValid = false;

        // Validate completion endpoint (allow empty, no leading slash requirement for relative paths)
        const completionError = validateEndpoint(completionEndpoint, 'Completion Endpoint', { requireLeadingSlash: false });
        setCompletionEndpointError(completionError);
        if (completionError) isValid = false;

        return isValid;
    };

    const handleSaveProviderClick = async () => {
        // Validate fields first
        if (!validateFields(newProviderName, newBaseUrl, newModelsEndpoint, newCompletionEndpoint)) {
            log.warning('Provider validation failed');
            return;
        }

        if (isEditing) {
            // Check for provider name uniqueness (only for creating new providers)
            const existingProvider = loadedSettingsEditable.availableProviderConfigs.find((p) => p.providerName === newProviderName);

            if (existingProvider) {
                setProviderNameError('Provider name already exists. Please choose a different name.');
                log.warning(`Provider name '${newProviderName}' already exists`);
                return;
            }

            // Create new provider with headers from Redux state
            const newProvider: FrontProviderConfig = {
                providerName: newProviderName,
                providerType: newProviderType,
                baseUrl: newBaseUrl,
                modelsEndpoint: newModelsEndpoint,
                completionEndpoint: newCompletionEndpoint,
                headers: providerHeaders.reduce(
                    (acc, header) => {
                        if (header.key && header.key.trim()) {
                            acc[header.key] = header.value;
                        }
                        return acc;
                    },
                    {} as Record<string, string>,
                ),
            };

            try {
                await dispatch(settingsCreateNewProvider({ providerConfig: newProvider, modelName: validationModel })).unwrap();
                // Reload settings to get updated provider list // outdated
                // await dispatch(settingsGetCurrentSettings()).unwrap();
                setIsEditing(false);
                // Clear form
                setNewProviderName('');
                setValidationModel('');
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (error) {
                // Error handled by thunk
            }
        } else {
            // Update existing provider with headers from Redux state
            const updatedProvider: FrontProviderConfig = {
                ...currentProviderConfig,
                providerName: newProviderName || currentProviderConfig.providerName,
                providerType: newProviderType || currentProviderConfig.providerType,
                baseUrl: newBaseUrl || currentProviderConfig.baseUrl,
                modelsEndpoint: newModelsEndpoint || currentProviderConfig.modelsEndpoint,
                completionEndpoint: newCompletionEndpoint || currentProviderConfig.completionEndpoint,
                headers: providerHeaders.reduce(
                    (acc, header) => {
                        if (header.key && header.key.trim()) {
                            acc[header.key] = header.value;
                        }
                        return acc;
                    },
                    {} as Record<string, string>,
                ),
            };

            try {
                await dispatch(settingsUpdateProvider(updatedProvider)).unwrap();
                // Reload settings to get updated provider
                await dispatch(settingsGetCurrentSettings()).unwrap();
                setIsEditing(false);
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
            } catch (error) {
                // Error handled by thunk
            }
        }
    };

    const handleDeleteProviderClick = async () => {
        try {
            const success = await dispatch(settingsDeleteProvider(currentProviderConfig)).unwrap();
            if (success) {
                // Reload settings to get updated provider list
                await dispatch(settingsGetCurrentSettings()).unwrap();
            }
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
            // Error handled by thunk
        }
    };

    const handleEditClick = () => {
        if (currentProviderConfig) {
            setIsEditing(true);
            setNewProviderName(currentProviderConfig.providerName);
            setNewProviderType(currentProviderConfig.providerType);
            setNewBaseUrl(currentProviderConfig.baseUrl);
            setNewModelsEndpoint(currentProviderConfig.modelsEndpoint);
            setNewCompletionEndpoint(currentProviderConfig.completionEndpoint);
            setValidationModel('');
            // Clear validation errors
            setProviderNameError('');
            setBaseUrlError('');
            setModelsEndpointError('');
            setCompletionEndpointError('');
        }
    };

    const handleCancelClick = () => {
        setIsEditing(false);
        // Clear validation errors
        setProviderNameError('');
        setBaseUrlError('');
        setModelsEndpointError('');
        setCompletionEndpointError('');
    };

    // Form Field Handlers
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewProviderName(e.target.value);
        // Clear error on change
        if (providerNameError) setProviderNameError('');
    };
    const handleBaseUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewBaseUrl(e.target.value);
        // Clear error on change
        if (baseUrlError) setBaseUrlError('');
    };
    const handleModelsParamsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewModelsEndpoint(e.target.value);
        // Clear error on change
        if (modelsEndpointError) setModelsEndpointError('');
    };
    const handleCompletionParamsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setNewCompletionEndpoint(e.target.value);
        // Clear error on change
        if (completionEndpointError) setCompletionEndpointError('');
    };

    // Header management
    const handleAddHeader = () => {
        dispatch(addNewEmptyProviderHeader());
    };

    const handleUpdateHeader = (updatedHeader: KeyValuePair) => {
        dispatch(updateProviderHeader(updatedHeader));
    };

    const handleRemoveHeader = (header: KeyValuePair) => {
        dispatch(removeProviderHeader(header.id));
    };

    // Validations
    const validateCurrentProvider = async () => {
        // Build provider config from current form state (use form values, not fallbacks)
        const providerToValidate: FrontProviderConfig = {
            providerName: newProviderName || '', // Use form value, don't fallback to current config
            providerType: newProviderType || '', // Use form value, don't fallback to current config
            baseUrl: newBaseUrl || '', // Use form value, don't fallback to current config
            modelsEndpoint: newModelsEndpoint || '', // Use form value, don't fallback to current config
            completionEndpoint: newCompletionEndpoint || '', // Use form value, don't fallback to current config
            headers: providerHeaders.reduce(
                (acc, header) => {
                    if (header.key && header.key.trim()) {
                        acc[header.key] = header.value;
                    }
                    return acc;
                },
                {} as Record<string, string>,
            ),
        };

        try {
            // Pass the validation model to the backend for completion endpoint testing
            await dispatch(
                settingsValidateProvider({ providerConfig: providerToValidate, validateHttpCalls: true, modelName: validationModel }),
            ).unwrap();
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
            // Error handled by thunk
        }
    };

    return (
        <SettingsGroup top={true} headerText="Provider Configuration">
            <SettingsGroup>
                <label htmlFor="providerSelect">Select Provider:</label>
                <Select
                    id="providerSelect"
                    items={providerItems}
                    selectedItem={providerSelected}
                    onSelect={handleProviderSelect}
                    disabled={isLoadingSettings || isEditing}
                />
            </SettingsGroup>
            <SettingsGroup>
                <Button
                    text={isEditing ? 'Cancel' : 'Edit'}
                    variant={isEditing ? 'solid' : 'outlined'}
                    colorStyle={isEditing ? 'warning-color' : 'secondary-color'}
                    size="small"
                    onClick={isEditing ? handleCancelClick : handleEditClick}
                    disabled={isLoadingSettings}
                />
                <Button
                    text="Create New"
                    variant="solid"
                    colorStyle="success-color"
                    size="small"
                    onClick={handleCreateNewClick}
                    disabled={isLoadingSettings || isEditing}
                />
            </SettingsGroup>

            {isEditing ? (
                <>
                    <div className="settings-form-grid">
                        <label htmlFor="providerName">Provider Name:</label>
                        <div>
                            <input type="text" id="providerName" value={newProviderName} onChange={handleNameChange} disabled={isLoadingSettings} />
                            {providerNameError && <span className="validation-error">{providerNameError}</span>}
                        </div>

                        <label htmlFor="providerType">Provider Type:</label>
                        <Select
                            id="providerType"
                            items={providersTypes}
                            selectedItem={providersTypes.find((t) => t.itemId === newProviderType) || providersTypes[0]}
                            onSelect={(item) => setNewProviderType(item.itemId)}
                            disabled={isLoadingSettings}
                        />

                        <label htmlFor="baseUrl">Base URL:</label>
                        <div>
                            <input type="text" id="baseUrl" value={newBaseUrl} onChange={handleBaseUrlChange} disabled={isLoadingSettings} />
                            {baseUrlError && <span className="validation-error">{baseUrlError}</span>}
                        </div>

                        <label htmlFor="modelsEndpoint">Models Endpoint:</label>
                        <div>
                            <input
                                style={{ flex: 1 }}
                                type="text"
                                id="modelsEndpoint"
                                value={newModelsEndpoint}
                                onChange={handleModelsParamsChange}
                                disabled={isLoadingSettings}
                            />
                            {modelsEndpointError && <span className="validation-error">{modelsEndpointError}</span>}
                        </div>

                        <label htmlFor="completionEndpoint">Completion Endpoint:</label>
                        <div>
                            <input
                                style={{ flex: 1 }}
                                type="text"
                                id="completionEndpoint"
                                value={newCompletionEndpoint}
                                onChange={handleCompletionParamsChange}
                                disabled={isLoadingSettings}
                            />
                            {completionEndpointError && <span className="validation-error">{completionEndpointError}</span>}
                        </div>
                    </div>
                    <SettingsGroup headerText="Request Headers">
                        {providerHeaders.map((header) => (
                            <HeaderKeyValue
                                key={header.id}
                                value={header}
                                onChange={handleUpdateHeader}
                                onDelete={handleRemoveHeader}
                                isDisabled={isLoadingSettings}
                            />
                        ))}
                        <Button
                            text="Add Header"
                            variant="outlined"
                            colorStyle="secondary-color"
                            size="small"
                            onClick={handleAddHeader}
                            disabled={isLoadingSettings}
                        />
                    </SettingsGroup>
                    <SettingsGroup headerText="Verify Configuration">
                        <div className="settings-form-grid">
                            <label htmlFor="completionEndpointModel">Provide Model ID for verification (Optional):</label>
                            <input
                                type="text"
                                id="completionEndpointModel"
                                value={validationModel}
                                onChange={(e) => setValidationModel(e.target.value)}
                                placeholder="gpt-4o"
                                disabled={isLoadingSettings}
                            />
                        </div>
                        <div className="settings-form-grid">
                            <Button
                                text="Save Provider"
                                variant="solid"
                                colorStyle="success-color"
                                size="small"
                                onClick={handleSaveProviderClick}
                                disabled={isLoadingSettings}
                            />
                            <Button
                                text="Validate Provider"
                                variant="outlined"
                                colorStyle="secondary-color"
                                size="small"
                                onClick={validateCurrentProvider}
                                disabled={isLoadingSettings}
                            />
                            <Button
                                text="Delete Provider"
                                variant="solid"
                                colorStyle="error-color"
                                size="small"
                                onClick={handleDeleteProviderClick}
                                disabled={isLoadingSettings}
                            />
                        </div>
                    </SettingsGroup>
                </>
            ) : (
                <SettingsGroup>
                    <label>Current Provider Details:</label>
                    <div className="provider-details">
                        <p>
                            <strong>Name:</strong> {currentProviderConfig.providerName}
                        </p>
                        <p>
                            <strong>Type:</strong> {currentProviderConfig.providerType}
                        </p>
                        <p>
                            <strong>Base URL:</strong> {currentProviderConfig.baseUrl}
                        </p>
                        <p>
                            <strong>Models Endpoint:</strong> {currentProviderConfig.modelsEndpoint}
                        </p>
                        <p>
                            <strong>Completion Endpoint:</strong> {currentProviderConfig.completionEndpoint}
                        </p>
                        {currentProviderConfig.headers && Object.keys(currentProviderConfig.headers).length > 0 && (
                            <>
                                <p>
                                    <strong>Headers:</strong>
                                </p>
                                <ul style={{ marginLeft: '1rem', marginTop: '0.5rem' }}>
                                    {Object.entries(currentProviderConfig.headers).map(([key, value]) => (
                                        <li key={key}>
                                            <strong>{key}:</strong> {value}
                                        </li>
                                    ))}
                                </ul>
                            </>
                        )}
                    </div>
                </SettingsGroup>
            )}

            <ValidationMessages success={providerValidationSuccessMsg} error={providerValidationErrorMsg} />
        </SettingsGroup>
    );
};

ProvidersConfiguration.displayName = 'ProvidersConfiguration';
export default ProvidersConfiguration;
