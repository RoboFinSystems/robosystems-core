import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Same mock surface the consuming apps provide (src/__mocks__ there): the
// tests were written against these, so core runs them against identical mocks.
const mocksDir = path.resolve(__dirname, 'test/__mocks__')

// `*.sdk.test.*` files run against the REAL `@robosystems/client` with
// `fetch` stubbed at the network edge. The mocks above reject on HTTP
// errors; the real SDK (throwOnError: false) resolves `{ data: undefined,
// error, response }` — the only way to test how core handles a refusal.
const SDK_TEST_GLOB = '**/__tests__/**/*.sdk.test.{ts,tsx}'

const shared = {
  globals: true,
  environment: 'jsdom',
  setupFiles: './vitest.setup.ts',
  silent: true,
  testTimeout: 10000,
  hookTimeout: 10000,
  teardownTimeout: 10000,
} as const

export default defineConfig({
  test: {
    reporters: 'default',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
    projects: [
      {
        plugins: [react()],
        resolve: {
          alias: {
            'react-markdown': path.resolve(mocksDir, 'react-markdown.js'),
            '@robosystems/client/clients': path.resolve(
              mocksDir,
              '@robosystems/client-clients.js'
            ),
            '@robosystems/client/extensions': path.resolve(
              mocksDir,
              '@robosystems/client-extensions.js'
            ),
            '@robosystems/client/sdk': path.resolve(
              mocksDir,
              '@robosystems/client-sdk.js'
            ),
            '@robosystems/client': path.resolve(
              mocksDir,
              '@robosystems/client.js'
            ),
          },
        },
        test: {
          ...shared,
          name: 'unit',
          include: ['**/__tests__/**/*.test.{ts,tsx,js,jsx}'],
          exclude: ['**/node_modules/**', '**/dist/**', SDK_TEST_GLOB],
        },
      },
      {
        plugins: [react()],
        resolve: {
          alias: {
            'react-markdown': path.resolve(mocksDir, 'react-markdown.js'),
          },
        },
        test: {
          ...shared,
          name: 'sdk',
          include: [SDK_TEST_GLOB],
          exclude: ['**/node_modules/**', '**/dist/**'],
        },
      },
    ],
  },
})
