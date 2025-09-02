import React, { useEffect, useState } from 'react';
import { AppSettings } from '../../../common/types';
import {
    fetchCurrentSettings,
    fetchLlmModels,
    saveCurrentSettings,
    validateUserUrlAndHeaders,
} from '../../../store/app/thunks';
import { useAppDispatch, useAppSelector } from '../../../store/hooks';
import Button from '../../base/Button';
import Select, { SelectItem } from '../../base/Select';
import HeaderKeyValue from './HeaderKeyValue';

// Convert headers record to array format for form
const headersToArray = (headers: Record<string, string>): { key: string; value: string }[] =>
    Object.entries(headers).map(([key, value]) => ({ key, value }));

// Convert headers array to record format for saving
const headersToRecord = (headers: { key: string; value: string }[]): Record<string, string> =>
    headers.reduce(
        (acc, { key, value }) => {
            if (key.trim() !== '') acc[key] = value;
            return acc;
        },
        {} as Record<string, string>,
    );

type SettingsWidgetProps = { onClose: () => void };
const SettingsWidget: React.FC<SettingsWidgetProps> = ({ onClose }) => {
    const dispatch = useAppDispatch();

    // Get settings state from Redux
    const {
        baseUrl,
        headers,
        modelName,
        temperature,
        defaultInputLanguage,
        defaultOutputLanguage,
        languages,
        useMarkdownForOutput,
        models,
    } = useAppSelector((state) => state.settingsState);

    // Local state for form management
    const [formState, setFormState] = useState<AppSettings | null>(null);
    const [validationStatus, setValidationStatus] = useState<'idle' | 'validating' | 'success' | 'error'>('idle');
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving'>('idle');
    const [modelStatus, setModelStatus] = useState<'idle' | 'loading'>('idle');
    const [availableModels, setAvailableModels] = useState<string[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Initialize form state after settings load
    useEffect(() => {
        if (!formState) {
            setFormState({
                baseUrl,
                headers,
                modelName,
                temperature,
                defaultInputLanguage,
                defaultOutputLanguage,
                languages,
                useMarkdownForOutput,
            });
        }
        setAvailableModels(models);
    }, [
        formState,
        baseUrl,
        headers,
        modelName,
        temperature,
        defaultInputLanguage,
        defaultOutputLanguage,
        languages,
        useMarkdownForOutput,
        models,
    ]);

    // Initial data loading
    useEffect(() => {
        dispatch(fetchCurrentSettings());
        dispatch(fetchLlmModels());
    }, [dispatch]);

    const handleBaseUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!formState) return;
        setFormState({ ...formState, baseUrl: e.target.value });
    };

    const handleHeaderChange = (index: number, key: string, value: string) => {
        if (!formState) return;

        const newHeaders = [...formState.headers];
        newHeaders[index] = { key, value };
        setFormState({ ...formState, headers: newHeaders });
    };

    const handleHeaderDelete = (index: number) => {
        if (!formState) return;

        const newHeaders = formState.headers.filter((_, i) => i !== index);
        setFormState({ ...formState, headers: newHeaders.length > 0 ? newHeaders : [{ key: '', value: '' }] });
    };

    const handleAddHeader = () => {
        if (!formState) return;

        const lastHeader = formState.headers[formState.headers.length - 1];
        if (lastHeader.key.trim() !== '' || lastHeader.value.trim() !== '') {
            setFormState({ ...formState, headers: [...formState.headers, { key: '', value: '' }] });
        }
    };

    const handleTemperatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!formState) return;
        const temp = Number(e.target.value) / 100;
        setFormState({ ...formState, temperature: Math.max(0, Math.min(1, temp)) });
    };

    const handleModelSelect = (item: SelectItem) => {
        if (!formState) return;
        setFormState({ ...formState, modelName: item.itemId });
    };

    const handleLanguageSelect = (type: 'input' | 'output', item: SelectItem) => {
        if (!formState) return;
        setFormState({
            ...formState,
            ...(type === 'input' ? { defaultInputLanguage: item.itemId } : { defaultOutputLanguage: item.itemId }),
        });
    };

    const handleMarkdownToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!formState) return;
        setFormState({ ...formState, useMarkdownForOutput: e.target.checked });
    };

    const testConnectionAndLoadModels = async () => {
        if (!formState) return;

        setValidationStatus('validating');
        setModelStatus('loading');
        setError(null);

        try {
            // Validate connection
            const isValid = await dispatch(
                validateUserUrlAndHeaders({ baseUrl: formState.baseUrl, headers: headersToRecord(formState.headers) }),
            ).unwrap();

            if (!isValid) {
                throw new Error('Connection validation failed');
            }

            // Load models
            const models = await dispatch(
                fetchLlmModels({ baseUrl: formState.baseUrl, headers: headersToRecord(formState.headers) }),
            ).unwrap();

            setAvailableModels(models);
            setValidationStatus('success');
            setModelStatus('idle');

            // Auto-select first available model
            if (models.length > 0 && !models.includes(formState.modelName)) {
                setFormState((prev) => (prev ? { ...prev, modelName: models[0] } : null));
            }
        } catch (err) {
            setValidationStatus('error');
            setModelStatus('idle');
            setError(err instanceof Error ? err.message : 'Failed to validate connection');
        }
    };

    const handleSave = async () => {
        if (!formState) return;

        setSaveStatus('saving');
        setError(null);

        try {
            // Validate connection before saving
            const isValid = await dispatch(
                validateUserUrlAndHeaders({ baseUrl: formState.baseUrl, headers: headersToRecord(formState.headers) }),
            ).unwrap();

            if (!isValid) {
                throw new Error('Connection validation failed');
            }

            // Save settings
            await dispatch(saveCurrentSettings({ ...formState, headers: headersToRecord(formState.headers) })).unwrap();

            onClose();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to save settings');
            setSaveStatus('idle');
        }
    };

    const handleReset = () => {
        if (!formState) return;

        setFormState({
            baseUrl,
            headers,
            modelName,
            temperature,
            defaultInputLanguage,
            defaultOutputLanguage,
            languages,
            useMarkdownForOutput,
        });
        setValidationStatus('idle');
        setModelStatus('idle');
        setError(null);
    };

    // Loading state
    if (!formState) {
        return <div className="settings-widget-loading">Loading settings...</div>;
    }

    // Convert temperature to 0-100 range for input
    const temperatureValue = Math.round(formState.temperature * 100);

    // Prepare language options
    const languageItems: SelectItem[] = formState.languages.map((lang) => ({ itemId: lang, displayText: lang }));

    // Prepare model options
    const modelItems: SelectItem[] = availableModels.map((model) => ({ itemId: model, displayText: model }));

    // Check if we can add new header
    const canAddHeader = true;

    return (
        <div className="settings-widget-container">
            <div className="settings-widget-form-container">
                {error && <div className="settings-error">{error}</div>}

                <div className="form-group">
                    <label htmlFor="baseUrl">LLM BaseUrl:</label>
                    <input
                        type="text"
                        id="baseUrl"
                        value={formState.baseUrl}
                        onChange={handleBaseUrlChange}
                        placeholder="http://localhost:11434"
                    />
                </div>

                <div className="form-group">
                    <h3 className="section-title">Headers</h3>
                    {Object.keys(formState.headers).map((key, i) => (
                        <HeaderKeyValue
                            key={`header-${i}`}
                            index={i}
                            header={{ key, value: formState.headers[key] }}
                            onChange={handleHeaderChange}
                            onDelete={handleHeaderDelete}
                        />
                    ))}
                    <Button
                        text="Add additional header"
                        variant="outlined"
                        size="small"
                        disabled={!canAddHeader}
                        onClick={handleAddHeader}
                    />
                </div>

                <div className="form-group">
                    <Button
                        text={
                            validationStatus === 'validating' || modelStatus === 'loading'
                                ? 'Testing connection and loading models...'
                                : 'Test Connection and Load Models'
                        }
                        variant="outlined"
                        onClick={testConnectionAndLoadModels}
                        disabled={validationStatus === 'validating' || modelStatus === 'loading'}
                    />
                    {validationStatus === 'success' && (
                        <span className="validation-success">Connection successful!</span>
                    )}
                    {validationStatus === 'error' && <span className="validation-error">Connection failed</span>}
                </div>

                {/* Model selection */}
                <div className="form-group">
                    <label htmlFor="modelSelect">Model:</label>
                    <Select
                        id="modelSelect"
                        items={modelItems}
                        selectedItem={modelItems.find((item) => item.itemId === formState.modelName) || ''}
                        onSelect={handleModelSelect}
                    />
                    {modelStatus === 'loading' && <span className="model-loading">Loading available models...</span>}
                </div>

                <div className="form-group">
                    <label htmlFor="temperature">Model Temperature:</label>
                    <input
                        type="range"
                        id="temperature"
                        min="0"
                        max="100"
                        value={temperatureValue}
                        onChange={handleTemperatureChange}
                    />
                    <div className="temperature-value">{formState.temperature.toFixed(2)}</div>
                </div>

                <div className="form-group">
                    <label htmlFor="defaultInputLang">Default Input Language:</label>
                    <Select
                        id="defaultInputLang"
                        items={languageItems}
                        selectedItem={
                            languageItems.find((item) => item.itemId === formState.defaultInputLanguage) ||
                            languageItems[0]
                        }
                        onSelect={(item) => handleLanguageSelect('input', item)}
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="defaultOutputLang">Default Output Language:</label>
                    <Select
                        id="defaultOutputLang"
                        items={languageItems}
                        selectedItem={
                            languageItems.find((item) => item.itemId === formState.defaultOutputLanguage) ||
                            languageItems[0]
                        }
                        onSelect={(item) => handleLanguageSelect('output', item)}
                    />
                </div>

                <div className="form-group checkbox-group">
                    <input
                        type="checkbox"
                        id="useMarkdown"
                        checked={formState.useMarkdownForOutput}
                        onChange={handleMarkdownToggle}
                    />
                    <label htmlFor="useMarkdown">Use Markdown for plaintext Output</label>
                </div>
            </div>

            <div className="settings-widget-confirmation-buttons-container">
                <Button
                    text="Reset to Default"
                    variant="outlined"
                    colorStyle="error-color"
                    size="small"
                    onClick={handleReset}
                    disabled={saveStatus === 'saving'}
                />
                <Button
                    text={saveStatus === 'saving' ? 'Saving...' : 'Save and Close'}
                    variant="solid"
                    colorStyle="success-color"
                    size="small"
                    onClick={handleSave}
                    disabled={saveStatus === 'saving' || availableModels.length === 0 || validationStatus !== 'success'}
                />
            </div>
        </div>
    );
};

SettingsWidget.displayName = 'SettingsWidget';
export default SettingsWidget;
