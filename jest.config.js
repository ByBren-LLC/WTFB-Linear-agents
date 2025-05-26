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
  // Specific timeout for OAuth tests that may need external mocking
  testPathIgnorePatterns: [],
  setupFilesAfterEnv: [],
  // Increase timeout for integration tests
  globals: {
    'ts-jest': {
      tsconfig: 'tsconfig.json'
    }
  }
};
