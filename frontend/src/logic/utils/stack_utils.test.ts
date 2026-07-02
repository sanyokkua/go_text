import { apperr } from '../../../wailsjs/go/models';
import { computeInferences } from './stack_utils';

function buildMeta(overrides: Partial<apperr.ActionMeta> & Pick<apperr.ActionMeta, 'id' | 'family'>): apperr.ActionMeta {
    return {
        name: overrides.id,
        category: 'general',
        directive: '',
        orderRank: 0,
        exclusivityGroup: '',
        mergeable: false,
        terminal: false,
        requires: [],
        ...overrides,
    };
}

const DRAFT_A = buildMeta({ id: 'draft-a', family: 'F1', mergeable: true, terminal: false });
const DRAFT_B = buildMeta({ id: 'draft-b', family: 'F1', mergeable: true, terminal: false });
const DRAFT_C = buildMeta({ id: 'draft-c', family: 'F2', mergeable: true, terminal: false });
const TERMINAL_A = buildMeta({ id: 'terminal-a', family: 'F1', mergeable: true, terminal: true });
const NON_MERGEABLE_A = buildMeta({ id: 'nonmergeable-a', family: 'F1', mergeable: false, terminal: false });

const CATALOG: apperr.ActionMeta[] = [DRAFT_A, DRAFT_B, DRAFT_C, TERMINAL_A, NON_MERGEABLE_A];

describe('computeInferences', () => {
    it('returns zero when there are no steps', () => {
        expect(computeInferences([], CATALOG)).toBe(0);
    });

    it('returns one when there is a single step', () => {
        expect(computeInferences(['draft-a'], CATALOG)).toBe(1);
    });

    it('gives a step id that is missing from the catalog its own group', () => {
        expect(computeInferences(['unknown-step'], CATALOG)).toBe(1);
    });

    it('breaks the merge chain when a catalog-missing step appears between two otherwise-mergeable steps', () => {
        // draft-a and draft-b share family F1 and are both mergeable, but the
        // unrecognized step in between resets the merge state, so draft-b
        // starts its own group instead of merging back into draft-a's group.
        expect(computeInferences(['draft-a', 'unknown-step', 'draft-b'], CATALOG)).toBe(3);
    });

    it('merges two consecutive mergeable steps from the same non-terminal family into one group', () => {
        expect(computeInferences(['draft-a', 'draft-b'], CATALOG)).toBe(1);
    });

    it('starts a new group when consecutive steps belong to different families', () => {
        expect(computeInferences(['draft-a', 'draft-c'], CATALOG)).toBe(2);
    });

    it('starts a new group for the step after a terminal step even when family and mergeability match', () => {
        // terminal-a is mergeable but terminal, so the group it starts cannot
        // be extended — the following same-family mergeable step must open a
        // new group of its own.
        expect(computeInferences(['terminal-a', 'draft-a'], CATALOG)).toBe(2);
    });

    it('starts a new group after a non-mergeable step even when the next step shares its family', () => {
        expect(computeInferences(['nonmergeable-a', 'draft-a'], CATALOG)).toBe(2);
    });

    it('computes the correct number of groups for a mixed sequence exercising several merge rules at once', () => {
        // 1: draft-a opens group 1
        // 2: draft-b merges into group 1 (same family, both mergeable, non-terminal)
        // 3: draft-c opens group 2 (different family)
        // 4: terminal-a opens group 3 (different family from draft-c, and is itself terminal)
        // 5: draft-a opens group 4 (previous step was terminal, so no merge)
        // 6: unknown-step opens group 5 (missing from catalog)
        // 7: draft-b opens group 6 (merge state was reset by the unknown step)
        const steps = ['draft-a', 'draft-b', 'draft-c', 'terminal-a', 'draft-a', 'unknown-step', 'draft-b'];
        expect(computeInferences(steps, CATALOG)).toBe(6);
    });
});
