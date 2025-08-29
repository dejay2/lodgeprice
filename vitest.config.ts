/// <reference types="vitest" />
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // For tests, also load .env.test.local if it exists
  const env = mode === 'test' 
    ? { ...loadEnv(mode, process.cwd(), ''), ...loadEnv('test', process.cwd(), '') }
    : loadEnv(mode, process.cwd(), '')
  
  return {
  plugins: [react()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    globals: true,
    environment: 'node', // Default to node, override in test files as needed
    setupFiles: ['./tests/setup.ts', './src/test/setup.ts'],
    environmentMatchGlobs: [
      // Use jsdom for component tests
      ['**/*.test.tsx', 'jsdom'],
      ['**/property-workflow.test.*', 'jsdom'],
      // Use node for integration and performance tests
      ['**/integration/**/*.test.ts', 'node'],
      ['**/performance/**/*.test.ts', 'node']
    ],
    env: {
      ...env
    },
    // Memory optimization settings
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
        isolate: true,
      }
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'dist/',
        '*.config.*',
        'src/test-setup.ts',
        'tests/setup.ts',
        '**/*.d.ts',
        '**/*.test.*',
        '**/*.spec.*',
        '**/mocks/**',
        '**/fixtures/**'
      ],
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80
      }
    },
    include: [
      'tests/unit/**/*.test.ts', 
      'tests/unit/**/*.test.tsx', 
      'tests/integration/**/*.test.ts', 
      'tests/integration/**/*.test.tsx',
      'tests/performance/**/*.test.ts',
      'tests/performance/**/*.test.tsx'
    ],
    exclude: ['node_modules', 'dist', '.idea', '.git', '.cache', 'tests/e2e', 'playwright-report', 'test-results'],
  },
}
})