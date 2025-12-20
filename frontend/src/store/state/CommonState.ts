import { SelectItem } from '../../widgets/base/Select';
import { TabContentBtn } from '../../widgets/tabs/common/TabButtonsWidget';

export interface State {
    actionGroups: { [key: string]: TabContentBtn[] };
    languages: { availableInputLanguages: SelectItem[]; availableOutputLanguages: SelectItem[] };
    errorMessage: string;

    // UI Managed
    textEditorInputContent: string;
    textEditorOutputContent: string;
    selectedInputLanguage: SelectItem;
    selectedOutputLanguage: SelectItem;

    // Provider and task
    currentProvider: string;
    currentModelName: string;
    currentTask: string;

    // App State
    isProcessing: boolean;

    // View State
    showSettingsView: boolean;
}
