import React, { useEffect, useState } from 'react';

import { Settings } from '../../../../../logic/adapter/models';
import { useAppDispatch } from '../../../../../logic/store';
import { updateInferenceBaseConfig } from '../../../../../logic/store/settings/thunks';
import { Button } from '../../../../components/Button';
import { Switch } from '../../../../primitives/Switch';

interface InferenceForm {
    timeout: number;
    maxRetries: number;
    useMarkdownForOutput: boolean;
}

function toForm(cfg: Settings['inferenceBaseConfig']): InferenceForm {
    return {
        timeout: cfg.timeout,
        maxRetries: cfg.maxRetries,
        useMarkdownForOutput: cfg.useMarkdownForOutput,
    };
}

function isFormDirty(form: InferenceForm, original: Settings['inferenceBaseConfig']): boolean {
    return (
        form.timeout !== original.timeout ||
        form.maxRetries !== original.maxRetries ||
        form.useMarkdownForOutput !== original.useMarkdownForOutput
    );
}

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
    gap: 'var(--space-2)',
};

const numberInput: React.CSSProperties = {
    width: 96,
    padding: '4px 8px',
    border: '1px solid var(--line)',
    borderRadius: 'var(--radius)',
    background: 'var(--surface)',
    color: 'var(--ink-1)',
    fontSize: '0.875rem',
};

const caption: React.CSSProperties = {
    fontSize: '0.75rem',
    color: 'var(--ink-3)',
    marginTop: 'var(--space-1)',
};

interface Props {
    settings: Settings;
}

const InferenceConfigTab: React.FC<Props> = ({ settings }) => {
    const dispatch = useAppDispatch();

    const [form, setForm] = useState<InferenceForm>(() => toForm(settings.inferenceBaseConfig));
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        setForm(toForm(settings.inferenceBaseConfig));
    }, [settings.inferenceBaseConfig]);

    const handleTimeoutChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const parsed = Number.parseInt(e.target.value, 10);
        if (!Number.isNaN(parsed)) {
            setForm((prev) => ({ ...prev, timeout: parsed }));
        }
    };

    const handleMaxRetriesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const parsed = Number.parseInt(e.target.value, 10);
        if (!Number.isNaN(parsed)) {
            setForm((prev) => ({ ...prev, maxRetries: parsed }));
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await dispatch(updateInferenceBaseConfig(form)).unwrap();
        } finally {
            setSaving(false);
        }
    };

    const isDirty = isFormDirty(form, settings.inferenceBaseConfig);

    return (
        <section style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={fieldRow}>
                <span style={fieldLabel}>Request timeout (seconds)</span>
                <div style={fieldValue}>
                    <input
                        type="number"
                        style={numberInput}
                        value={form.timeout}
                        min={10}
                        max={3600}
                        step={1}
                        onChange={handleTimeoutChange}
                        aria-label="Request timeout in seconds"
                    />
                </div>
            </div>

            <div style={{ ...fieldRow, flexDirection: 'column', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', width: '100%' }}>
                    <span style={fieldLabel}>Max retries</span>
                    <div style={fieldValue}>
                        <input
                            type="number"
                            style={numberInput}
                            value={form.maxRetries}
                            min={0}
                            max={10}
                            step={1}
                            onChange={handleMaxRetriesChange}
                            aria-label="Maximum number of retries"
                        />
                    </div>
                </div>
                <p style={{ ...caption, paddingLeft: 'calc(200px + var(--space-3))' }}>
                    Applies to transient errors only (timeout, 429, 5xx). Automatic exponential back-off.
                </p>
            </div>

            <div style={{ ...fieldRow, borderBottom: 'none' }}>
                <span style={fieldLabel}>Request Markdown output</span>
                <div style={fieldValue}>
                    <Switch
                        checked={form.useMarkdownForOutput}
                        onCheckedChange={(checked) => setForm((prev) => ({ ...prev, useMarkdownForOutput: checked }))}
                        aria-label="Request Markdown output"
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

InferenceConfigTab.displayName = 'InferenceConfigTab';

export default InferenceConfigTab;
