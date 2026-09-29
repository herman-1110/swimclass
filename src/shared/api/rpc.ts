import { getBackend } from './backend'
import type { Database } from './database.types'

// The website's one door to the database (ARCHITECTURE §3.6): database functions,
// direct reads and writes where RLS allows them (TECH_SPEC §6), and Edge Functions.
// Every failure comes out as an AppError. Entity and feature `api/` folders call these;
// components never do.

type Schema = Database['public']
type Functions = Schema['Functions']
type Tables = Schema['Tables']
type Views = Schema['Views']

/** A database function (TECH_SPEC §5). */
export type FunctionName = keyof Functions
export type FunctionArgs<F extends FunctionName> = Functions[F]['Args']
export type FunctionResult<F extends FunctionName> = Functions[F]['Returns']
/** A table the website may read or change directly, as RLS allows (TECH_SPEC §6). */
export type TableName = keyof Tables
/** A table or view the website may read. */
export type SourceName = TableName | keyof Views
export type Row<S extends SourceName> = S extends TableName
  ? Tables[S]['Row']
  : S extends keyof Views
    ? Views[S]['Row']
    : never
export type Insert<T extends TableName> = Tables[T]['Insert']
export type Update<T extends TableName> = Tables[T]['Update']

/** Which rows: every condition must hold. */
export type RowFilter<R> = {
  eq?: Partial<R>
  neq?: Partial<R>
  gt?: Partial<R>
  gte?: Partial<R>
  lt?: Partial<R>
  lte?: Partial<R>
  in?: { [K in keyof R]?: readonly R[K][] }
  isNull?: readonly (keyof R & string)[]
}

export type ReadOptions<R> = RowFilter<R> & {
  /** Columns to return (all by default). Needed where a table grants only some columns. */
  columns?: readonly (keyof R & string)[]
  order?: readonly { column: keyof R & string; ascending?: boolean }[]
  limit?: number
}

/**
 * Every failure a screen can meet, as a reason code and its detail: the database's own
 * codes (`overlap_mine`, `credit_exceeded` …, TECH_SPEC §5), the Edge Functions'
 * (`invalid_login`, `too_many_attempts`), Supabase Auth's (`user_already_exists` …),
 * `network` when the server can't be reached, and `unknown` for anything else.
 * `shared/config/messages.ts` turns a code into words; screens never show raw errors.
 */
export class AppError extends Error {
  readonly code: string
  readonly detail: Readonly<Record<string, unknown>>

  constructor(code: string, detail: Record<string, unknown> = {}, cause?: unknown) {
    super(code, { cause })
    this.name = 'AppError'
    this.code = code
    this.detail = detail
  }
}

// The migrations refuse with `raise exception '<reason>' using detail = '<json>'`
// (SQLSTATE P0001); the reason is always lower_snake_case.
const REASON = /^[a-z][a-z0-9_]*$/
const NETWORK = /failed to fetch|networkerror|load failed|fetch failed|network request failed/i

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseDetail(text: unknown): Record<string, unknown> {
  if (typeof text !== 'string' || text === '') return {}
  try {
    const parsed: unknown = JSON.parse(text)
    return isRecord(parsed) && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

/** Turns any failure into an AppError (see there for the codes). */
export function toAppError(error: unknown): AppError {
  if (error instanceof AppError) return error
  if (isRecord(error)) {
    const message = typeof error.message === 'string' ? error.message : ''
    const name = typeof error.name === 'string' ? error.name : ''
    if (
      error instanceof TypeError ||
      NETWORK.test(message) ||
      name === 'FunctionsFetchError' ||
      name === 'AuthRetryableFetchError'
    ) {
      return new AppError('network', {}, error)
    }
    // PostgREST reports the detail as `details`; PGlite (demo mode) as `detail`.
    if (error.code === 'P0001' && REASON.test(message)) {
      return new AppError(message, parseDetail(error.details ?? error.detail), error)
    }
  }
  if (import.meta.env.DEV && import.meta.env.MODE !== 'test') console.error(error)
  return new AppError('unknown', {}, error)
}

async function run<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call()
  } catch (error) {
    throw toAppError(error)
  }
}

type ArgsParam<F extends FunctionName> = [FunctionArgs<F>] extends [never]
  ? []
  : [args: FunctionArgs<F>]

/** Calls a database function as the signed-in account (or signed out: anon). */
export function rpc<F extends FunctionName>(
  fn: F,
  ...args: ArgsParam<F>
): Promise<FunctionResult<F>> {
  const body = (args[0] ?? {}) as Record<string, unknown>
  return run(async () => (await (await getBackend()).rpc(fn, body)) as FunctionResult<F>)
}

/** Reads rows of a table or view the account may see (RLS decides which). */
export function readRows<S extends SourceName>(
  source: S,
  options: ReadOptions<Row<S>> = {},
): Promise<Row<S>[]> {
  return run(async () => (await (await getBackend()).read(source, options)) as Row<S>[])
}

/** Adds rows to a table where RLS allows it directly. */
export function insertRows<T extends TableName>(
  table: T,
  rows: readonly Insert<T>[],
): Promise<void> {
  return run(async () => (await getBackend()).insert(table, rows))
}

/** Changes the rows that match `filter` (at least one condition is required). */
export function updateRows<T extends TableName>(
  table: T,
  values: Update<T>,
  filter: RowFilter<Row<T>>,
): Promise<void> {
  return run(async () => (await getBackend()).update(table, values, filter))
}

/** Deletes the rows that match `filter` (at least one condition is required). */
export function deleteRows<T extends TableName>(
  table: T,
  filter: RowFilter<Row<T>>,
): Promise<void> {
  return run(async () => (await getBackend()).remove(table, filter))
}

/** The Edge Functions the website calls (TECH_SPEC §7). */
export type EdgeFunctionName = 'login' | 'admin-accounts'

/** Calls an Edge Function with a JSON body; resolves to its JSON response. */
export function callEdge<T>(name: EdgeFunctionName, body: Record<string, unknown>): Promise<T> {
  return run(async () => (await (await getBackend()).edge(name, body)) as T)
}
