// The browser's settings, from VITE_ variables (.env.local on your machine, the build
// environment in production). Everything in a VITE_ variable is shipped to every browser,
// so only the publishable key belongs here, never the secret key (CLAUDE.md rule 7).

declare global {
  interface ImportMetaEnv {
    /** Supabase project URL, e.g. https://abcd.supabase.co */
    readonly VITE_SUPABASE_URL?: string
    /** Supabase publishable key (sb_publishable_...). Never the secret key. */
    readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string
  }
}

export const env = {
  supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
  supabasePublishableKey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
}
