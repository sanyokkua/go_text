import React, { useCallback, useEffect, useState } from 'react';

import { apperr } from '../../../../../../wailsjs/go/models';
import { ActionHandlerAdapter } from '../../../../../logic/adapter';
import { Settings } from '../../../../../logic/adapter/models';
import { selectCurrentProvider, useAppDispatch, useAppSelector } from '../../../../../logic/store';
import { updateModelConfig } from '../../../../../logic/store/settings/thunks';
import { Button } from '../../../../components/Button';
import { RadioGroup } from '../../../../primitives/RadioGroup';
import { Select } from '../../../../primitives/Select';
import { Slider } from '../../../../primitives/Slider';
import { Switch } from '../../../../primitives/Switch';

type ModelDiscoveryState = 'idle' | 'loading' | 'error';

interface ModelForm {
    name: string;
    useTemperature: boolean;
    temperature: number;
    useContextWindow: boolean;
    contextWindow: number;
    useLegacyMaxTokens: boolean;
}

function toForm(cfg: Settings['modelConfig']): ModelForm {
    return {
        name: cfg.name,
        useTemperature: cfg.useTemperature,
        temperature: cfg.temperature,
        useContextWindow: cfg.useContextWindow,
        contextWindow: cfg.contextWindow,
        useLegacyMaxTokens: cfg.useLegacyMaxTokens,
    };
}

function isFormDirty(form: ModelForm, original: Settings['modelConfig']): boolean {
    return (
        form.name !== original.name ||
        form.useTemperature !== original.useTemperature ||
        form.temperature !== original.temperature ||
        form.useContextWindow !== original.useContextWindow ||
        form.contextWindow !== original.contextWindow ||
        form.useLegacyMaxTokens !== original.useLegacyMaxTokens
    );
}

const TOKEN_PARAM_OPTIONS = [
    { value: 'false', label: 'max_completion_tokens (standard, recommended)' },
    { value: 'true', label: 'max_tokens (legacy)' },
];

const fieldRow: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
    padding: 'var(--space-3) 0',
    borderBottom: '1px solid var(--line)',
};

const fieldLabel: React.CSSProperties = {
    minWidth: 200,
    color: 'var(--ink-1)',
    fontSize: '0.875rem',
    fontWeight: 500,
};

const fieldValue: React.CSSProperties = {
    flex: 1,
    display: 'flex',
    alignItems: 'center',
    gap: 'var(--space-3)',
};

const numericDisplay: React.CSSProperties = {
    minWidth: 48,
    textAlign: 'right',
    color: 'var(--ink-2)',
    fontSize: '0.8125rem',
    fontVariantNumeric: 'tabular-nums',
};

interface Props {
    settings: Settings;
}

const ModelConfigTab: React.FC<Props> = ({ settings }) => {
    const dispatch = useAppDispatch();
    const currentProvider = useAppSelector(selectCurrentProvider);

    const [form, setForm] = useState<ModelForm>(() => toForm(settings.modelConfig));
    const [discoveredModels, setDiscoveredModels] = useState<apperr.ModelInfo[]>([]);
    const [discoveryState, setDiscoveryState] = useState<ModelDiscoveryState>('idle');
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setForm(toForm(settings.modelConfig));
    }, [settings.modelConfig]);

    const discoverModels = useCallback(async () => {
        if (!currentProvider) return;
        setDiscoveryState('loading');
        try {
            const res = await ActionHandlerAdapter.getModels(currentProvider.providerId);
            if (res.error) {
                setDiscoveryState('error');
                return;
            }
            const models = res.data ?? [];
            setDiscoveredModels(models);
            setDiscoveryState('idle');

            const matched = models.find((m) => m.id === form.name);
            if (matched?.caps?.supportsTemperature === false) {
                setForm((prev) => ({ ...prev, useTemperature: false }));
            }
        } catch {
            setDiscoveryState('error');
        }
    }, [currentProvider, form.name]);

    useEffect(() => {
        discoverModels();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentProvider?.providerId]);

    const handleModelChange = (modelId: string) => {
        const matched = discoveredModels.find((m) => m.id === modelId);
        setForm((prev) => ({
            ...prev,
            name: modelId,
            ...(matched?.caps?.supportsTemperature === false ? { useTemperature: false } : {}),
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await dispatch(updateModelConfig(form)).unwrap();
        } finally {
            setSaving(false);
        }
    };

    const isDirty = isFormDirty(form, settings.modelConfig);

    const modelSelectItems = (() => {
        const items = discoveredModels.map((m) => ({ value: m.id, label: m.label }));
        const alreadyPresent = items.some((item) => item.value === form.name);
        if (!alreadyPresent && form.name) {
            items.unshift({ value: form.name, label: form.name });
        }
        return items;
    })();

    const modelSelectPlaceholder = (() => {
        if (discoveryState === 'loading') return '(Loading models…)';
        if (discoveryState === 'error') return '(Discovery failed — use custom models)';
        return 'Select a model';
    })();

    return (
        <section style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={fieldRow}>
                <span style={fieldLabel}>Model</span>
                <div style={{ ...fieldValue, gap: 'var(--space-2)' }}>
                    <div style={{ flex: 1 }}>
                        <Select
                            value={form.name}
                            onValueChange={handleModelChange}
                            items={modelSelectItems}
                            placeholder={modelSelectPlaceholder}
                            disabled={discoveryState === 'loading'}
                        />
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={discoverModels}
                        disabled={discoveryState === 'loading' || !currentProvider}
                    >
                        ⟳ Refresh
                    </Button>
                </div>
            </div>

            <div style={fieldRow}>
                <span style={fieldLabel}>Use temperature</span>
                <div style={fieldValue}>
                    <Switch
                        checked={form.useTemperature}
                        onCheckedChange={(checked) => setForm((prev) => ({ ...prev, useTemperature: checked }))}
                        aria-label="Use temperature"
                    />
                    {form.useTemperature && (
                        <>
                            <div style={{ flex: 1 }}>
                                <Slider
                                    value={[form.temperature]}
                                    onValueChange={([v]) => setForm((prev) => ({ ...prev, temperature: v }))}
                                    min={0}
                                    max={2}
                                    step={0.05}
                                />
                            </div>
                            <span style={numericDisplay}>{form.temperature.toFixed(2)}</span>
                        </>
                    )}
                </div>
            </div>

            <div style={fieldRow}>
                <span style={fieldLabel}>Use context window</span>
                <div style={fieldValue}>
                    <Switch
                        checked={form.useContextWindow}
                        onCheckedChange={(checked) => setForm((prev) => ({ ...prev, useContextWindow: checked }))}
                        aria-label="Use context window"
                    />
                    {form.useContextWindow && (
                        <>
                            <div style={{ flex: 1 }}>
                                <Slider
                                    value={[form.contextWindow]}
                                    onValueChange={([v]) => setForm((prev) => ({ ...prev, contextWindow: v }))}
                                    min={512}
                                    max={131072}
                                    step={512}
                                />
                            </div>
                            <span style={numericDisplay}>{form.contextWindow.toLocaleString()}</span>
                        </>
                    )}
                </div>
            </div>

            <div style={{ ...fieldRow, borderBottom: 'none', alignItems: 'flex-start' }}>
                <span style={{ ...fieldLabel, paddingTop: 'var(--space-1)' }}>Token limit parameter</span>
                <div style={fieldValue}>
                    <RadioGroup
                        value={form.useLegacyMaxTokens ? 'true' : 'false'}
                        onValueChange={(val) => setForm((prev) => ({ ...prev, useLegacyMaxTokens: val === 'true' }))}
                        items={TOKEN_PARAM_OPTIONS}
                    />
                </div>
            </div>

            <div style={{ paddingTop: 'var(--space-4)', display: 'flex', justifyContent: 'flex-end' }}>
                <Button
                    variant="primary"
                    onClick={handleSave}
                    disabled={!isDirty || saving}
                >
                    {saving ? 'Saving…' : 'Save'}
                </Button>
            </div>
        </section>
    );
};

ModelConfigTab.displayName = 'ModelConfigTab';

export default ModelConfigTab;
