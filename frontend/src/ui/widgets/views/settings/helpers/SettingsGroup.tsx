import React, { ReactNode } from 'react';

const SettingsGroup: React.FC<{ children: ReactNode; top?: boolean; headerText?: string }> = ({ children, top = false, headerText }) => {
    if (top) {
        return (
            <div className="form-group-top">
                {headerText && <h3>{headerText}</h3>}
                {children}
            </div>
        );
    }
    return (
        <div className="form-group">
            {headerText && <h4>{headerText}</h4>}
            {children}
        </div>
    );
};

SettingsGroup.displayName = 'SettingsGroup';
export default SettingsGroup;
