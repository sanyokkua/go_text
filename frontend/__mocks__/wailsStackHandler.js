// Mock for Wails StackHandler to avoid ES module issues in tests.
// Each stub declares the same parameter count as the real generated binding
// (frontend/wailsjs/go/stacks/StackHandler.js) so that guardArity's
// self-derived expected-arity (bound.length) matches production for any
// test that exercises the arity guard, not just an incidental value.
// eslint-disable-next-line no-undef
module.exports = {
    CreateStack: jest.fn((_arg1) => Promise.resolve()),
    DeleteStack: jest.fn((_arg1) => Promise.resolve()),
    DuplicateStack: jest.fn((_arg1, _arg2) => Promise.resolve()),
    GetStack: jest.fn((_arg1) => Promise.resolve()),
    ListStacks: jest.fn(() => Promise.resolve()),
    SetRepository: jest.fn((_arg1) => Promise.resolve()),
    SuggestedStacks: jest.fn(() => Promise.resolve()),
    UpdateStack: jest.fn((_arg1) => Promise.resolve()),
};
