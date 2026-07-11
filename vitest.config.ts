import react from '@vitejs/plugin-react'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Same mock surface the consuming apps provide (src/__mocks__ there): the
// tests were written against these, so core runs them against identical mocks.
const mocksDir = path.resolve(__dirname, 'test/__mocks__')

export default defineConfig({
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
      '@robosystems/client': path.resolve(mocksDir, '@robosystems/client.js'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './vitest.setup.ts',
    include: ['**/__tests__/**/*.test.{ts,tsx,js,jsx}'],
    silent: true,
    reporters: 'default',
    threads: false,
    testTimeout: 10000,
    hookTimeout: 10000,
    teardownTimeout: 10000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
    },
  },
})
