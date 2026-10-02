import type { Session } from '@supabase/supabase-js'

import type { AuthSession } from './auth'
import { authError } from './authError'
import type { Backend, Filter } from './backend'
import { AppError } from './rpc'
import { supabase } from './supabase'

// Supabase behind rpc.ts and auth.ts. Used when demo mode is off; the `login` and
// `admin-accounts` Edge Functions it calls are built in prompt 05.

/** supabase-js's PostgrestError is an Error with `code`, `details` and `hint`. */
type Result = { data: unknown; error: Error | null }

/** The part of supabase-js's query builder used here, without its per-table typing. */
type Query = PromiseLike<Result> & {
  eq(column: string, value: unknown): Query
  neq(column: string, value: unknown): Query
  gt(column: string, value: unknown): Query
  gte(column: string, value: unknown): Query
  lt(column: string, value: unknown): Query
  lte(column: string, value: unknown): Query
  in(column: string, values: readonly unknown[]): Query
  is(column: string, value: null): Query
  order(column: string, options: { ascending: boolean }): Query
  limit(count: number): Query
}

type Untyped = {
  from(table: string): {
    select(columns: string): Query
    insert(rows: readonly Record<string, unknown>[]): Query
    update(values: Record<string, unknown>): Query
    delete(): Query
  }
  rpc(fn: string, args: Record<string, unknown>): PromiseLike<Result>
}

const client = supabase as unknown as Untyped

async function unwrap(query: PromiseLike<Result>): Promise<unknown> {
  const { data, error } = await query
  if (error) throw error
  return data
}

function where(query: Query, filter: Filter): Query {
  let q = query
  for (const [c, v] of Object.entries(filter.eq ?? {})) q = v === null ? q.is(c, null) : q.eq(c, v)
  for (const [c, v] of Object.entries(filter.neq ?? {})) q = q.neq(c, v)
  for (const [c, v] of Object.entries(filter.gt ?? {})) q = q.gt(c, v)
  for (const [c, v] of Object.entries(filter.gte ?? {})) q = q.gte(c, v)
  for (const [c, v] of Object.entries(filter.lt ?? {})) q = q.lt(c, v)
  for (const [c, v] of Object.entries(filter.lte ?? {})) q = q.lte(c, v)
  for (const [c, values] of Object.entries(filter.in ?? {})) if (values) q = q.in(c, values)
  for (const c of filter.isNull ?? []) q = q.is(c, null)
  return q
}

function toSession(session: Session | null): AuthSession | null {
  return session ? { userId: session.user.id, email: session.user.email ?? null } : null
}

/** Supabase Auth's errors carry a code (`user_already_exists`, `weak_password` …). */
/** An Edge Function's refusal: `{ "error": "<code>" }` with a 4xx status. */
async function edgeError(error: unknown): Promise<never> {
  const response =
    typeof error === 'object' && error !== null && 'context' in error ? error.context : null
  if (response instanceof Response) {
    const body: unknown = await response.json().catch(() => null)
    const code =
      typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
        ? body.error
        : 'unknown'
    throw new AppError(code, {}, error)
  }
  throw error
}

type Tokens = { access_token: string; refresh_token: string }

function tokensFrom(data: unknown): Tokens | null {
  const holder =
    typeof data === 'object' && data !== null && 'session' in data ? data.session : data
  if (
    typeof holder === 'object' &&
    holder !== null &&
    'access_token' in holder &&
    'refresh_token' in holder &&
    typeof holder.access_token === 'string' &&
    typeof holder.refresh_token === 'string'
  ) {
    return { access_token: holder.access_token, refresh_token: holder.refresh_token }
  }
  return null
}

export function createSupabaseBackend(): Backend {
  async function edge(name: string, body: Record<string, unknown>): Promise<unknown> {
    const result = await supabase.functions.invoke<unknown>(name, { body })
    if (result.error) await edgeError(result.error)
    return result.data
  }

  return {
    rpc: (fn, args) => unwrap(client.rpc(fn, args)),

    async read(source, query) {
      let q = where(client.from(source).select(query.columns?.join(',') || '*'), query)
      for (const o of query.order ?? []) q = q.order(o.column, { ascending: o.ascending !== false })
      if (query.limit !== undefined) q = q.limit(query.limit)
      return ((await unwrap(q)) as unknown[] | null) ?? []
    },

    async insert(table, rows) {
      await unwrap(client.from(table).insert(rows))
    },

    async update(table, values, filter) {
      await unwrap(where(client.from(table).update(values), filter))
    },

    async remove(table, filter) {
      await unwrap(where(client.from(table).delete(), filter))
    },

    edge,

    auth: {
      async getSession() {
        const { data, error } = await supabase.auth.getSession()
        if (error) throw authError(error)
        return toSession(data.session)
      },
      onChange(listener) {
        const { data } = supabase.auth.onAuthStateChange((_event, session) =>
          listener(toSession(session)),
        )
        return () => data.subscription.unsubscribe()
      },
      async logIn(username, password) {
        const tokens = tokensFrom(await edge('login', { username, password }))
        if (!tokens) throw new AppError('invalid_login')
        const { data, error } = await supabase.auth.setSession(tokens)
        if (error) throw authError(error)
        const session = toSession(data.session)
        if (!session) throw new AppError('invalid_login')
        return session
      },
      async signUp(input, redirectTo) {
        const { data, error } = await supabase.auth.signUp({
          email: input.email,
          password: input.password,
          options: {
            data: { username: input.username, display_name: input.displayName, phone: input.phone },
            emailRedirectTo: redirectTo,
          },
        })
        if (error) throw authError(error)
        return { confirmEmail: !data.session }
      },
      async logOut() {
        // This device only (Herman, 2 Oct 2026): other phones and computers stay signed in.
        const { error } = await supabase.auth.signOut({ scope: 'local' })
        if (error) throw authError(error)
      },
      async sendPasswordReset(email, redirectTo) {
        const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
        if (error) throw authError(error)
      },
      async updatePassword(password) {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw authError(error)
      },
    },
  }
}
