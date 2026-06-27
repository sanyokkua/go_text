// Mock for Wails runtime to avoid ES module issues in tests
// eslint-disable-next-line no-undef
module.exports = {
    LogError: jest.fn(),
    EventsOn: jest.fn(),
    EventsOff: jest.fn(),
    EventsOnce: jest.fn(),
    EventsEmit: jest.fn(),
};
