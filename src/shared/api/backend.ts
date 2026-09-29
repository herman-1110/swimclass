import type { AuthSession, SignUpInput } from './auth'

// Where data comes from. `rpc.ts` and `auth.ts` are the website's only doors to it; this
// file picks what stands behind them: Supabase, or in demo mode the repo's own
// migrations and seed running in the browser (`./demo`). Both answer with the same
// JSON the Supabase API returns, so nothing above `shared/api` can tell them apart.

/** Which rows: every condition must hold. Keys are column names. */
export type Filter = {
  eq?: Record<string, unknown>
  neq?: Record<string, unknown>
  gt?: Record<string, unknown>
  gte?: Record<string, unknown>
  lt?: Record<string, unknown>
  lte?: Record<string, unknown>
  in?: Record<string, readonly unknown[] | undefined>
  isNull?: readonly string[]
}

export type ReadQuery = Filter & {
  columns?: readonly string[]
  order?: readonly { column: string; ascending?: boolean }[]
  limit?: number
}

export type AuthBackend = {
  getSession(): Promise<AuthSession | null>
  /** Calls the listener after every sign-in and sign-out; returns a function that stops it. */
  onChange(listener: (session: AuthSession | null) => void): () => void
  logIn(username: string, password: string): Promise<AuthSession>
  signUp(input: SignUpInput, redirectTo: string): Promise<{ confirmEmail: boolean }>
  logOut(): Promise<void>
  sendPasswordReset(email: string, redirectTo: string): Promise<void>
  updatePassword(password: string): Promise<void>
}

export type Backend = {
  /** A database function; resolves to what PostgREST returns for it. */
  rpc(fn: string, args: Record<string, unknown>): Promise<unknown>
  read(source: string, query: ReadQuery): Promise<unknown[]>
  insert(table: string, rows: readonly Record<string, unknown>[]): Promise<void>
  update(table: string, values: Record<string, unknown>, filter: Filter): Promise<void>
  remove(table: string, filter: Filter): Promise<void>
  /** An Edge Function (TECH_SPEC §7); resolves to its JSON response. */
  edge(name: string, body: Record<string, unknown>): Promise<unknown>
  auth: AuthBackend
}

let backend: Promise<Backend> | undefined

/**
 * The backend, loaded on first use. The check is on the build-time constant, not on
 * `env.demo`, so a production build (demo off) leaves the demo and PGlite out entirely.
 */
export function getBackend(): Promise<Backend> {
  backend ??=
    import.meta.env.VITE_DEMO === 'true'
      ? import('./demo').then((demo) => demo.createDemoBackend())
      : import('./supabaseBackend').then((supabase) => supabase.createSupabaseBackend())
  return backend
}

/** Demo mode only: puts the seed back as it was and reloads the page. */
export async function resetDemoData(): Promise<void> {
  if (import.meta.env.VITE_DEMO !== 'true') return
  const demo = await import('./demo')
  await demo.resetDemoData()
}
