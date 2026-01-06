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
    
    // Test match patterns
    testMatch: ['**/__tests__/**/*.test.(ts|tsx|js|jsx)', '**/?(*.)+(spec|test).(ts|tsx|js|jsx)'],
    
    // Module name mapper for ESM imports
    moduleNameMapper: {
        '^(.{1,2}/.*)\\.js$': '$1'
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