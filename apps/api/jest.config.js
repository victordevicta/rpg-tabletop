/** @type {import('jest').Config} */
module.exports = {
  moduleFileExtensions: ['js', 'json', 'ts'],
  rootDir: '.',
  testRegex: '\\.spec\\.ts$',
  transform: {
    '^.+\\.ts$': ['ts-jest', { tsconfig: 'tsconfig.json' }],
  },
  testEnvironment: 'node',
  moduleNameMapper: {
    '^@eldertable/dice-engine$':    '<rootDir>/../../packages/dice-engine/src/index.ts',
    '^@eldertable/shared$':         '<rootDir>/../../packages/shared/src/index.ts',
    '^@eldertable/discord-bridge$': '<rootDir>/../../packages/discord-bridge/src/index.ts',
  },
  collectCoverageFrom: [
    'src/**/*.service.ts',
    '!src/main.ts',
    '!src/**/*.module.ts',
  ],
  coverageDirectory: 'coverage',
  coverageReporters: ['text', 'lcov'],
};
