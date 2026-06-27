'use strict';
// ESM interop shim: unified imports `extend` as a default import.
// The real `extend` package is CJS (module.exports = fn) with no __esModule flag.
// Providing `default` here satisfies the ESM default import.
const extend = require('extend');
module.exports = { __esModule: true, default: extend, ...extend };
