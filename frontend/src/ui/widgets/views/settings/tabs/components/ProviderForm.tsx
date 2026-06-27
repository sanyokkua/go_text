import React, { useCallback, useEffect, useMemo, useState } from 'react';

import { apperr } from '../../../../../../../wailsjs/go/models';
import { ActionHandlerAdapter } from '../../../../../../logic/adapter';
import { ProviderConfig } from '../../../../../../logic/adapter/models';
import { AlertDialog } from '../../../../../primitives/AlertDialog';
import type { SelectItem } from '../../../../../primitives/Select';
import { Select } from '../../../../../primitives/Select';
import { Switch } from '../../../../../primitives/Switch';
import KvEditor from './KvEditor';
import TagInput from './TagInput';
import VerificationPanel from './VerificationPanel';

export const BLANK_PROVIDER: ProviderConfig = {
    providerId: '',
    providerName: '',
    providerType: 'openai',
    baseUrl: '',
    modelsEndpoint: '',
    completionEndpoint: '',
    authType: 'api-key',
    authToken: '',
    useAuthTokenFromEnv: true,
    envVarTokenName: '',
    apiVersion: '',
    selectedModel: '',
    useCustomHeaders: false,
    headers: {},
    useCustomModels: false,
    customModels: [],
};

interface ProviderFormProps {
    provider: ProviderConfig | null;
    authTypes: string[];
    providerTypes: string[];
    existingNames: string[];
    isCurrent: boolean;
    onSave: (p: ProviderConfig) => void;
    onDelete: (id: string) => void;
    onSetCurrent: (id: string) => void;
    onCancel: () => void;
}

const LABEL_STYLE: React.CSSProperties = { fontSize: '0.8rem', color: 'var(--ink-2)', fontWeight: 500, marginBottom: '2px', display: 'block' };

const FIELD_STYLE: React.CSSProperties = { marginBottom: 'var(--space-3)' };

const ERROR_STYLE: React.CSSProperties = { color: 'var(--err)', fontSize: '0.75rem', marginTop: '2px' };

const TEXT_INPUT_STYLE: React.CSSProperties = {
    width: '100%',
    padding: '6px var(--space-2)',
    fontSize: '0.875rem',
    background: 'var(--surface)',
    color: 'var(--ink)',
    border: '1px solid var(--line)',
    borderRadius: 'var(--radius-sm)',
    outline: 'none',
    fontFamily: 'var(--font)',
    boxSizing: 'border-box',
};

const prettifyAuthType = (raw: string): string => {
    switch (raw) {
        case 'none':
            return 'None';
        case 'bearer':
            return 'Bearer';
        case 'api-key':
            return 'Api-Key';
        default:
            return raw.charAt(0).toUpperCase() + raw.slice(1);
    }
};

interface FormErrors {
    nameError: string;
    baseUrlError: string;
    envVarError: string;
}

const validateForm = (form: ProviderConfig, existingNames: string[]): FormErrors => {
    let nameError = '';
    if (form.providerName.trim() === '') {
        nameError = 'Name is required';
    } else if (existingNames.includes(form.providerName.trim())) {
        nameError = 'Name is already taken';
    }

    let baseUrlError = '';
    if (form.baseUrl.trim() === '') {
        baseUrlError = 'Base URL is required';
    } else if (!form.baseUrl.trim().startsWith('http')) {
        baseUrlError = 'Must start with http:// or https://';
    }

    let envVarError = '';
    if (form.authType !== 'none' && form.envVarTokenName.trim() === '') {
        envVarError = 'API key variable name is required';
    }

    return { nameError, baseUrlError, envVarError };
};

const isFormValid = (errors: FormErrors, form: ProviderConfig): boolean => {
    if (errors.nameError !== '' || errors.baseUrlError !== '') return false;
    if (form.authType !== 'none' && errors.envVarError !== '') return false;
    return true;
};

const ProviderForm: React.FC<ProviderFormProps> = ({
    provider,
    authTypes,
    providerTypes,
    existingNames,
    isCurrent,
    onSave,
    onDelete,
    onSetCurrent,
    onCancel,
}) => {
    const sourceId = provider?.providerId ?? null;

    const [form, setForm] = useState<ProviderConfig>(provider ?? BLANK_PROVIDER);
    const [dirty, setDirty] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [discoveredModels, setDiscoveredModels] = useState<apperr.ModelInfo[]>([]);
    const [modelsLoading, setModelsLoading] = useState(false);

    // Reset form when the selected provider changes (keyed on stable id).
    useEffect(() => {
        setForm(provider ?? BLANK_PROVIDER);
        setDirty(false);
        setDiscoveredModels([]);
    }, [sourceId]); // eslint-disable-line react-hooks/exhaustive-deps

    const fetchModels = useCallback(async (providerId: string) => {
        if (providerId === '') return;
        setModelsLoading(true);
        let cancelled = false;
        const result = await ActionHandlerAdapter.getModels(providerId);
        if (!cancelled) {
            setModelsLoading(false);
            if (!result.error) {
                setDiscoveredModels(result.data ?? []);
            }
        }
        return () => {
            cancelled = true;
        };
    }, []);

    // Auto-fetch models when the saved provider is loaded (only for existing providers).
    useEffect(() => {
        if (form.providerId === '') return;
        let cancelled = false;
        setModelsLoading(true);

        ActionHandlerAdapter.getModels(form.providerId).then((result) => {
            if (cancelled) return;
            setModelsLoading(false);
            if (!result.error) {
                setDiscoveredModels(result.data ?? []);
            }
        });

        return () => {
            cancelled = true;
        };
    }, [form.providerId]);

    const patch = <K extends keyof ProviderConfig>(key: K, value: ProviderConfig[K]) => {
        setForm((prev) => {
            const next = { ...prev, [key]: value };
            const source = provider ?? BLANK_PROVIDER;
            setDirty(JSON.stringify(next) !== JSON.stringify(source));
            return next;
        });
    };

    const errors = validateForm(form, existingNames);
    const valid = isFormValid(errors, form);

    // Build model select items, prepending the current selectedModel if it's not in the discovered list.
    const modelItems: SelectItem[] = useMemo(() => {
        const items: SelectItem[] = discoveredModels.map((m) => ({ value: m.id, label: m.label }));
        if (form.selectedModel !== '' && !discoveredModels.some((m) => m.id === form.selectedModel)) {
            items.unshift({ value: form.selectedModel, label: form.selectedModel });
        }
        return items;
    }, [discoveredModels, form.selectedModel]);

    const kindItems: SelectItem[] = providerTypes.map((pt) => ({ value: pt, label: pt }));

    const handleSave = () => {
        if (!dirty || !valid) return;
        onSave(form);
    };

    const handleConfirmDelete = () => {
        if (provider) onDelete(provider.providerId);
        setDeleteOpen(false);
    };

    if (provider === null) {
        return (
            <div
                style={{
                    flex: 1,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--ink-3)',
                    fontSize: '0.875rem',
                    padding: 'var(--space-4)',
                }}
            >
                (Select a provider to edit or create a new one)
            </div>
        );
    }

    return (
        <div style={{ flex: 1, overflowY: 'auto', padding: 'var(--space-4)', display: 'flex', flexDirection: 'column' }}>
            {/* Name */}
            <div style={FIELD_STYLE}>
                <label htmlFor="pf-name" style={LABEL_STYLE}>
                    Name
                </label>
                <input
                    id="pf-name"
                    type="text"
                    value={form.providerName}
                    onChange={(e) => patch('providerName', e.target.value)}
                    placeholder="Provider name"
                    aria-invalid={errors.nameError !== ''}
                    aria-describedby={errors.nameError === '' ? undefined : 'pf-name-err'}
                    style={TEXT_INPUT_STYLE}
                />
                {errors.nameError !== '' && (
                    <span id="pf-name-err" role="alert" style={ERROR_STYLE}>
                        {errors.nameError}
                    </span>
                )}
            </div>

            {/* Kind */}
            <div style={FIELD_STYLE}>
                <span id="pf-kind-label" style={LABEL_STYLE}>
                    Kind
                </span>
                <Select
                    value={form.providerType}
                    onValueChange={(v) => patch('providerType', v)}
                    items={kindItems}
                    placeholder="Select kind"
                    keyLabel="Kind"
                    aria-labelledby="pf-kind-label"
                />
            </div>

            {/* Auth segment */}
            <fieldset style={{ ...FIELD_STYLE, border: 'none', margin: 0, padding: 0 }}>
                <legend style={{ ...LABEL_STYLE, float: 'left', width: '100%' }}>Auth</legend>
                <div style={{ display: 'flex', gap: 'var(--space-1)', clear: 'both' }}>
                    {authTypes.map((authType) => {
                        const isActive = form.authType === authType;
                        return (
                            <button
                                key={authType}
                                type="button"
                                onClick={() => patch('authType', authType)}
                                aria-pressed={isActive}
                                style={{
                                    padding: '4px var(--space-3)',
                                    border: `1px solid ${isActive ? 'var(--teal)' : 'var(--line)'}`,
                                    borderRadius: 'var(--radius-sm)',
                                    background: isActive ? 'color-mix(in srgb, var(--teal) 15%, transparent)' : 'transparent',
                                    color: isActive ? 'var(--teal)' : 'var(--ink)',
                                    cursor: 'pointer',
                                    fontSize: '0.8125rem',
                                    fontFamily: 'var(--font)',
                                    fontWeight: isActive ? 600 : 400,
                                }}
                            >
                                {prettifyAuthType(authType)}
                            </button>
                        );
                    })}
                </div>
            </fieldset>

            {/* API key env var — shown when auth ≠ none */}
            {form.authType !== 'none' && (
                <div style={FIELD_STYLE}>
                    <label htmlFor="pf-env-var" style={LABEL_STYLE}>
                        API key environment variable
                    </label>
                    <input
                        id="pf-env-var"
                        type="text"
                        value={form.envVarTokenName}
                        onChange={(e) => patch('envVarTokenName', e.target.value)}
                        placeholder="e.g. OPENAI_API_KEY"
                        aria-invalid={errors.envVarError !== ''}
                        aria-describedby={errors.envVarError === '' ? undefined : 'pf-env-err'}
                        style={TEXT_INPUT_STYLE}
                    />
                    {errors.envVarError !== '' && (
                        <span id="pf-env-err" role="alert" style={ERROR_STYLE}>
                            {errors.envVarError}
                        </span>
                    )}
                </div>
            )}

            {/* Base URL */}
            <div style={FIELD_STYLE}>
                <label htmlFor="pf-base-url" style={LABEL_STYLE}>
                    Base URL
                </label>
                <input
                    id="pf-base-url"
                    type="text"
                    value={form.baseUrl}
                    onChange={(e) => patch('baseUrl', e.target.value)}
                    placeholder="https://api.example.com"
                    aria-invalid={errors.baseUrlError !== ''}
                    aria-describedby={errors.baseUrlError === '' ? undefined : 'pf-url-err'}
                    style={TEXT_INPUT_STYLE}
                />
                {errors.baseUrlError !== '' && (
                    <span id="pf-url-err" role="alert" style={ERROR_STYLE}>
                        {errors.baseUrlError}
                    </span>
                )}
            </div>

            {/* Models endpoint */}
            <div style={FIELD_STYLE}>
                <label htmlFor="pf-models-ep" style={LABEL_STYLE}>
                    Models endpoint (override)
                </label>
                <input
                    id="pf-models-ep"
                    type="text"
                    value={form.modelsEndpoint}
                    onChange={(e) => patch('modelsEndpoint', e.target.value)}
                    placeholder="/v1/models"
                    style={TEXT_INPUT_STYLE}
                />
            </div>

            {/* Completion endpoint */}
            <div style={FIELD_STYLE}>
                <label htmlFor="pf-completion-ep" style={LABEL_STYLE}>
                    Completion endpoint (override)
                </label>
                <input
                    id="pf-completion-ep"
                    type="text"
                    value={form.completionEndpoint}
                    onChange={(e) => patch('completionEndpoint', e.target.value)}
                    placeholder="/v1/chat/completions"
                    style={TEXT_INPUT_STYLE}
                />
            </div>

            {/* API version — azure only */}
            {form.providerType === 'azure' && (
                <div style={FIELD_STYLE}>
                    <label htmlFor="pf-api-version" style={LABEL_STYLE}>
                        API version
                    </label>
                    <input
                        id="pf-api-version"
                        type="text"
                        value={form.apiVersion}
                        onChange={(e) => patch('apiVersion', e.target.value)}
                        placeholder="2024-02-01"
                        style={TEXT_INPUT_STYLE}
                    />
                </div>
            )}

            {/* Model picker */}
            <div style={FIELD_STYLE}>
                <span id="pf-model-label" style={LABEL_STYLE}>
                    Model
                </span>
                <div style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                    <div style={{ flex: 1 }}>
                        <Select
                            value={form.selectedModel}
                            onValueChange={(v) => patch('selectedModel', v)}
                            items={modelItems}
                            placeholder={modelsLoading ? '(loading…)' : '(none)'}
                            keyLabel="Model"
                            disabled={modelsLoading}
                            aria-labelledby="pf-model-label"
                        />
                    </div>
                    <button
                        type="button"
                        onClick={() => fetchModels(form.providerId)}
                        disabled={modelsLoading || form.providerId === ''}
                        aria-label="Refresh model list"
                        title="Refresh model list"
                        style={{
                            flexShrink: 0,
                            padding: '6px var(--space-2)',
                            border: '1px solid var(--line)',
                            borderRadius: 'var(--radius-sm)',
                            background: 'transparent',
                            color: 'var(--ink)',
                            cursor: modelsLoading || form.providerId === '' ? 'not-allowed' : 'pointer',
                            fontSize: '1rem',
                            lineHeight: 1,
                            opacity: modelsLoading || form.providerId === '' ? 0.5 : 1,
                        }}
                    >
                        ⟳
                    </button>
                </div>
            </div>

            {/* Custom headers */}
            <div style={FIELD_STYLE}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                        marginBottom: form.useCustomHeaders ? 'var(--space-2)' : 0,
                    }}
                >
                    <Switch
                        id="pf-custom-headers"
                        checked={form.useCustomHeaders}
                        onCheckedChange={(v) => patch('useCustomHeaders', v)}
                        aria-label="Use custom headers"
                    />
                    <label htmlFor="pf-custom-headers" style={{ ...LABEL_STYLE, marginBottom: 0, cursor: 'pointer' }}>
                        Use custom headers
                    </label>
                </div>
                {form.useCustomHeaders && <KvEditor value={form.headers} onChange={(v) => patch('headers', v)} />}
            </div>

            {/* Custom models */}
            <div style={FIELD_STYLE}>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                        marginBottom: form.useCustomModels ? 'var(--space-2)' : 0,
                    }}
                >
                    <Switch
                        id="pf-custom-models"
                        checked={form.useCustomModels}
                        onCheckedChange={(v) => patch('useCustomModels', v)}
                        aria-label="Use custom models"
                    />
                    <label htmlFor="pf-custom-models" style={{ ...LABEL_STYLE, marginBottom: 0, cursor: 'pointer' }}>
                        Use custom models
                    </label>
                </div>
                {form.useCustomModels && <TagInput value={form.customModels} onChange={(v) => patch('customModels', v)} />}
            </div>

            {/* Verification panel — only for saved providers */}
            {form.providerId !== '' && (
                <div style={{ ...FIELD_STYLE, marginTop: 'var(--space-2)' }}>
                    <VerificationPanel providerId={form.providerId} />
                </div>
            )}

            {/* Action bar */}
            <div style={{ display: 'flex', gap: 'var(--space-2)', marginTop: 'auto', paddingTop: 'var(--space-4)', flexWrap: 'wrap' }}>
                {!isCurrent && provider !== null && (
                    <button
                        type="button"
                        onClick={() => onSetCurrent(provider.providerId)}
                        style={{
                            padding: '6px var(--space-3)',
                            border: '1px solid var(--line)',
                            borderRadius: 'var(--radius-sm)',
                            background: 'transparent',
                            color: 'var(--ink)',
                            cursor: 'pointer',
                            fontSize: '0.8125rem',
                            fontFamily: 'var(--font)',
                        }}
                    >
                        Set as current
                    </button>
                )}

                {provider !== null && (
                    <button
                        type="button"
                        onClick={() => setDeleteOpen(true)}
                        style={{
                            padding: '6px var(--space-3)',
                            border: '1px solid var(--err)',
                            borderRadius: 'var(--radius-sm)',
                            background: 'transparent',
                            color: 'var(--err)',
                            cursor: 'pointer',
                            fontSize: '0.8125rem',
                            fontFamily: 'var(--font)',
                        }}
                    >
                        Delete…
                    </button>
                )}

                <button
                    type="button"
                    onClick={onCancel}
                    style={{
                        padding: '6px var(--space-3)',
                        border: '1px solid var(--line)',
                        borderRadius: 'var(--radius-sm)',
                        background: 'transparent',
                        color: 'var(--ink-2)',
                        cursor: 'pointer',
                        fontSize: '0.8125rem',
                        fontFamily: 'var(--font)',
                        marginLeft: 'auto',
                    }}
                >
                    Cancel
                </button>

                <button
                    type="button"
                    onClick={handleSave}
                    disabled={!dirty || !valid}
                    style={{
                        padding: '6px var(--space-3)',
                        border: 'none',
                        borderRadius: 'var(--radius-sm)',
                        background: !dirty || !valid ? 'var(--surface-2)' : 'var(--teal)',
                        color: !dirty || !valid ? 'var(--ink-3)' : '#fff',
                        cursor: !dirty || !valid ? 'not-allowed' : 'pointer',
                        fontSize: '0.8125rem',
                        fontFamily: 'var(--font)',
                        fontWeight: 600,
                    }}
                >
                    Save
                </button>
            </div>

            {/* Delete confirmation */}
            <AlertDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title="Delete provider"
                description={`Are you sure you want to delete "${provider?.providerName ?? ''}"? This cannot be undone.`}
                confirmLabel="Delete"
                cancelLabel="Cancel"
                onConfirm={handleConfirmDelete}
                variant="danger"
            />
        </div>
    );
};

ProviderForm.displayName = 'ProviderForm';
export default ProviderForm;
