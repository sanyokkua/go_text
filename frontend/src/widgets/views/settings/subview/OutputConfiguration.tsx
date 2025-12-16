import React from 'react';
import SettingsGroup from '../helpers/SettingsGroup';

type OutputConfigurationProps = { text?: string };

const OutputConfiguration: React.FC<OutputConfigurationProps> = () => {
    return (
        <SettingsGroup top={true} headerText="Output Defaults">
            <div className="form-group checkbox-group">
                <input type="checkbox" id="useMarkdown" checked={true} onChange={() => {}} disabled={false} />
                <label htmlFor="useMarkdown">Use Markdown for plaintext Output</label>
            </div>
        </SettingsGroup>
    );
};

OutputConfiguration.displayName = 'OutputConfiguration';
export default OutputConfiguration;
