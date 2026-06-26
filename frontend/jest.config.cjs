/** @type {import('jest').Config} */
const config = {
    preset: 'ts-jest',
    testEnvironment: 'jest-environment-jsdom',
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    transform: { '^.+\\.(ts|tsx)$': ['ts-jest', { useESM: true, tsconfig: 'tsconfig.test.json' }] },
    transformIgnorePatterns: ['/node_modules/', '/wailsjs/'],
    testMatch: [
        '**/__tests__/**/*.test.(ts|tsx|js|jsx)',
        '**/?(*.)+(spec|test).(ts|tsx|js|jsx)',
    ],
    testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
    extensionsToTreatAsEsm: ['.ts', '.tsx'],
    globals: { 'ts-jest': { useESM: true } },
    moduleNameMapper: {
        '\\.module\\.css$': '<rootDir>/__mocks__/styleMock.js',
        '^(.{1,2}/.*)\\.js$': '$1',
        // v2 wailsjs mocks (preserved until v3 handlers regenerate bindings)
        '^../../../wailsjs/go/actions/ActionHandler$': '<rootDir>/__mocks__/wailsActionHandler.js',
        '^../../../wailsjs/go/models$': '<rootDir>/__mocks__/wailsModels.js',
        '^../../../../wailsjs/go/models$': '<rootDir>/__mocks__/wailsModels.js',
        '^../../../wailsjs/go/settings/SettingsHandler$': '<rootDir>/__mocks__/wailsSettingsHandler.js',
        '^../../../wailsjs/runtime$': '<rootDir>/__mocks__/wailsRuntime.js',
        '^../../wailsjs/runtime$': '<rootDir>/__mocks__/wailsRuntime.js',
    },
    verbose: true,
    clearMocks: true,
    collectCoverage: false,
    coverageDirectory: 'coverage',
    coveragePathIgnorePatterns: ['/node_modules/', '/wailsjs/'],
};

module.exports = config;
