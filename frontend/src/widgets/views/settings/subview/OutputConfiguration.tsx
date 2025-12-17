import React from 'react';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { setUseMarkdownForOutput } from '../../../../store/settings/AppSettingsReducer';
import SettingsGroup from '../helpers/SettingsGroup';

const OutputConfiguration: React.FC = () => {
    const dispatch = useAppDispatch();
    const useMarkdownForOutput = useAppSelector((state) => state.settingsState.useMarkdownForOutput);
    const isLoadingSettings = useAppSelector((state) => state.settingsState.isLoadingSettings);

    const handleMarkdownToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(setUseMarkdownForOutput(e.currentTarget.checked));
    };

    return (
        <SettingsGroup top={true} headerText="Output Defaults">
            <div className="form-group checkbox-group">
                <input
                    type="checkbox"
                    id="useMarkdown"
                    checked={useMarkdownForOutput}
                    onChange={handleMarkdownToggle}
                    disabled={isLoadingSettings}
                />
                <label htmlFor="useMarkdown">Use Markdown for plaintext Output</label>
            </div>
        </SettingsGroup>
    );
};

OutputConfiguration.displayName = 'OutputConfiguration';
export default OutputConfiguration;
