import { createSelector } from '@reduxjs/toolkit';

import { apperr } from '../../../../../wailsjs/go/models';

import { RootState } from '../../index';

export const selectBuilderSteps = (state: RootState): string[] => state.stacksBuilder.steps;

export const selectBuilderName = (state: RootState): string => state.stacksBuilder.name;

export const selectBuilderIcon = (state: RootState): string => state.stacksBuilder.icon;

export const selectBuilderStepCount = createSelector([selectBuilderSteps], (steps) => steps.length);

export const selectBuilderCatalog = (state: RootState): apperr.ActionMeta[] => state.actions.catalog;

export interface FamilyGroupStep {
    id: string;
    name: string;
    family: string;
    flatIndex: number;
}

export interface FamilyGroup {
    family: string;
    steps: FamilyGroupStep[];
    /** true when the group was started by a mergeable non-terminal action (can be extended) */
    groupMergeable: boolean;
}

export const selectBuilderFamilyGroups = createSelector([selectBuilderSteps, selectBuilderCatalog], (steps, catalog): FamilyGroup[] => {
    const metaById = new Map<string, apperr.ActionMeta>(catalog.map((m) => [m.id, m]));
    const groups: FamilyGroup[] = [];

    steps.forEach((stepId, flatIndex) => {
        const meta = metaById.get(stepId);
        const last = groups.at(-1);

        const canExtend =
            last !== undefined && meta !== undefined && last.family === meta.family && meta.mergeable && last.groupMergeable && !meta.terminal;

        if (canExtend) {
            last?.steps.push({ id: stepId, name: meta?.name ?? stepId, family: meta?.family ?? '', flatIndex });
        } else {
            groups.push({
                family: meta?.family ?? 'unknown',
                steps: [{ id: stepId, name: meta?.name ?? stepId, family: meta?.family ?? '', flatIndex }],
                groupMergeable: meta?.mergeable === true && meta.terminal !== true,
            });
        }
    });

    return groups;
});

export const selectBuilderInferenceCount = createSelector([selectBuilderFamilyGroups], (groups) => groups.length);

export const selectBuilderIsValid = createSelector(
    [selectBuilderStepCount, selectBuilderInferenceCount],
    (count, inferences) => count > 0 && count <= 5 && inferences <= 3,
);

export interface ActionAvailability {
    selected: boolean;
    disabled: boolean;
    disabledReason: string;
    addsNewInference: boolean;
}

export type ActionAvailabilityMap = Record<string, ActionAvailability>;

export const selectBuilderActionAvailability = createSelector(
    [selectBuilderSteps, selectBuilderCatalog, selectBuilderFamilyGroups, selectBuilderStepCount, selectBuilderInferenceCount],
    (steps, catalog, groups, stepCount, inferenceCount): ActionAvailabilityMap => {
        const metaById = new Map<string, apperr.ActionMeta>(catalog.map((m) => [m.id, m]));
        const selectedIds = new Set(steps);
        const usedExclusivity = new Set<string>(steps.map((id) => metaById.get(id)?.exclusivityGroup ?? '').filter(Boolean));
        const hasPromptEng = steps.some((id) => metaById.get(id)?.family === 'prompteng');
        const hasNonPromptEng = steps.some((id) => {
            const family = metaById.get(id)?.family;
            return family !== undefined && family !== 'prompteng';
        });

        const lastGroup = groups.at(-1);
        const result: ActionAvailabilityMap = {};

        for (const meta of catalog) {
            const selected = selectedIds.has(meta.id);

            const wouldExtend = lastGroup?.family === meta.family && meta.mergeable && !!lastGroup?.groupMergeable && !meta.terminal;

            const projectedInferences = wouldExtend ? inferenceCount : inferenceCount + 1;
            const addsNewInference = !wouldExtend;

            let disabledReason = '';
            if (stepCount >= 5) {
                disabledReason = '5-step cap reached';
            } else if (projectedInferences > 3) {
                disabledReason = '3-inference cap reached';
            } else if (meta.exclusivityGroup && !selected && usedExclusivity.has(meta.exclusivityGroup)) {
                disabledReason = `One ${meta.exclusivityGroup} already added`;
            } else if (meta.family === 'prompteng' && hasNonPromptEng) {
                disabledReason = 'Prompt Engineering must be the sole step';
            } else if (meta.family !== 'prompteng' && hasPromptEng) {
                disabledReason = 'Prompt Engineering must be the sole step';
            }

            result[meta.id] = { selected, disabled: !selected && disabledReason !== '', disabledReason, addsNewInference };
        }

        return result;
    },
);
