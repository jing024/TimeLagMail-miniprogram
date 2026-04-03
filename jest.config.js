module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>'],
  testMatch: ['**/__tests__/**/*.test.js', '**/__tests__/**/*.test.ts'],
  moduleFileExtensions: ['ts', 'js', 'json'],
  collectCoverageFrom: [
    'cloudfunctions/**/*.ts',
    '!cloudfunctions/**/__tests__/**'
  ],
  coverageDirectory: 'coverage',
  verbose: true,
  moduleNameMapper: {
    '^wx-server-sdk$': '<rootDir>/__mocks__/wx-server-sdk.js'
  },
  clearMocks: true,
  resetModules: true
}
