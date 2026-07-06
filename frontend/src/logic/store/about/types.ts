import { apperr } from '../../../../wailsjs/go/models';

export type AboutSection = 'guide' | 'actions-stacks';
export type AboutItemType = 'action' | 'stack';

export interface AboutState {
    activeSection: AboutSection;
    selectedItemId: string | null;
    selectedItemType: AboutItemType | null;
    inspectorOpen: boolean;
    inspectorLoading: boolean;
    inspectorData: apperr.PromptPreview | null;
    inspectorError: string | null;
    previewInputEnabled: boolean;
    suggestedStacks: apperr.SuggestedStack[];
}
