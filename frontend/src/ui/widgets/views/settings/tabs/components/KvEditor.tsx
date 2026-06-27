import React, { useEffect, useRef, useState } from 'react';

interface KvRow {
    key: string;
    value: string;
}

interface KvEditorProps {
    value: Record<string, string>;
    onChange: (v: Record<string, string>) => void;
    disabled?: boolean;
}

const rowsToRecord = (rows: KvRow[]): Record<string, string> => {
    const result: Record<string, string> = {};
    for (const row of rows) {
        if (row.key !== '') {
            result[row.key] = row.value;
        }
    }
    return result;
};

const recordToRows = (record: Record<string, string>): KvRow[] =>
    Object.entries(record).map(([key, value]) => ({ key, value }));

const inputBase: React.CSSProperties = {
    flex: 1,
    padding: '4px var(--space-2)',
    fontSize: '0.875rem',
    background: 'var(--surface)',
    color: 'var(--ink)',
    border: '1px solid var(--line)',
    borderRadius: 'var(--radius-sm)',
    outline: 'none',
    fontFamily: 'var(--mono)',
};

const removeButtonStyle: React.CSSProperties = {
    flexShrink: 0,
    padding: '2px var(--space-1)',
    background: 'transparent',
    border: 'none',
    color: 'var(--err)',
    cursor: 'pointer',
    fontSize: '1rem',
    lineHeight: 1,
    borderRadius: 'var(--radius-sm)',
};

const addButtonStyle: React.CSSProperties = {
    alignSelf: 'flex-start',
    marginTop: 'var(--space-1)',
    padding: '4px var(--space-3)',
    background: 'transparent',
    border: '1px solid var(--teal)',
    color: 'var(--teal)',
    borderRadius: 'var(--radius-sm)',
    cursor: 'pointer',
    fontSize: '0.8rem',
    fontWeight: 600,
};

export const KvEditor: React.FC<KvEditorProps> = ({ value, onChange, disabled = false }) => {
    const [rows, setRows] = useState<KvRow[]>(() => recordToRows(value));

    // Keep local rows in sync when the prop changes from outside, but never clobber
    // an in-progress edit (e.g. a freshly added empty row). We compare the Record
    // derived from current rows against the incoming prop so empty rows are invisible
    // to the comparison and are never evicted by a prop round-trip.
    const prevPropRef = useRef<Record<string, string>>(value);
    useEffect(() => {
        const derivedRecord = rowsToRecord(rows);
        const isSameAsDerived = JSON.stringify(derivedRecord) === JSON.stringify(value);
        if (!isSameAsDerived && JSON.stringify(prevPropRef.current) !== JSON.stringify(value)) {
            setRows(recordToRows(value));
        }
        prevPropRef.current = value;
    }, [value, rows]);

    const keyFieldRefs = useRef<Array<HTMLInputElement | null>>([]);

    const focusLastKeyField = () => {
        requestAnimationFrame(() => {
            keyFieldRefs.current.at(-1)?.focus();
        });
    };

    const commitChange = (nextRows: KvRow[]) => {
        setRows(nextRows);
        onChange(rowsToRecord(nextRows));
    };

    const handleKeyChange = (index: number, key: string) => {
        const nextRows = rows.map((row, i) => (i === index ? { ...row, key } : row));
        commitChange(nextRows);
    };

    const handleValueChange = (index: number, val: string) => {
        const nextRows = rows.map((row, i) => (i === index ? { ...row, value: val } : row));
        commitChange(nextRows);
    };

    const handleValueKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        const newRows = [...rows, { key: '', value: '' }];
        setRows(newRows);
        onChange(rowsToRecord(newRows));
        focusLastKeyField();
    };

    const handleRemove = (index: number) => {
        const nextRows = rows.filter((_, i) => i !== index);
        commitChange(nextRows);
    };

    const handleAddRow = () => {
        const nextRows = [...rows, { key: '', value: '' }];
        setRows(nextRows);
        onChange(rowsToRecord(nextRows));
        focusLastKeyField();
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)' }}>
            {rows.map((row, index) => {
                const keyIsInvalid = row.key === '' && row.value !== '';
                const keyInputStyle: React.CSSProperties = {
                    ...inputBase,
                    borderColor: keyIsInvalid ? 'var(--err)' : 'var(--line)',
                };

                return (
                    <div key={index} style={{ display: 'flex', gap: 'var(--space-2)', alignItems: 'center' }}>
                        <input
                            ref={(el) => { keyFieldRefs.current[index] = el; }}
                            type="text"
                            value={row.key}
                            onChange={(e) => handleKeyChange(index, e.target.value)}
                            placeholder="Header name"
                            disabled={disabled}
                            aria-label={`Header key ${index + 1}`}
                            aria-invalid={keyIsInvalid}
                            style={keyInputStyle}
                        />
                        <input
                            type="text"
                            value={row.value}
                            onChange={(e) => handleValueChange(index, e.target.value)}
                            onKeyDown={handleValueKeyDown}
                            placeholder="Value"
                            disabled={disabled}
                            aria-label={`Header value ${index + 1}`}
                            style={inputBase}
                        />
                        <button
                            type="button"
                            onClick={() => handleRemove(index)}
                            disabled={disabled}
                            aria-label={`Remove header ${index + 1}`}
                            style={removeButtonStyle}
                        >
                            ×
                        </button>
                    </div>
                );
            })}
            <button
                type="button"
                onClick={handleAddRow}
                disabled={disabled}
                style={addButtonStyle}
            >
                + Add header
            </button>
        </div>
    );
};

KvEditor.displayName = 'KvEditor';
export default KvEditor;
