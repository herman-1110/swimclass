/// <reference types="vitest/config" />
import { fileURLToPath } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv, type Plugin } from 'vite'

// The app's own modules (src/**/*.ts, *.tsx) do nothing when imported, apart from main.tsx
// (it starts the app; the CSS files it imports are not .ts). Saying so lets the build drop
// what a chunk doesn't use: the coach's week grid, day view and balances no longer travel
// in the chunks every customer downloads because a front door (index.ts) re-exports them.
const OWN_MODULE = /\/src\/(?!main\.tsx$)[^?]*\.tsx?$/

/** A module id with forward slashes (Windows ids use backslashes). */
const toPosix = (id: string) => id.replaceAll('\\', '/')

/**
 * Production builds load the Supabase backend with import() once the app asks for the
 * session (src/shared/api/backend.ts), so the browser would only find it after the main
 * chunks have run. A modulepreload link fetches it alongside them (about 0.6 s sooner on a
 * slow 4G connection). Demo builds have no such chunk and are unchanged.
 */
function preloadSupabaseBackend(): Plugin {
  return {
    name: 'preload-supabase-backend',
    apply: 'build',
    transformIndexHtml: {
      order: 'post',
      handler(_html, context) {
        const chunk = Object.values(context.bundle ?? {}).find(
          (output) =>
            output.type === 'chunk' &&
            toPosix(output.facadeModuleId ?? '').endsWith('/src/shared/api/supabaseBackend.ts'),
        )
        if (!chunk) return []
        return [
          {
            tag: 'link',
            attrs: { rel: 'modulepreload', crossorigin: true, href: `/${chunk.fileName}` },
            injectTo: 'head',
          },
        ]
      },
    },
  }
}

/**
 * dist/_headers for Cloudflare's static assets: the security headers of every page. The
 * policy allows only this site's own files, plus the Supabase project in connect-src.
 * Demo builds also allow WebAssembly (PGlite). Nothing inline: no inline script or <style>
 * element anywhere (React's style props are allowed, they don't go through the parser).
 */
function securityHeaders(supabaseUrl: string | undefined, demo: boolean): Plugin {
  const connect = ["'self'", supabaseUrl ? new URL(supabaseUrl).origin : null].filter(Boolean)
  const policy = [
    "default-src 'self'",
    `script-src 'self'${demo ? " 'wasm-unsafe-eval'" : ''}`,
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src ${connect.join(' ')}`,
    "object-src 'none'",
    "base-uri 'none'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ')
  const headers = [
    '/*',
    `  Content-Security-Policy: ${policy}`,
    '  Strict-Transport-Security: max-age=31536000',
    '  X-Content-Type-Options: nosniff',
    '  X-Frame-Options: DENY',
    '  Referrer-Policy: strict-origin-when-cross-origin',
    '  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()',
    '  Cross-Origin-Opener-Policy: same-origin',
    '',
  ].join('\n')
  return {
    name: 'security-headers',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: '_headers', source: headers })
    },
  }
}

/**
 * Only the publishable key may reach the browser (CLAUDE.md rule 7): a build stops if a
 * VITE_ value is a secret key, a service-role JWT or a database address.
 */
function jwtRole(value: string): string | undefined {
  const payload = /^eyJ[\w-]*\.([\w-]+)\./.exec(value)?.[1]
  if (!payload) return undefined
  try {
    return (JSON.parse(Buffer.from(payload, 'base64url').toString()) as { role?: string }).role
  } catch {
    return undefined // not a JWT after all
  }
}

function refuseSecrets(env: Record<string, string>) {
  for (const [name, value] of Object.entries(env)) {
    const role = jwtRole(value)
    if (
      value.startsWith('sb_secret_') ||
      role === 'service_role' ||
      /postgres(ql)?:\/\//.test(value)
    ) {
      throw new Error(`${name} holds a secret; only the publishable key may go in VITE_ values.`)
    }
  }
}

// https://vite.dev/config/
export default defineConfig(({ command, mode }) => {
  // Demo mode (src/shared/api/demo): the site runs the repo's migrations and seed in the
  // browser instead of talking to Supabase. On for `npm run dev` and the tests, off for
  // production builds, unless VITE_DEMO=true or false in .env.local says otherwise.
  // Written into the code as a constant, so a production build leaves the demo out.
  // Production values go in .env.production.local, which wins over .env.local's dev ones.
  const browserEnv = loadEnv(mode, process.cwd(), 'VITE_')
  const { VITE_DEMO, VITE_SUPABASE_URL } = browserEnv
  const demo = VITE_DEMO ? VITE_DEMO === 'true' : mode !== 'production'
  if (command === 'build') refuseSecrets(browserEnv)

  return {
    plugins: [
      react(),
      tailwindcss(),
      preloadSupabaseBackend(),
      securityHeaders(VITE_SUPABASE_URL, demo),
    ],
    define: { 'import.meta.env.VITE_DEMO': JSON.stringify(String(demo)) },
    build: {
      rolldownOptions: {
        treeshake: {
          moduleSideEffects: (id: string) => !OWN_MODULE.test(toPosix(id)),
        },
      },
    },
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
