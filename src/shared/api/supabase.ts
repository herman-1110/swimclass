import { createClient } from '@supabase/supabase-js'

import type { Database } from './database.types'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!url || !publishableKey) {
  throw new Error(
    'VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are not set. ' +
      'Copy .env.example to .env.local and fill both in from the Supabase dashboard ' +
      '(Project Settings -> API Keys), then restart `npm run dev`.',
  )
}

// Everything in a VITE_ variable is shipped to every browser. Only the publishable key
// is safe there; the secret key stays in Edge Function secrets (CLAUDE.md rule 7).
if (!publishableKey.startsWith('sb_publishable_')) {
  throw new Error(
    'VITE_SUPABASE_PUBLISHABLE_KEY must be the publishable key (it starts with ' +
      '"sb_publishable_"). Never put the secret key in a VITE_ variable.',
  )
}

export const supabase = createClient<Database>(url, publishableKey)
