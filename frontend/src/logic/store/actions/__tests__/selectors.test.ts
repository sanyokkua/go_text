import { apperr } from '../../../../wailsjs/go/models';
import type { RootState } from '../../index';
import { selectCatalogByCategory } from '../selectors';

function makeAction(id: string, category: string): apperr.ActionMeta {
    return {
        id,
        name: id,
        category,
        family: '',
        directive: '',
        orderRank: 0,
        exclusivityGroup: '',
        mergeable: false,
        terminal: false,
        requires: [],
    } as apperr.ActionMeta;
}

function stateWithCatalog(catalog: apperr.ActionMeta[]): RootState {
    return { actions: { catalog } } as RootState;
}

describe('selectCatalogByCategory', () => {
    it('groups actions in first-seen category order, not alphabetical order', () => {
        // Arrange: first-seen order is Tone -> Proofreading -> Rewriting.
        // Alphabetical order would be Proofreading, Rewriting, Tone — deliberately
        // different so the test fails if the selector sorts instead of preserving order.
        // Same-category actions are scattered (non-contiguous) to prove grouping.
        const catalog = [
            makeAction('tone-formal', 'Tone'),
            makeAction('proofread-grammar', 'Proofreading'),
            makeAction('rewrite-concise', 'Rewriting'),
            makeAction('tone-casual', 'Tone'),
            makeAction('proofread-spelling', 'Proofreading'),
            makeAction('rewrite-expand', 'Rewriting'),
        ];

        // Act
        const groups = selectCatalogByCategory(stateWithCatalog(catalog));

        // Assert: categories follow first-appearance order
        const categoryOrder = groups.map((group) => group.category);
        expect(categoryOrder).toEqual(['Tone', 'Proofreading', 'Rewriting']);
        // Explicitly NOT alphabetical
        expect(categoryOrder).not.toEqual([...categoryOrder].sort((a, b) => a.localeCompare(b)));
    });

    it('collects every action belonging to a category into that category group', () => {
        // Arrange
        const catalog = [makeAction('tone-formal', 'Tone'), makeAction('proofread-grammar', 'Proofreading'), makeAction('tone-casual', 'Tone')];

        // Act
        const groups = selectCatalogByCategory(stateWithCatalog(catalog));

        // Assert
        const toneGroup = groups.find((group) => group.category === 'Tone');
        expect(toneGroup?.actions.map((action) => action.id)).toEqual(['tone-formal', 'tone-casual']);
    });

    it('returns an empty array when the catalog is empty', () => {
        // Arrange, Act
        const groups = selectCatalogByCategory(stateWithCatalog([]));

        // Assert
        expect(groups).toEqual([]);
    });
});
