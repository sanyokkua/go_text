import { apperr } from '../../../wailsjs/go/models';

/**
 * Counts how many separate inference calls a stack's steps will produce.
 *
 * Consecutive steps merge into a single inference only when they share the same
 * family, are both mergeable, and the previous step is not terminal — otherwise
 * each step starts a new inference group. This mirrors the backend grouping rule
 * so the UI badge ("N inferences") matches what the chain orchestrator will run.
 */
export function computeInferences(steps: string[], catalog: apperr.ActionMeta[]): number {
    const metaById = new Map(catalog.map((m) => [m.id, m]));
    let groups = 0;
    let lastFamily = '';
    let lastMergeable = false;

    for (const stepId of steps) {
        const meta = metaById.get(stepId);
        const canExtend = groups > 0 && meta !== undefined && lastFamily === meta.family && meta.mergeable && lastMergeable && !meta.terminal;

        if (!canExtend) {
            groups++;
            lastFamily = meta?.family ?? '';
            lastMergeable = meta?.mergeable === true && meta.terminal !== true;
        }
    }
    return groups;
}
