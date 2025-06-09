const nextJest = require('next/jest')

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: './',
})

// Add any custom config to be passed to Jest
const customJestConfig = {
  setupFilesAfterEnv: ['<rootDir>/jest.setup.new.js'],
  testEnvironment: 'jest-environment-jsdom',
  moduleDirectories: ['node_modules', '<rootDir>/'],
  testPathIgnorePatterns: [
    '<rootDir>/.next/', 
    '<rootDir>/node_modules/',
    '<rootDir>/tests/',
    '<rootDir>/src/tests/',
    '<rootDir>/apps/',
    '<rootDir>/vault/',
    '<rootDir>/VaultAgent.test.ts',
    '<rootDir>/AuthAgent.test.ts',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^@/src/(.*)$': '<rootDir>/src/$1',
    '^@/components/(.*)$': '<rootDir>/components/$1',
    '^@/lib/(.*)$': '<rootDir>/lib/$1',
    '^@/app/(.*)$': '<rootDir>/app/$1',
  },
  collectCoverageFrom: [
    'app/**/*.{js,jsx,ts,tsx}',
    'src/**/*.{js,jsx,ts,tsx}',
    'lib/**/*.{js,jsx,ts,tsx}',
    'components/**/*.{js,jsx,ts,tsx}',
    '!app/layout.tsx',
    '!app/globals.css',
    '!**/*.d.ts',
    '!**/node_modules/**',
    '!src/tests/**',
    '!tests/**',
    '!apps/**',
    '!vault/**',
  ],
  coverageThreshold: {
    global: {
      branches: 50,
      functions: 50,
      lines: 50,
      statements: 50,
    },
  },
  // Only use testRegex to avoid conflicts
  testRegex: [
    '__tests__/.*\\.(test|spec)\\.(js|jsx|ts|tsx)$',
  ],
}

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(customJestConfig) 