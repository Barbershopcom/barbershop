import reactHooks from 'eslint-plugin-react-hooks';

import base from './base.js';

/**
 * Carregamos só as 2 regras clássicas de react-hooks:
 *  - rules-of-hooks: bloqueia chamadas em condicionais/loops
 *  - exhaustive-deps: checagem de dependências do useEffect/useMemo/useCallback
 *
 * NÃO incluímos o preset `recommended` completo porque ele traz regras
 * novas da era React Compiler (ex: set-state-in-effect) que flaggam
 * padrões legítimos pré-Compiler tipo `useEffect(() => { fetchData() }, [])`.
 * Quando migrarmos pra React Compiler, podemos reavaliar.
 */
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
