import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    // Mengecualikan folder E2E Playwright agar tidak dieksekusi oleh Vitest
    exclude: ['**/node_modules/**', '**/tests/e2e/**'],
  },
})
