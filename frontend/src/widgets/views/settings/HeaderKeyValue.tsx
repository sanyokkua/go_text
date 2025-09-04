import React, { useEffect, useState } from 'react';
import { KeyValuePair } from '../../../common/types';
import Button from '../../base/Button';

type HeaderKeyValueProps = {
    value: KeyValuePair;
    onChange: (obj: KeyValuePair) => void;
    onDelete: (obj: KeyValuePair) => void;
};

const HeaderKeyValue: React.FC<HeaderKeyValueProps> = ({ value, onChange, onDelete }) => {
    const [headerKey, setHeaderKey] = useState<string>(value.key);
    const [headerValue, setHeaderValue] = useState<string>(value.value);

    useEffect(() => {
        setHeaderKey(value.key);
        setHeaderValue(value.value);
    }, [value.key, value.value]);

    const handleChange = () => {
        onChange({ ...value, key: headerKey, value: headerValue });
    };

    const handleKeyBlur = (_: React.FocusEvent<HTMLInputElement>) => {
        handleChange();
    };
    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleChange();
        }
    };

    return (
        <div className="header-row">
            <div className="header-input-group">
                <label>Header Key:</label>
                <input
                    type="text"
                    value={headerKey}
                    onChange={(e) => setHeaderKey(e.target.value)}
                    onBlur={handleKeyBlur}
                    onKeyDown={handleKeyDown}
                    placeholder="Header name"
                />
            </div>
            <div className="header-input-group">
                <label>Header Value:</label>
                <input
                    type="text"
                    value={headerValue}
                    onBlur={handleKeyBlur}
                    onChange={(e) => setHeaderValue(e.target.value)}
                    placeholder="Header value"
                />
            </div>
            <Button text="Delete" variant="outlined" size="small" onClick={() => onDelete(value)} />
        </div>
    );
};

HeaderKeyValue.displayName = 'HeaderKeyValue';
export default HeaderKeyValue;
