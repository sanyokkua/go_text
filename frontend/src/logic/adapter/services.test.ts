import { DuplicateStack } from '../../../wailsjs/go/stacks/StackHandler';
import { guardArity } from './bridgeGuard';
import { LoggerService, StackHandler } from './services';

// Regression test for the live-testing bug report: calling a Wails-bound
// method with the wrong argument count used to hang the returned Promise
// forever, because Wails v2's Go-side IPC dispatcher logs the arity error
// but never sends a response frame back over the bridge. `guardArity`
// (see bridgeGuard.ts) fixes this by rejecting before the call ever reaches
// the bridge.
describe('StackHandler bridge-arity guard', () => {
    it('duplicateStack still resolves normally end-to-end through the guarded wrapper when called correctly', async () => {
        const handler = new StackHandler(LoggerService.getLogger());

        await expect(handler.duplicateStack('id-1', 'new-name')).resolves.not.toBeInstanceOf(Error);
    });

    // Note on test design: `StackHandler.duplicateStack(id, newName)` always
    // forwards both of its declared parameters positionally to the guarded
    // binding, so calling `duplicateStack` itself with too few arguments
    // (via a TypeScript-bypassing cast) does not reproduce the bug — the
    // method body still evaluates and passes exactly 2 arguments
    // underneath, which matches the guard's expected arity and resolves
    // normally (see the test above). The real exploit surface — as hit by
    // the live tester calling `window.go.stacks.StackHandler.DuplicateStack(id)`
    // directly — is a mismatch between the *bound Wails function's* real
    // arity and however many arguments a caller supplies to it directly. So
    // this test reconstructs the exact wrapper `services.ts` builds
    // internally (`guardArity('StackHandler.DuplicateStack', DuplicateStack)`)
    // against the same mocked `DuplicateStack` binding `services.ts` uses,
    // and calls it the way the live tester's buggy call did.
    it('rejects rather than hanging when the real DuplicateStack binding is called with too few arguments', async () => {
        const duplicateStackSafe = guardArity('StackHandler.DuplicateStack', DuplicateStack);

        const badCall = (duplicateStackSafe as unknown as (id: string) => Promise<unknown>)('id-only');

        await expect(badCall).rejects.toThrow(/StackHandler\.DuplicateStack: expected 2 argument\(s\), received 1/);
    });
});
