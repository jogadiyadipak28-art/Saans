module.exports = {
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/e2e/'],
  transform: {
    '^.+\\.tsx?$': '<rootDir>/jest-transformer.cjs',
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '\\.(css|svg)$': '<rootDir>/jest-file-mock.cjs',
  },
  collectCoverageFrom: ['lib/**/*.ts', '!lib/**/*.test.ts', '!lib/engine/index.ts'],
  coverageThreshold: {
    global: {
      branches: 60,
      functions: 80,
      lines: 80,
      statements: 80,
    },
    'lib/engine/': {
      branches: 70,
      functions: 75,
      lines: 80,
      statements: 80,
    },
    'lib/ai/memory.ts': { branches: 80, functions: 90, lines: 80, statements: 80 },
    'lib/ai/guardrails.ts': { branches: 60, functions: 80, lines: 70, statements: 70 },
    'lib/ai/numbers.ts': { branches: 60, functions: 80, lines: 80, statements: 80 },
    'lib/rag/bm25.ts': { branches: 60, functions: 80, lines: 80, statements: 80 },
    'lib/profile/places.ts': { branches: 60, functions: 80, lines: 80, statements: 80 },
    'lib/schemas/household.ts': { branches: 60, functions: 80, lines: 80, statements: 80 },
    'lib/security/headers.ts': { branches: 80, functions: 80, lines: 80, statements: 80 },
    'lib/security/sanitize.ts': { branches: 60, functions: 80, lines: 80, statements: 80 },
  },
  coverageReporters: ['text', 'lcov'],
}
