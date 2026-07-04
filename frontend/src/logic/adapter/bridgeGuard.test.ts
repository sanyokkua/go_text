import { guardArity } from './bridgeGuard';

describe('guardArity', () => {
    it('rejects immediately when called with fewer arguments than the bound function declares', async () => {
        const bound = (_a: string, _b: string) => Promise.resolve('ok');
        const guarded = guardArity('Test.Method', bound) as (...args: unknown[]) => Promise<string>;

        await expect(guarded('only-one')).rejects.toThrow(/expected 2 argument\(s\), received 1/);
    });

    it('calls through and resolves when the argument count matches', async () => {
        const bound = (a: string, b: string) => Promise.resolve(`${a}-${b}`);
        const guarded = guardArity('Test.Method', bound);

        await expect(guarded('x', 'y')).resolves.toBe('x-y');
    });

    it('rejects when called with more arguments than the bound function declares', async () => {
        const bound = (_a: string) => Promise.resolve('ok');
        const guarded = guardArity('Test.Method', bound) as (...args: unknown[]) => Promise<string>;

        await expect(guarded('a', 'extra')).rejects.toThrow(/expected 1 argument\(s\), received 2/);
    });

    it('works correctly for a zero-argument bound function', async () => {
        const bound = () => Promise.resolve('zero-arg-ok');
        const guarded = guardArity('Test.ZeroArgMethod', bound);

        await expect(guarded()).resolves.toBe('zero-arg-ok');
    });

    it('rejects with an error naming the offending method when arity mismatches', async () => {
        const bound = (_a: string) => Promise.resolve('ok');
        const guarded = guardArity('StackHandler.DuplicateStack', bound) as (...args: unknown[]) => Promise<string>;

        await expect(guarded()).rejects.toThrow(/StackHandler\.DuplicateStack/);
    });
});
