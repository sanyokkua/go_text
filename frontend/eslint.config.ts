import js from '@eslint/js';
import css from '@eslint/css';
import json from '@eslint/json';
import markdown from '@eslint/markdown';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import pluginReact from 'eslint-plugin-react';
import pluginReactHooks from 'eslint-plugin-react-hooks';
import { defineConfig } from 'eslint/config';

const TS_JS_GLOB = '**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}';

// Scope a config or config array to specific file globs.
// tseslint.configs.recommended is an array; React config is a plain object.
// eslint-plugin-react@7.37.x crashes (getAllComments not a function) when linting
// non-JS files — restricting to TS_JS_GLOB prevents the plugin from seeing JSON/CSS.
function scopeToJs<T extends object>(conf: T | T[]): T[] {
    const arr = Array.isArray(conf) ? conf : [conf];
    return arr.map((c) => ({ ...c, files: [TS_JS_GLOB] }));
}

export default defineConfig([
    {
        ignores: [
            '.tmp/**', 'coverage/**', 'node_modules/**', 'wailsjs/**', 'dist/**',
            // Jest infrastructure files: CJS require() is intentional
            '__mocks__/**',
            // Auto-generated lockfile — not user-maintained code
            'package-lock.json',
        ],
    },
    { files: [TS_JS_GLOB], plugins: { js }, extends: ['js/recommended'], languageOptions: { globals: globals.browser } },
    // Scope to TS/JS files — avoids eslint-plugin-react@7.37.x crash on JSON/CSS files
    ...scopeToJs(tseslint.configs.recommended),
    // jsx-runtime variant disables react/react-in-jsx-scope (not needed in React 17+)
    ...scopeToJs(pluginReact.configs.flat['jsx-runtime'] ?? pluginReact.configs.flat.recommended),
    // React hooks rules (flat config)
    ...scopeToJs(pluginReactHooks.configs.flat.recommended),
    // Disable rules superseded by TypeScript type checking; tune react-hooks
    {
        files: [TS_JS_GLOB],
        rules: {
            'react/prop-types': 'off',
            // Underscore-prefixed params are conventional markers for intentionally unused args
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            // Pre-existing components reset state at start of effects — warn only, don't block CI
            'react-hooks/set-state-in-effect': 'warn',
        },
    },
    // Bridge-mock, dev tooling, and test files use CJS require() in jest.mock() factories
    {
        files: ['src/dev/bridge-mock/**/*.ts', 'jest.config.cjs', '__mocks__/**', '**/*.test.{ts,tsx}', '**/__tests__/**'],
        rules: {
            '@typescript-eslint/no-require-imports': 'off',
            // Pre-existing: test files still import React explicitly (pre-JSX-transform style)
            '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^(_|React)' }],
        },
    },
    { files: ['**/*.json'], plugins: { json }, language: 'json/json', extends: ['json/recommended'] },
    { files: ['**/*.jsonc'], plugins: { json }, language: 'json/jsonc', extends: ['json/recommended'] },
    { files: ['**/*.md'], plugins: { markdown }, language: 'markdown/gfm', extends: ['markdown/recommended'] },
    {
        files: ['**/*.css'],
        plugins: { css },
        language: 'css/css',
        extends: ['css/recommended'],
        rules: {
            // CSS custom properties (--foo) are always valid; the rule doesn't recognise them
            'css/no-invalid-properties': 'off',
            // use-baseline flags widely-supported features as "experimental" — too noisy
            'css/use-baseline': 'off',
        },
    },
]);
