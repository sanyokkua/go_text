import React, { useEffect, useState } from 'react';
import { KeyValuePair } from '../../../common/types';
import Button from '../../base/Button';

type HeaderKeyValueProps = {
    value: KeyValuePair;
    onChange: (obj: KeyValuePair) => void;
    onDelete: (obj: KeyValuePair) => void;
    isDisabled?: boolean;
};

const HeaderKeyValue: React.FC<HeaderKeyValueProps> = ({ value, onChange, onDelete, isDisabled = false }) => {
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
                <label>Key:</label>
                <input
                    type="text"
                    value={headerKey}
                    onChange={(e) => setHeaderKey(e.target.value)}
                    onBlur={handleKeyBlur}
                    onKeyDown={handleKeyDown}
                    placeholder="Header name"
                    disabled={isDisabled}
                />
            </div>
            <div className="header-input-group">
                <label>Value:</label>
                <input
                    type="text"
                    value={headerValue}
                    onBlur={handleKeyBlur}
                    onChange={(e) => setHeaderValue(e.target.value)}
                    placeholder="Header value"
                    disabled={isDisabled}
                />
            </div>
            <Button text="Delete" variant="text" size="tiny" colorStyle="error-color" onClick={() => onDelete(value)} disabled={isDisabled} />
        </div>
    );
};

HeaderKeyValue.displayName = 'HeaderKeyValue';
export default HeaderKeyValue;
