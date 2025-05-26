/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  collectCoverage: true,
  coverageDirectory: 'coverage',
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/index.ts',
    '!src/**/*.d.ts'
  ],
  coverageThreshold: {
    global: {
      branches: 70,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  // Timeout configuration for OAuth integration tests
  testTimeout: 15000, // 15 seconds for all tests
  // Timer mocking configuration
  fakeTimers: {
    enableGlobally: false // We'll enable per-test for better control
  },
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  // TypeScript configuration - Updated for Jest 29+
  transform: {
    '^.+\\.ts$': ['ts-jest', {
      tsconfig: 'tsconfig.json'
    }]
  }
};
