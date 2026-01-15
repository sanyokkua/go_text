// Jests configuration for TypeScript
/** @type {import('jest').Config} */
const config = {
    // Use TypeScript preset
    preset: 'ts-jest',
    
    // Test environment
    testEnvironment: 'node',
    
    // Module file extensions for importing
    moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json', 'node'],
    
    // Transform TypeScript files
    transform: {
        '^.+\\.(ts|tsx)$': ['ts-jest', {
            useESM: true,
            tsconfig: 'tsconfig.test.json'
        }]
    },
    
    // Ignore Wails-generated files
    transformIgnorePatterns: [
        '/node_modules/',
        '/wailsjs/'
    ],
    
    // Test match patterns
    testMatch: ['**/__tests__/**/*.test.(ts|tsx|js|jsx)', '**/?(*.)+(spec|test).(ts|tsx|js|jsx)'],
    
    // Module name mapper for ESM imports
    moduleNameMapper: {
        '^(.{1,2}/.*)\\.js$': '$1',
        // Mock Wails-generated files to avoid ES module issues
        '^../../../wailsjs/go/actions/ActionHandler$': '<rootDir>/__mocks__/wailsActionHandler.js',
        '^../../../wailsjs/go/models$': '<rootDir>/__mocks__/wailsModels.js',
        '^../../../wailsjs/go/settings/SettingsHandler$': '<rootDir>/__mocks__/wailsSettingsHandler.js',
        '^../../../wailsjs/runtime$': '<rootDir>/__mocks__/wailsRuntime.js'
    },
    
    // Enable ESM support
    extensionsToTreatAsEsm: ['.ts', '.tsx'],
    
    // Globals
    globals: {
        'ts-jest': {
            useESM: true
        }
    },
    
    // Verbose output
    verbose: true,
    
    // Clear mocks between tests
    clearMocks: true,
    
    // Coverage settings
    collectCoverage: false,
    coverageDirectory: 'coverage'
};

// eslint-disable-next-line no-undef
module.exports = config;