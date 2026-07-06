'use strict';
// Minimal CJS stand-in for the ESM-only react-markdown package.
// Used by all test files that import components which transitively depend on
// react-markdown. MarkdownView.test.tsx overrides this with a richer factory mock.
const React = require('react');
module.exports = {
    __esModule: true,
    default: function MockReactMarkdown({ children: source = '', components: _comps = {} }) {
        return React.createElement('div', { className: 'markdown-body' }, source);
    },
};
