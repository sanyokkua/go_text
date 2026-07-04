// Mock for Wails ActionHandler to avoid ES module issues in tests
// eslint-disable-next-line no-undef
module.exports = {
    CancelAllRuns: jest.fn(),
    CancelChain: jest.fn(),
    GetActionCatalog: jest.fn(),
    GetModels: jest.fn(),
    PreviewPrompt: jest.fn(),
    ProcessPromptChain: jest.fn(),
    TestConnection: jest.fn(),
    TestInference: jest.fn(),
    TestModels: jest.fn(),
};
