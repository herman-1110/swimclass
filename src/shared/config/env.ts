// The browser's settings, from VITE_ variables (.env.local on your machine, the build
// environment in production). Everything in a VITE_ variable is shipped to every browser,
// so only the publishable key belongs here, never the secret key (CLAUDE.md rule 7).

declare global {
  interface ImportMetaEnv {
    /** Supabase project URL, e.g. https://abcd.supabase.co */
    readonly VITE_SUPABASE_URL?: string
    /** Supabase publishable key (sb_publishable_...). Never the secret key. */
    readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
    /**
     * Cloudflare Turnstile's site key (TECH_SPEC §9). When set, Log in, Sign up and Forgot
     * password show the CAPTCHA and send its token. Public by design, like the publishable key.
     */
    readonly VITE_TURNSTILE_SITE_KEY?: string
    /**
     * 'true' in demo mode. vite.config.ts always sets it: from VITE_DEMO in .env.local
     * when that is set, otherwise on for `npm run dev` and tests, off for production builds.
     */
    readonly VITE_DEMO: string
  }
}

export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabasePublishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  /** Turnstile's site key, or undefined: no CAPTCHA (demo mode, dev). Read when asked, so tests can set it. */
  get turnstileSiteKey(): string | undefined {
    return import.meta.env.VITE_TURNSTILE_SITE_KEY || undefined
  },
  /**
   * Demo mode: the site runs the repo's own migrations and seed in the browser
   * (`shared/api/demo`) instead of talking to Supabase, with the clock stopped at
   * DEMO_NOW (`shared/config/demo`). A property the minifier can't fold: code that only
   * demo builds need tests `import.meta.env.VITE_DEMO === 'true'` (a constant) instead, or
   * first, so a production build leaves it out.
   */
  demo: import.meta.env.VITE_DEMO === 'true',
}
