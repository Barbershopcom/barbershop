import config from '@barbearia/eslint-config/nextjs';

export default [
  ...config,
  {
    // Arquivos de config JS na raiz (next.config.mjs etc.) rodam em Node.
    // Sem isso, no-undef (de js.recommended, ativo em .js/.mjs) acusa
    // `process is not defined`. Em .ts não ocorre — typescript-eslint
    // desliga no-undef. Escopado à raiz pra não afrouxar o resto.
    files: ['*.{js,cjs,mjs}'],
    languageOptions: {
      globals: {
        process: 'readonly',
        module: 'writable',
        require: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
    },
  },
];
