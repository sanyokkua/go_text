/**
 * Wraps a generated Wails binding so a caller-side argument-count mismatch
 * rejects immediately instead of hanging forever. Wails v2's IPC dispatcher
 * logs an "error parsing arguments" message on arity mismatch but never
 * sends a response frame back over the bridge, so the JS Promise created by
 * the raw window.go.* call never resolves or rejects. Expected arity is
 * derived from the bound function's own .length so this guard cannot go
 * stale after `wails generate module` regenerates a binding with a
 * different signature.
 */
export function guardArity<TArgs extends unknown[], TResult>(
    methodName: string,
    bound: (...args: TArgs) => Promise<TResult>,
): (...args: TArgs) => Promise<TResult> {
    const expectedArity = bound.length;
    return (...args: TArgs) => {
        if (args.length !== expectedArity) {
            return Promise.reject(new Error(`${methodName}: expected ${expectedArity} argument(s), received ${args.length}`));
        }
        return bound(...args);
    };
}
