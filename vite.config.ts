/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [react(), tailwindcss()],
  server: {
    // Supabase Auth redirect URLs allow http://localhost:5173 (TECH_SPEC §9),
    // so fail loudly instead of silently moving to another port.
    port: 5173,
    strictPort: true,
  },
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
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
