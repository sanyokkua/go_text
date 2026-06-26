// Mock for Wails runtime to avoid ES module issues in tests
// eslint-disable-next-line no-undef
module.exports = {
	LogError: jest.fn().mockResolvedValue(undefined),
};
