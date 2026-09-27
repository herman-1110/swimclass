/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Supabase Auth redirect URLs allow http://localhost:5173 (TECH_SPEC §9),
    // so fail loudly instead of silently moving to another port.
    port: 5173,
    strictPort: true,
  },
  test: {
    include: ['tests/**/*.test.{ts,tsx}'],
    // Run tests in a time zone far from Malaysia (with daylight saving) so any code
    // that accidentally uses the device's time zone fails (CLAUDE.md rule 2).
    env: { TZ: 'America/Los_Angeles' },
  },
})
