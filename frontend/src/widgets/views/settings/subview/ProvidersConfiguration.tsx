import React, { useMemo } from 'react';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import {
    addDisplayHeader,
    addProviderConfig,
    deleteProviderConfig,
    loadProviderToDraft,
    removeDisplayHeader,
    resetDraftProviderConfig,
    setBaseUrl,
    setCompletionEndpoint,
    setCompletionEndpointModel,
    setModelsEndpoint,
    setProviderName,
    updateHeader,
    updateProviderConfig,
} from '../../../../store/settings/AppSettingsReducer';
import { appSettingsValidateCompletionRequest, appSettingsValidateModelsRequest } from '../../../../store/settings/settings_thunks';
import Button from '../../../base/Button';
import Select, { SelectItem } from '../../../base/Select';
import HeaderKeyValue from '../HeaderKeyValue';
import SettingsGroup from '../helpers/SettingsGroup';
import ValidationMessages from '../helpers/ValidationMessages';

const ProvidersConfiguration: React.FC = () => {
    const dispatch = useAppDispatch();

    // Redux Selectors
    const availableProviderConfigs = useAppSelector((state) => state.settingsState.availableProviderConfigs);
    const currentProviderConfig = useAppSelector((state) => state.settingsState.currentProviderConfig);
    const isEditingProvider = useAppSelector((state) => state.settingsState.isEditingProvider);
    const displayHeaders = useAppSelector((state) => state.settingsState.displayHeaders);
    const isLoadingSettings = useAppSelector((state) => state.settingsState.isLoadingSettings);

    // Validation messages
    const baseUrlSuccessMsg = useAppSelector((state) => state.settingsState.baseUrlSuccessMsg);
    const baseUrlValidationErr = useAppSelector((state) => state.settingsState.baseUrlValidationErr);
    const modelsEndpointSuccessMsg = useAppSelector((state) => state.settingsState.modelsEndpointSuccessMsg);
    const modelsEndpointValidationErr = useAppSelector((state) => state.settingsState.modelsEndpointValidationErr);
    const completionEndpointSuccessMsg = useAppSelector((state) => state.settingsState.completionEndpointSuccessMsg);
    const completionEndpointValidationErr = useAppSelector((state) => state.settingsState.completionEndpointValidationErr);
    const completionEndpointModel = useAppSelector((state) => state.settingsState.completionEndpointModel);

    // Prepare dropdown items for provider selection
    const providerItems: SelectItem[] = useMemo(() => {
        const items = availableProviderConfigs.map((p) => ({ itemId: p.providerName, displayText: p.providerName }));
        // We will add a placeholder for "default" or "select one"
        const result = [{ itemId: '', displayText: 'Select Provider...' }, ...items];
        return result;
    }, [availableProviderConfigs]);

    // Current selection for the dropdown
    const selectedProviderItem: SelectItem = useMemo(() => {
        if (isEditingProvider && currentProviderConfig.providerName) {
            // Ensure the name exists in the list to avoid "ghost" selections
            const exists = availableProviderConfigs.some((p) => p.providerName === currentProviderConfig.providerName);
            if (exists) {
                return { itemId: currentProviderConfig.providerName, displayText: currentProviderConfig.providerName };
            }
        }
        return { itemId: '', displayText: 'Select Provider...' };
    }, [isEditingProvider, currentProviderConfig.providerName, availableProviderConfigs]);

    // Handlers
    const handleProviderSelect = (item: SelectItem) => {
        if (!item.itemId) return;
        dispatch(loadProviderToDraft(item.itemId));
    };

    const handleCreateNewClick = () => {
        dispatch(resetDraftProviderConfig());
    };

    const handleSaveProviderClick = () => {
        if (isEditingProvider) {
            dispatch(updateProviderConfig());
        } else {
            dispatch(addProviderConfig());
        }
    };

    const handleDeleteProviderClick = () => {
        dispatch(deleteProviderConfig());
    };

    // Form Field Handlers
    const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => dispatch(setProviderName(e.target.value));
    const handleBaseUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => dispatch(setBaseUrl(e.target.value));
    const handleModelsParamsChange = (e: React.ChangeEvent<HTMLInputElement>) => dispatch(setModelsEndpoint(e.target.value));
    const handleCompletionParamsChange = (e: React.ChangeEvent<HTMLInputElement>) => dispatch(setCompletionEndpoint(e.target.value));
    const handleCompletionModelChange = (e: React.ChangeEvent<HTMLInputElement>) => dispatch(setCompletionEndpointModel(e.target.value));

    // Validations
    const testCompletionEndpointConnection = () => {
        dispatch(
            appSettingsValidateCompletionRequest({
                baseUrl: currentProviderConfig.baseUrl,
                endpoint: currentProviderConfig.completionEndpoint,
                modelName: completionEndpointModel,
                headers: currentProviderConfig.headers,
            }),
        );
    };

    // Headers
    const handleHeaderChange = (obj: any) => dispatch(updateHeader(obj));
    const handleHeaderDelete = (obj: any) => dispatch(removeDisplayHeader(obj.id));
    const handleAddHeader = () => dispatch(addDisplayHeader());

    return (
        <SettingsGroup top={true} headerText="LLM Provider Configuration">
            <SettingsGroup>
                <label htmlFor="providerType">Select Provider:</label>
                <Select
                    id="providerType"
                    items={providerItems}
                    selectedItem={selectedProviderItem}
                    onSelect={handleProviderSelect}
                    disabled={isLoadingSettings}
                />
            </SettingsGroup>

            <Button
                text="Create New"
                variant="outlined"
                colorStyle="primary-color"
                size="small"
                onClick={handleCreateNewClick}
                disabled={isLoadingSettings}
            />

            <SettingsGroup headerText={isEditingProvider ? `Edit ${currentProviderConfig.providerName}` : 'Configure New Provider'}>
                <div className="settings-form-grid">
                    <label htmlFor="providerName">Provider Name:</label>
                    <input
                        type="text"
                        id="providerName"
                        value={currentProviderConfig.providerName}
                        onChange={handleNameChange}
                        placeholder="My Custom Provider"
                        disabled={isLoadingSettings}
                    />

                    <label htmlFor="baseUrl">BaseUrl:</label>
                    <input
                        type="text"
                        id="baseUrl"
                        value={currentProviderConfig.baseUrl}
                        onChange={handleBaseUrlChange}
                        placeholder="http://localhost:11434"
                        disabled={isLoadingSettings}
                    />

                    <label htmlFor="modelsEndpoint">Models List endpoint:</label>
                    <input
                        style={{ flex: 1 }}
                        type="text"
                        id="modelsEndpoint"
                        value={currentProviderConfig.modelsEndpoint}
                        onChange={handleModelsParamsChange}
                        placeholder="/v1/models"
                        disabled={isLoadingSettings}
                    />

                    <label htmlFor="completionEndpoint">Chat completion endpoint:</label>
                    <input
                        style={{ flex: 1 }}
                        type="text"
                        id="completionEndpoint"
                        value={currentProviderConfig.completionEndpoint}
                        onChange={handleCompletionParamsChange}
                        placeholder="/v1/chat/completions"
                        disabled={isLoadingSettings}
                    />
                </div>

                <ValidationMessages success={baseUrlSuccessMsg} error={baseUrlValidationErr} />
                <ValidationMessages success={modelsEndpointSuccessMsg} error={modelsEndpointValidationErr} />

                <SettingsGroup headerText="Request Headers">
                    {displayHeaders.map((item) => (
                        <HeaderKeyValue
                            key={`header-${item.id}`}
                            value={item}
                            onChange={handleHeaderChange}
                            onDelete={handleHeaderDelete}
                            isDisabled={isLoadingSettings}
                        />
                    ))}

                    <Button
                        text="Add additional value"
                        variant="dashed"
                        colorStyle="primary-color"
                        size="tiny"
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
                            value={completionEndpointModel}
                            onChange={handleCompletionModelChange}
                            placeholder="ChatGpt-5-mini"
                            disabled={isLoadingSettings}
                        />
                    </div>
                    <Button
                        text="Verify Completion Endpoint"
                        variant="outlined"
                        colorStyle="success-color"
                        size="tiny"
                        disabled={!currentProviderConfig.completionEndpoint || isLoadingSettings}
                        onClick={testCompletionEndpointConnection}
                    />
                    <ValidationMessages success={completionEndpointSuccessMsg} error={completionEndpointValidationErr} />
                </SettingsGroup>

                <div className="settings-widget-confirmation-buttons-container" style={{ marginTop: '10px' }}>
                    {isEditingProvider && (
                        <Button
                            text="Delete Provider"
                            variant="outlined"
                            colorStyle="error-color"
                            size="small"
                            onClick={handleDeleteProviderClick}
                            disabled={isLoadingSettings}
                        />
                    )}
                    <Button
                        text={isEditingProvider ? 'Update Provider' : 'Save Provider'}
                        variant="solid"
                        colorStyle="success-color"
                        size="small"
                        onClick={handleSaveProviderClick}
                        disabled={isLoadingSettings}
                    />
                </div>
            </SettingsGroup>
        </SettingsGroup>
    );
};

ProvidersConfiguration.displayName = 'ProvidersConfiguration';
export default ProvidersConfiguration;
