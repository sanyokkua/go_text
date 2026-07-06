// Returns the class name key for every property access, enabling CSS module usage in tests.
// `__esModule` must stay falsy: ts-jest's __importDefault interop helper checks it to decide
// whether to wrap the module in `{ default: mod }`. A catch-all proxy that also answers
// `__esModule` truthily fools that check, so `import styles from '*.module.css'` resolves
// to the literal string "default" instead of this proxy.
module.exports = new Proxy(
    {},
    {
        get: (_target, key) => (typeof key === 'string' && key !== '__esModule' ? key : undefined),
    }
);
