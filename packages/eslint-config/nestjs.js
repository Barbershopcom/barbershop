import base from './base.js';

/**
 * NestJS usa decorator metadata (reflect-metadata) pra DI: constructor
 * params precisam ser RUNTIME imports, mesmo que TS infira que são "só
 * tipos". Se `consistent-type-imports` reescrever pra `import type`, o
 * metadata vira `undefined` e o DI quebra silenciosamente.
 *
 * Por isso desligamos a regra aqui. Em apps Next/Expo (sem reflect-metadata)
 * ela continua ligada via warning.
 */
export default [
  ...base,
  {
    files: ['**/*.ts'],
    rules: {
      '@typescript-eslint/no-extraneous-class': 'off',
      '@typescript-eslint/consistent-type-imports': 'off',
    },
  },
];
