/** @type {import('jest').Config} */
const config = {
    preset: 'ts-jest',
    testEnvironment: 'jest-environment-jsdom',
    setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    transform: { '^.+\\.(ts|tsx)$': ['ts-jest', { useESM: true, tsconfig: 'tsconfig.test.json' }] },
    extensionsToTreatAsEsm: ['.ts', '.tsx'],
    transformIgnorePatterns: ['/node_modules/', '/wailsjs/'],
    testMatch: [
        '**/__tests__/**/*.test.(ts|tsx|js|jsx)',
        '**/?(*.)+(spec|test).(ts|tsx|js|jsx)',
    ],
    testPathIgnorePatterns: ['/node_modules/', '/e2e/'],
    globals: { 'ts-jest': { useESM: true } },
    moduleNameMapper: {
        '\\.module\\.css$': '<rootDir>/__mocks__/styleMock.js',
        // react-markdown and the remark/rehype/unified ecosystem are all ESM-only.
        // They cannot be transformed by ts-jest without --experimental-vm-modules.
        // Tests that need the real pipeline use Playwright (e2e/). All Jest tests
        // get a minimal CJS passthrough; MarkdownView.test.tsx overrides it with
        // a richer jest.mock() factory.
        '^react-markdown$': '<rootDir>/__mocks__/react-markdown.cjs',
        '^remark-gfm$': '<rootDir>/__mocks__/remark-gfm.cjs',
        '^remark-math$': '<rootDir>/__mocks__/remark-math.cjs',
        '^rehype-katex$': '<rootDir>/__mocks__/rehype-katex.cjs',
        '^rehype-highlight$': '<rootDir>/__mocks__/rehype-highlight.cjs',
        '^mermaid$': '<rootDir>/__mocks__/mermaid.cjs',
        '^(.{1,2}/.*)\\.js$': '$1',
        // v2 wailsjs mocks (preserved until v3 handlers regenerate bindings)
        '^../../../wailsjs/go/actions/ActionHandler$': '<rootDir>/__mocks__/wailsActionHandler.js',
        '^../../../wailsjs/go/models$': '<rootDir>/__mocks__/wailsModels.js',
        '^../../../../wailsjs/go/models$': '<rootDir>/__mocks__/wailsModels.js',
        '^../../../../../wailsjs/go/models$': '<rootDir>/__mocks__/wailsModels.js',
        '^../../../../../../wailsjs/go/models$': '<rootDir>/__mocks__/wailsModels.js',
        '^../../../../../../../wailsjs/go/models$': '<rootDir>/__mocks__/wailsModels.js',
        '^../../../wailsjs/go/settings/SettingsHandler$': '<rootDir>/__mocks__/wailsSettingsHandler.js',
        '^../../../wailsjs/runtime$': '<rootDir>/__mocks__/wailsRuntime.js',
        '^../../wailsjs/runtime$': '<rootDir>/__mocks__/wailsRuntime.js',
        '^../../../../wailsjs/runtime$': '<rootDir>/__mocks__/wailsRuntime.js',
        '^../../../wailsjs/go/history/HistoryHandler$': '<rootDir>/__mocks__/wailsHistoryHandler.js',
        '^../../../wailsjs/go/stacks/StackHandler$': '<rootDir>/__mocks__/wailsStackHandler.js',
        '^../../../wailsjs/go/application/ApplicationContextHolder$': '<rootDir>/__mocks__/wailsAppHandler.js',
    },
    verbose: true,
    clearMocks: true,
    collectCoverage: false,
    coverageDirectory: 'coverage',
    coveragePathIgnorePatterns: ['/node_modules/', '/wailsjs/'],
    coverageThreshold: {
        // Floors set 5-7 points below current coverage to prevent regression.
        // Tighten these incrementally as test coverage improves across tasks.
        global: {
            lines: 70,
            statements: 70,
            branches: 60,
            functions: 56,
        },
        './src/logic/': {
            lines: 62,
            functions: 53,
        },
    },
};

module.exports = config;
