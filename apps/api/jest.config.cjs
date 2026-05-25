/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  rootDir: '.',
  roots: ['<rootDir>/test'],
  testMatch: ['**/*.spec.ts', '**/*.test.ts'],
  setupFiles: ['<rootDir>/test/setup-env.ts'],
  testTimeout: 30000,
  // Single worker — o pool serverless do Neon não tem ganho real com paralelismo
  // pra esse volume, e simplifica raciocínio sobre ordem de fixtures.
  maxWorkers: 1,
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.spec.json' }],
  },
};
