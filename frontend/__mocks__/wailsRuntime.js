// Mock for Wails runtime to avoid ES module issues in tests
// eslint-disable-next-line no-undef
module.exports = {
    LogDebug: jest.fn(),
    LogError: jest.fn(),
    LogFatal: jest.fn(),
    LogInfo: jest.fn(),
    LogPrint: jest.fn(),
    LogTrace: jest.fn(),
    LogWarning: jest.fn(),
    EventsOn: jest.fn(),
    EventsOff: jest.fn(),
    EventsOnce: jest.fn(),
    EventsEmit: jest.fn(),
    WindowGetSize: jest.fn(),
};
