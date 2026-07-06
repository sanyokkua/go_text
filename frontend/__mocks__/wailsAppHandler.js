// Mock for Wails ApplicationContextHolder bindings
// eslint-disable-next-line no-undef
module.exports = {
    LogError: jest.fn().mockResolvedValue({}),
    ClipboardGetText: jest.fn().mockResolvedValue({ data: '' }),
    ClipboardSetText: jest.fn().mockResolvedValue({}),
    BrowserOpenURL: jest.fn().mockResolvedValue({}),
    OpenPath: jest.fn().mockResolvedValue({}),
    SaveWindowSize: jest.fn().mockResolvedValue({}),
};
