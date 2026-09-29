/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  // One path alias: @/ means src/ (ARCHITECTURE §8).
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    // Supabase Auth redirect URLs allow http://localhost:5173 (TECH_SPEC §9),
    // so fail loudly instead of silently moving to another port.
    port: 5173,
    strictPort: true,
  },
  test: {
    include: ['src/**/*.test.{ts,tsx}', 'tests/**/*.test.ts'],
    // The database tests share one dev database: one file at a time, so files never
    // wait for each other's locks. A test gets 30 s (queries go to Singapore and back).
    fileParallelism: false,
    testTimeout: 30_000,
    env: {
      // Run tests in a time zone far from Malaysia (with daylight saving) so any code
      // that accidentally uses the device's time zone fails (CLAUDE.md rule 2).
      TZ: 'America/Los_Angeles',
      // DATABASE_URL for tests/db from .env.local. It has no VITE_ prefix, so it never
      // reaches the browser bundle.
      ...loadEnv(mode, process.cwd(), 'DATABASE_'),
    },
  },
}))
