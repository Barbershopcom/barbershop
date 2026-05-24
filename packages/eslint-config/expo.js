import base from './base.js';

/** @type {import('eslint').Linter.Config[]} */
export default [
  ...base,
  {
    files: ['**/*.tsx', '**/*.ts'],
    rules: {},
  },
];
