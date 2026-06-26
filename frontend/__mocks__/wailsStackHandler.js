// Mock for Wails StackHandler to avoid ES module issues in tests
// eslint-disable-next-line no-undef
module.exports = {
    CreateStack: jest.fn(),
    DeleteStack: jest.fn(),
    DuplicateStack: jest.fn(),
    GetStack: jest.fn(),
    ListStacks: jest.fn(),
    SetRepository: jest.fn(),
    UpdateStack: jest.fn(),
};
