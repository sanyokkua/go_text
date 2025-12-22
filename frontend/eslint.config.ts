// @ts-ignore - Plugin has no TypeScript declarations
import js from '@eslint/js';
// @ts-ignore - Plugin has no TypeScript declarations
import css from '@eslint/css';
import json from '@eslint/json';
import markdown from '@eslint/markdown';
// @ts-ignore - Plugin has no TypeScript declarations
import globals from 'globals';
import tseslint from 'typescript-eslint';
// @ts-ignore - Plugin has no TypeScript declarations
import pluginReact from 'eslint-plugin-react';
import { defineConfig } from 'eslint/config';

export default defineConfig([
    { files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'], plugins: { js }, extends: ['js/recommended'], languageOptions: { globals: globals.browser } },
    tseslint.configs.recommended,
    pluginReact.configs.flat.recommended,
    { files: ['**/*.json'], plugins: { json }, language: 'json/json', extends: ['json/recommended'] },
    { files: ['**/*.jsonc'], plugins: { json }, language: 'json/jsonc', extends: ['json/recommended'] },
    { files: ['**/*.md'], plugins: { markdown }, language: 'markdown/gfm', extends: ['markdown/recommended'] },
    { files: ['**/*.css'], plugins: { css }, language: 'css/css', extends: ['css/recommended'] },
]);
