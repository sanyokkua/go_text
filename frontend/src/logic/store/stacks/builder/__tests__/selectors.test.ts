import { configureStore } from '@reduxjs/toolkit';
import stacksBuilderReducer from '../slice';
import actionsReducer from '../../../actions/slice';

jest.mock('../../../../../logic/adapter', () => ({
    getLogger: () => ({ logInfo: jest.fn(), logDebug: jest.fn(), logError: jest.fn(), logWarn: jest.fn() }),
}));

import {
    selectBuilderFamilyGroups,
    selectBuilderInferenceCount,
    selectBuilderIsValid,
    selectBuilderActionAvailability,
} from '../selectors';
import type { RootState } from '../../../index';

function meta(overrides: Partial<{
    id: string; name: string; family: string; category: string; mergeable: boolean;
    terminal: boolean; exclusivityGroup: string; orderRank: number; directive: string; requires: string[];
}>) {
    return {
        id: overrides.id ?? 'a1',
        name: overrides.name ?? 'Action',
        family: overrides.family ?? 'rewrite',
        category: overrides.category ?? 'Cat',
        mergeable: overrides.mergeable ?? true,
        terminal: overrides.terminal ?? false,
        exclusivityGroup: overrides.exclusivityGroup ?? '',
        orderRank: overrides.orderRank ?? 10,
        directive: overrides.directive ?? '',
        requires: overrides.requires ?? [],
    };
}

const REWRITE_PROOFREAD = meta({ id: 'proofread', name: 'Proofread', family: 'rewrite', mergeable: true, exclusivityGroup: 'proofread' });
const REWRITE_TONE_FORMAL = meta({ id: 'tone-formal', name: 'Formal', family: 'rewrite', mergeable: true, exclusivityGroup: 'tone' });
const REWRITE_TONE_FRIENDLY = meta({ id: 'tone-friendly', name: 'Friendly', family: 'rewrite', mergeable: true, exclusivityGroup: 'tone' });
const STRUCTURE_FORMAT = meta({ id: 'bullets', name: 'Bullets', family: 'structure', mergeable: true, exclusivityGroup: 'format' });
const SUMMARIZE = meta({ id: 'summary', name: 'Summary', family: 'summarize', mergeable: false, terminal: true, exclusivityGroup: 'summarize' });
const TRANSLATE = meta({ id: 'translate', name: 'Translate', family: 'translate', mergeable: false, terminal: true, exclusivityGroup: 'translate' });
const PROMPTENG = meta({ id: 'prompteng-text', name: 'Improve Prompt', family: 'prompteng', mergeable: false, terminal: true, exclusivityGroup: 'prompteng-text' });

const ALL_METAS = [REWRITE_PROOFREAD, REWRITE_TONE_FORMAL, REWRITE_TONE_FRIENDLY, STRUCTURE_FORMAT, SUMMARIZE, TRANSLATE, PROMPTENG];

function makeStore(steps: string[]) {
    const store = configureStore({
        reducer: { stacksBuilder: stacksBuilderReducer, actions: actionsReducer },
        preloadedState: {
            stacksBuilder: { steps, name: '', icon: '' },
            actions: { catalog: ALL_METAS, catalogStatus: 'success' as const, availableModels: [], modelsStatus: 'idle' as const },
        },
    });
    return store.getState() as unknown as RootState;
}

describe('selectBuilderFamilyGroups', () => {
    it('returns empty array for empty steps', () => {
        const state = makeStore([]);
        expect(selectBuilderFamilyGroups(state)).toEqual([]);
    });

    it('merges same-family mergeable actions into one group', () => {
        const state = makeStore(['proofread', 'tone-formal']);
        const groups = selectBuilderFamilyGroups(state);
        expect(groups).toHaveLength(1);
        expect(groups[0].family).toBe('rewrite');
        expect(groups[0].steps).toHaveLength(2);
    });

    it('does not merge different-family actions even if both are mergeable', () => {
        const state = makeStore(['proofread', 'bullets']);
        const groups = selectBuilderFamilyGroups(state);
        expect(groups).toHaveLength(2);
        expect(groups[0].family).toBe('rewrite');
        expect(groups[1].family).toBe('structure');
    });

    it('a non-mergeable action always starts its own group', () => {
        const state = makeStore(['summary', 'proofread']);
        const groups = selectBuilderFamilyGroups(state);
        expect(groups).toHaveLength(2);
    });

    it('terminal action closes group so next action starts a new group', () => {
        const state = makeStore(['proofread', 'translate', 'summary']);
        const groups = selectBuilderFamilyGroups(state);
        // proofread: rewrite group (mergeable open)
        // translate: new terminal group (closes)
        // summary: new terminal group
        expect(groups).toHaveLength(3);
    });

    it('records correct flatIndex on each step', () => {
        const state = makeStore(['proofread', 'tone-formal', 'bullets']);
        const groups = selectBuilderFamilyGroups(state);
        expect(groups[0].steps[0].flatIndex).toBe(0);
        expect(groups[0].steps[1].flatIndex).toBe(1);
        expect(groups[1].steps[0].flatIndex).toBe(2);
    });
});

describe('selectBuilderInferenceCount', () => {
    it('is 0 for empty steps', () => {
        expect(selectBuilderInferenceCount(makeStore([]))).toBe(0);
    });

    it('is 1 for two same-family mergeable actions', () => {
        expect(selectBuilderInferenceCount(makeStore(['proofread', 'tone-formal']))).toBe(1);
    });

    it('is 2 for rewrite + structure', () => {
        expect(selectBuilderInferenceCount(makeStore(['proofread', 'bullets']))).toBe(2);
    });

    it('is 3 for rewrite + structure + summarize', () => {
        expect(selectBuilderInferenceCount(makeStore(['proofread', 'bullets', 'summary']))).toBe(3);
    });
});

describe('selectBuilderIsValid', () => {
    it('is false for empty steps', () => {
        expect(selectBuilderIsValid(makeStore([]))).toBe(false);
    });

    it('is true for a single valid action', () => {
        expect(selectBuilderIsValid(makeStore(['proofread']))).toBe(true);
    });

    it('is true for 3 inferences (max)', () => {
        expect(selectBuilderIsValid(makeStore(['proofread', 'bullets', 'summary']))).toBe(true);
    });

    it('is false when inference count would exceed 3', () => {
        // rewrite + structure + summarize + translate = 4 groups → invalid
        expect(selectBuilderIsValid(makeStore(['proofread', 'bullets', 'summary', 'translate']))).toBe(false);
    });
});

describe('selectBuilderActionAvailability', () => {
    it('marks an action as selected when it is in steps', () => {
        const state = makeStore(['proofread']);
        const avail = selectBuilderActionAvailability(state);
        expect(avail['proofread'].selected).toBe(true);
    });

    it('marks an action in the same exclusivity group as disabled', () => {
        const state = makeStore(['tone-formal']);
        const avail = selectBuilderActionAvailability(state);
        expect(avail['tone-friendly'].disabled).toBe(true);
        expect(avail['tone-friendly'].disabledReason).toContain('tone');
    });

    it('marks a same-family mergeable action as not adding new inference', () => {
        const state = makeStore(['proofread']);
        const avail = selectBuilderActionAvailability(state);
        // tone-formal is same family (rewrite), mergeable, not terminal
        expect(avail['tone-formal'].addsNewInference).toBe(false);
    });

    it('marks a different-family action as adding new inference', () => {
        const state = makeStore(['proofread']);
        const avail = selectBuilderActionAvailability(state);
        expect(avail['bullets'].addsNewInference).toBe(true);
    });

    it('disables all unselected actions when 5-step cap is reached', () => {
        // 5 steps: proofread, tone-formal, bullets, summary, translate
        const state = makeStore(['proofread', 'tone-formal', 'bullets', 'summary', 'translate']);
        const avail = selectBuilderActionAvailability(state);
        const notSelected = Object.values(avail).filter((a) => !a.selected);
        expect(notSelected.every((a) => a.disabled)).toBe(true);
    });

    it('disables prompteng when non-prompteng steps exist', () => {
        const state = makeStore(['proofread']);
        const avail = selectBuilderActionAvailability(state);
        expect(avail['prompteng-text'].disabled).toBe(true);
        expect(avail['prompteng-text'].disabledReason).toContain('sole step');
    });

    it('disables non-prompteng when prompteng step exists', () => {
        const state = makeStore(['prompteng-text']);
        const avail = selectBuilderActionAvailability(state);
        expect(avail['proofread'].disabled).toBe(true);
    });
});
