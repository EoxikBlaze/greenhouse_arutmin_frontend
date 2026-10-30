import { defineConfig } from 'vitest/config'

// Terpisah dari vite.config.ts (proxy API + plugin React tidak dibutuhkan tes unit).
export default defineConfig({
  // url: tanpa origin jsdom tidak menyediakan localStorage.
  test: { environment: 'jsdom', environmentOptions: { jsdom: { url: 'http://localhost/' } }, include: ['src/**/*.test.ts'] },
})
