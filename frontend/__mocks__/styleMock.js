// Returns the class name key for every property access, enabling CSS module usage in tests.
module.exports = new Proxy(
    {},
    {
        get: (_target, key) => (typeof key === 'string' ? key : undefined),
    }
);
