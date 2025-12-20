import React from 'react';
import { useAppDispatch, useAppSelector } from '../../../../store/hooks';
import { setEditableUseMarkdown } from '../../../../store/cfg/SettingsStateReducer';
import SettingsGroup from '../helpers/SettingsGroup';

const OutputConfiguration: React.FC = () => {
    const dispatch = useAppDispatch();

    // Selector from new state
    const loadedSettingsEditable = useAppSelector((state) => state.settingsState.loadedSettingsEditable);
    const isLoadingSettings = useAppSelector((state) => state.settingsState.isLoadingSettings);

    // Use markdown setting with null check
    const useMarkdownForOutput = loadedSettingsEditable.useMarkdownForOutput || false;

    const handleMarkdownToggle = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(setEditableUseMarkdown(e.currentTarget.checked));
    };

    return (
        <SettingsGroup top={true} headerText="Output Defaults">
            <div className="form-group checkbox-group">
                <input type="checkbox" id="useMarkdown" checked={useMarkdownForOutput} onChange={handleMarkdownToggle} disabled={isLoadingSettings} />
                <label htmlFor="useMarkdown">Use Markdown for plaintext Output</label>
            </div>
        </SettingsGroup>
    );
};

OutputConfiguration.displayName = 'OutputConfiguration';
export default OutputConfiguration;
