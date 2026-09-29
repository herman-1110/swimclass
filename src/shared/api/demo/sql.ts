import type { Filter, ReadQuery } from '../backend'

// SQL for the demo backend, written the way PostgREST answers the same request: function
// calls with named arguments from a JSON body (json_to_record), results built as JSON by
// Postgres itself (json_agg / to_json), so dates, timestamps and numbers come out exactly
// as the Supabase API sends them.

export type Queryable = {
  query<T>(sql: string, params?: unknown[]): Promise<{ rows: T[] }>
}

/** Why the demo couldn't run a request (a bug in the caller, like PostgREST's 4xx errors). */
export class DemoRequestError extends Error {
  readonly code = 'PGRST'
}

export const ident = (name: string) => `"${name.replaceAll('"', '""')}"`

type Argument = { name: string; type: string }
/** set: a table or setof (JSON array) · row: one composite (object) · value: a scalar · void */
export type FunctionShape = { args: Argument[]; returns: 'set' | 'row' | 'value' | 'void' }

let functions: Promise<Map<string, FunctionShape[]>> | undefined

/** Every public function's input arguments and result shape, read once from pg_proc. */
export function functionShapes(db: Queryable): Promise<Map<string, FunctionShape[]>> {
  functions ??= loadFunctions(db)
  return functions
}

async function loadFunctions(db: Queryable): Promise<Map<string, FunctionShape[]>> {
  const { rows } = await db.query<{
    name: string
    retset: boolean
    composite: boolean
    is_void: boolean
    arg_names: string[]
    arg_modes: string[]
    in_types: string[]
  }>(`
    select p.proname as name,
           p.proretset as retset,
           t.typtype = 'c' as composite,
           p.prorettype = 'pg_catalog.void'::regtype as is_void,
           coalesce(p.proargnames, '{}'::text[]) as arg_names,
           coalesce(p.proargmodes::text[], '{}'::text[]) as arg_modes,
           array(select format_type(x, null) from unnest(p.proargtypes::oid[]) as x) as in_types
    from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    join pg_catalog.pg_type t on t.oid = p.prorettype
    where n.nspname = 'public' and p.prokind = 'f'`)
  const byName = new Map<string, FunctionShape[]>()
  for (const r of rows) {
    const inNames = r.arg_modes.length
      ? r.arg_names.filter((_, i) => ['i', 'b', 'v'].includes(r.arg_modes[i]))
      : r.arg_names.slice(0, r.in_types.length)
    const shape: FunctionShape = {
      args: r.in_types.map((type, i) => ({ name: inNames[i] ?? `$${i + 1}`, type })),
      returns: r.is_void ? 'void' : r.retset ? 'set' : r.composite ? 'row' : 'value',
    }
    byName.set(r.name, [...(byName.get(r.name) ?? []), shape])
  }
  return byName
}

/** The overload that takes every given argument by name (PostgREST's rule too). */
export function pickFunction(
  all: Map<string, FunctionShape[]>,
  name: string,
  given: readonly string[],
): FunctionShape {
  const shape = all.get(name)?.find((s) => given.every((g) => s.args.some((a) => a.name === g)))
  if (!shape) {
    throw new DemoRequestError(
      `Could not find the function public.${name}(${given.join(', ')}) in the demo database.`,
    )
  }
  return shape
}

/** SQL calling a function with the given arguments as $1 (a JSON object); returns column `v`. */
export function callSql(name: string, shape: FunctionShape, given: readonly string[]): string {
  const used = shape.args.filter((a) => given.includes(a.name))
  const call = `public.${ident(name)}(${used.map((a) => `${ident(a.name)} => r.${ident(a.name)}`).join(', ')})`
  const record = used.length
    ? `json_to_record($1::json) as r(${used.map((a) => `${ident(a.name)} ${a.type}`).join(', ')})`
    : ''
  const from = (source: string) => (record ? `${record} cross join lateral ${source}` : source)
  switch (shape.returns) {
    case 'set':
      return `select coalesce(json_agg(x), '[]'::json) as v from ${from(`${call} as x`)}`
    case 'row':
      return `select to_json(x) as v from ${from(`${call} as x`)}`
    case 'value':
      return `select to_json(${call}) as v${record ? ` from ${record}` : ''}`
    case 'void':
      return `select 1 as v from (select ${call}${record ? ` from ${record}` : ''}) as done`
  }
}

type Columns = Map<string, string>
const columnCache = new Map<string, Promise<Columns>>()

/** A table's or view's columns and their types. */
export function columnsOf(db: Queryable, source: string): Promise<Columns> {
  let cached = columnCache.get(source)
  if (!cached) {
    cached = db
      .query<{ name: string; type: string }>(
        `select a.attname as name, format_type(a.atttypid, a.atttypmod) as type
         from pg_catalog.pg_attribute a
         where a.attrelid = to_regclass(format('public.%I', $1::text))
           and a.attnum > 0 and not a.attisdropped
         order by a.attnum`,
        [source],
      )
      .then(({ rows }) => {
        if (!rows.length) throw new DemoRequestError(`No table or view public.${source}.`)
        return new Map(rows.map((r) => [r.name, r.type]))
      })
    columnCache.set(source, cached)
  }
  return cached
}

function column(columns: Columns, name: string): string {
  if (!columns.has(name)) throw new DemoRequestError(`No column "${name}".`)
  return name
}

const COMPARISONS = [
  ['eq', '='],
  ['neq', '<>'],
  ['gt', '>'],
  ['gte', '>='],
  ['lt', '<'],
  ['lte', '<='],
] as const

/** The WHERE clause for a filter; values go into `params`. */
export function whereSql(
  filter: Filter,
  columns: Columns,
  params: unknown[],
  qualifier = '',
): string {
  const parts: string[] = []
  const add = (value: unknown) => {
    params.push(typeof value === 'object' && value !== null ? JSON.stringify(value) : String(value))
    return `$${params.length}`
  }
  const ref = (name: string) => `${qualifier}${ident(column(columns, name))}`
  for (const [key, op] of COMPARISONS) {
    for (const [name, value] of Object.entries(filter[key] ?? {})) {
      if (value === null || value === undefined) {
        parts.push(`${ref(name)} ${key === 'neq' ? 'is not null' : 'is null'}`)
      } else {
        parts.push(`${ref(name)} ${op} ${add(value)}::${columns.get(name) ?? 'text'}`)
      }
    }
  }
  for (const [name, values] of Object.entries(filter.in ?? {})) {
    if (values === undefined) continue
    const type = columns.get(column(columns, name)) ?? 'text'
    parts.push(
      `${ref(name)} = any(array(select jsonb_array_elements_text(${add(values)}::jsonb))::${type}[])`,
    )
  }
  for (const name of filter.isNull ?? []) parts.push(`${ref(name)} is null`)
  return parts.length ? ` where ${parts.join(' and ')}` : ''
}

/** Update and delete must say which rows (Supabase refuses a bare DELETE too). */
export function hasCondition(filter: Filter): boolean {
  return (
    COMPARISONS.some(([key]) => Object.keys(filter[key] ?? {}).length > 0) ||
    Object.keys(filter.in ?? {}).length > 0 ||
    (filter.isNull ?? []).length > 0
  )
}

export function readSql(
  source: string,
  query: ReadQuery,
  columns: Columns,
  params: unknown[],
): string {
  const select = query.columns?.length
    ? query.columns.map((c) => ident(column(columns, c))).join(', ')
    : '*'
  const order = query.order?.length
    ? ` order by ${query.order
        .map((o) => `${ident(column(columns, o.column))} ${o.ascending === false ? 'desc' : 'asc'}`)
        .join(', ')}`
    : ''
  const limit = query.limit === undefined ? '' : ` limit ${Math.max(0, Math.floor(query.limit))}`
  return `select coalesce(json_agg(x), '[]'::json) as v from (select ${select} from public.${ident(source)}${whereSql(query, columns, params)}${order}${limit}) as x`
}

/** Rows as $1 (a JSON array); columns are every key any row has, like PostgREST. */
export function insertSql(
  table: string,
  rows: readonly Record<string, unknown>[],
  columns: Columns,
): string {
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))].map((k) =>
    ident(column(columns, k)),
  )
  return `insert into public.${ident(table)} (${keys.join(', ')})
          select ${keys.join(', ')} from json_populate_recordset(null::public.${ident(table)}, $1::json)`
}

/** New values as $1 (a JSON object); the filter's values follow. */
export function updateSql(
  table: string,
  values: Record<string, unknown>,
  filter: Filter,
  columns: Columns,
  params: unknown[],
): string {
  const sets = Object.keys(values).map((k) => `${ident(column(columns, k))} = r.${ident(k)}`)
  return `update public.${ident(table)} as target set ${sets.join(', ')}
          from json_populate_record(null::public.${ident(table)}, $1::json) as r${whereSql(filter, columns, params, 'target.')}`
}

export function deleteSql(
  table: string,
  filter: Filter,
  columns: Columns,
  params: unknown[],
): string {
  return `delete from public.${ident(table)} as target${whereSql(filter, columns, params, 'target.')}`
}
