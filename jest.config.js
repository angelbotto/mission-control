/** @type {import('jest').Config} */
const config = {
  projects: [
    // ── API Unit Tests (Node environment) ──────────────────────────────
    {
      displayName: 'api',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/__tests__/api/**/*.test.ts'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: { esModuleInterop: true, allowSyntheticDefaultImports: true },
        }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
      },
    },

    // ── Component Smoke Tests (jsdom environment) ───────────────────────
    {
      displayName: 'components',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/src/__tests__/components/**/*.test.tsx'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: {
            jsx: 'react-jsx',
            esModuleInterop: true,
            allowSyntheticDefaultImports: true,
          },
        }],
      },
      moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
        '\\.(css|less|scss|sass)$': '<rootDir>/src/__tests__/__mocks__/styleMock.js',
        '^@xyflow/react$': '<rootDir>/src/__tests__/__mocks__/xyflow.js',
        '^@dagrejs/dagre$': '<rootDir>/src/__tests__/__mocks__/dagre.js',
        '^codemirror$': '<rootDir>/src/__tests__/__mocks__/codemirror.js',
        '^@codemirror/(.*)$': '<rootDir>/src/__tests__/__mocks__/codemirror.js',
      },
      // Each test file imports '@testing-library/jest-dom' explicitly
    },

    // ── Integration Tests (Node, hits live server) ──────────────────────
    {
      displayName: 'integration',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/__tests__/integration/**/*.test.ts'],
      transform: {
        '^.+\\.tsx?$': ['ts-jest', {
          tsconfig: { esModuleInterop: true, allowSyntheticDefaultImports: true },
        }],
      },
      testTimeout: 15000,
    },
  ],
};

module.exports = config;
