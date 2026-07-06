// Mock for Wails HistoryHandler to avoid ES module issues in tests
// eslint-disable-next-line no-undef
module.exports = {
    ClearHistory: jest.fn(),
    DeleteHistoryEntry: jest.fn(),
    GetHistoryEntry: jest.fn(),
    ListHistory: jest.fn(),
};
