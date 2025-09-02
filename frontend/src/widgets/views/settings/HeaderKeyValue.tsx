import React from 'react';
import { KeyValuePair } from '../../../common/types';
import Button from '../../base/Button';

type HeaderKeyValueProps = {
    header: KeyValuePair;
    index: number;
    onChange: (index: number, key: string, value: string) => void;
    onDelete: (index: number) => void;
};
const HeaderKeyValue: React.FC<HeaderKeyValueProps> = ({ header, index, onChange, onDelete }) => {
    return (
        <div className="header-row">
            <div className="header-input-group">
                <label htmlFor={`headerKey-${index}`}>Header Key:</label>
                <input
                    type="text"
                    id={`headerKey-${index}`}
                    value={header.key}
                    onChange={(e) => onChange(index, e.target.value, header.value)}
                />
            </div>
            <div className="header-input-group">
                <label htmlFor={`headerValue-${index}`}>Header Value:</label>
                <input
                    type="text"
                    id={`headerValue-${index}`}
                    value={header.value}
                    onChange={(e) => onChange(index, header.key, e.target.value)}
                />
            </div>
            <Button text="Delete" variant="outlined" size="small" onClick={() => onDelete(index)} />
        </div>
    );
};
HeaderKeyValue.displayName = 'HeaderKeyValue';
export default HeaderKeyValue;
