import React, { useState } from 'react';

interface TagInputProps {
    value: string[];
    onChange: (v: string[]) => void;
    placeholder?: string;
    disabled?: boolean;
}

const chipStyle: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '2px',
    background: 'color-mix(in srgb, var(--teal) 15%, transparent)',
    border: '1px solid var(--teal)',
    color: 'var(--teal)',
    borderRadius: 'var(--radius-sm)',
    padding: '2px 6px',
    fontSize: '0.8rem',
    whiteSpace: 'nowrap',
};

const chipRemoveStyle: React.CSSProperties = {
    background: 'transparent',
    border: 'none',
    color: 'var(--teal)',
    cursor: 'pointer',
    padding: '0 2px',
    lineHeight: 1,
    fontSize: '0.75rem',
    display: 'flex',
    alignItems: 'center',
};

const textInputStyle: React.CSSProperties = {
    border: 'none',
    outline: 'none',
    background: 'transparent',
    color: 'var(--ink)',
    fontSize: '0.875rem',
    flex: 1,
    minWidth: '8ch',
    padding: '2px',
};

export const TagInput: React.FC<TagInputProps> = ({
    value,
    onChange,
    placeholder = 'Add model…',
    disabled = false,
}) => {
    const [inputText, setInputText] = useState('');
    const [focused, setFocused] = useState(false);

    const containerStyle: React.CSSProperties = {
        border: `1px solid ${focused ? 'var(--teal)' : 'var(--line)'}`,
        borderRadius: 'var(--radius-sm)',
        padding: '4px',
        display: 'flex',
        flexWrap: 'wrap',
        gap: '4px',
        minHeight: '36px',
        alignItems: 'center',
        background: 'var(--surface)',
        cursor: disabled ? 'not-allowed' : 'text',
        opacity: disabled ? 0.6 : 1,
    };

    const addTag = (raw: string) => {
        const trimmed = raw.trim();
        if (trimmed === '' || value.includes(trimmed)) return;
        onChange([...value, trimmed]);
    };

    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(inputText);
            setInputText('');
            return;
        }
        if (e.key === 'Backspace' && inputText === '' && value.length > 0) {
            onChange(value.slice(0, -1));
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const raw = e.target.value;
        // Commit immediately if the user types a comma
        if (raw.endsWith(',')) {
            addTag(raw.slice(0, -1));
            setInputText('');
        } else {
            setInputText(raw);
        }
    };

    const handleRemoveTag = (tag: string) => {
        onChange(value.filter((t) => t !== tag));
    };

    return (
        <div
            style={containerStyle}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            role="group"
            aria-label="Model names"
        >
            {value.map((tag) => (
                <span key={tag} style={chipStyle}>
                    {tag}
                    <button
                        type="button"
                        style={chipRemoveStyle}
                        onClick={() => handleRemoveTag(tag)}
                        disabled={disabled}
                        aria-label={`Remove ${tag}`}
                    >
                        ✕
                    </button>
                </span>
            ))}
            <input
                type="text"
                value={inputText}
                onChange={handleInputChange}
                onKeyDown={handleInputKeyDown}
                placeholder={value.length === 0 ? placeholder : ''}
                disabled={disabled}
                aria-label="New model name"
                style={textInputStyle}
            />
        </div>
    );
};

TagInput.displayName = 'TagInput';
export default TagInput;
