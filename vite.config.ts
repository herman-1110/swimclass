/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Demo mode (src/shared/api/demo): the site runs the repo's migrations and seed in the
  // browser instead of talking to Supabase. On for `npm run dev` and the tests, off for
  // production builds, unless VITE_DEMO=true or false in .env.local says otherwise.
  // Written into the code as a constant, so a production build leaves the demo out.
  const { VITE_DEMO } = loadEnv(mode, process.cwd(), 'VITE_')
  const demo = VITE_DEMO ? VITE_DEMO === 'true' : mode !== 'production'

  return {
    plugins: [react(), tailwindcss()],
    define: { 'import.meta.env.VITE_DEMO': JSON.stringify(String(demo)) },
    // PGlite loads its own WebAssembly and data files, so Vite must not pre-bundle it.
    optimizeDeps: { exclude: ['@electric-sql/pglite'] },
    // One path alias: @/ means src/ (ARCHITECTURE §8).
    resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
    server: {
      // Supabase Auth redirect URLs allow http://localhost:5173 (TECH_SPEC §9),
      // so fail loudly instead of silently moving to another port.
      port: 5173,
      strictPort: true,
    },
    test: {
      env: {
        // Run tests in a time zone far from Malaysia (with daylight saving) so any code
        // that accidentally uses the device's time zone fails (CLAUDE.md rule 2).
        TZ: 'America/Los_Angeles',
        // DATABASE_URL for tests/db from .env.local. It has no VITE_ prefix, so it never
        // reaches the browser bundle.
        ...loadEnv(mode, process.cwd(), 'DATABASE_'),
      },
      // Two projects (ARCHITECTURE §6): `npm run test` runs unit, `npm run test:db` runs db.
      projects: [
        {
          extends: true,
          test: {
            name: 'unit',
            // Unit tests sit next to their code.
            include: ['src/**/*.test.{ts,tsx}'],
            environment: 'jsdom',
          },
        },
        {
          extends: true,
          test: {
            name: 'db',
            include: ['tests/db/**/*.test.ts'],
            environment: 'node',
            // The database tests share one dev database: one file at a time, so files
            // never wait for each other's locks. A test gets 30 s (queries go to
            // Singapore and back).
            fileParallelism: false,
            testTimeout: 30_000,
          },
        },
      ],
    },
  }
})
