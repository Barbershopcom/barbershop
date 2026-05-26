import reactHooks from 'eslint-plugin-react-hooks';

import base from './base.js';

/** Só rules-of-hooks + exhaustive-deps (idem nextjs.js). */
export default [
  ...base,
  {
    files: ['**/*.tsx', '**/*.ts'],
    plugins: {
      'react-hooks': reactHooks,
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
];
