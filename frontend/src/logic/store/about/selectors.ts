import { apperr } from '../../../../wailsjs/go/models';
import { RootState } from '../index';
import { AboutItemType, AboutSection } from './types';

export const selectAboutSection = (state: RootState): AboutSection => state.about.activeSection;
export const selectAboutSelectedItemId = (state: RootState): string | null => state.about.selectedItemId;
export const selectAboutSelectedItemType = (state: RootState): AboutItemType | null => state.about.selectedItemType;
export const selectAboutInspectorOpen = (state: RootState): boolean => state.about.inspectorOpen;
export const selectAboutInspectorLoading = (state: RootState): boolean => state.about.inspectorLoading;
export const selectAboutInspectorData = (state: RootState): apperr.PromptPreview | null => state.about.inspectorData;
export const selectAboutPreviewInputEnabled = (state: RootState): boolean => state.about.previewInputEnabled;
