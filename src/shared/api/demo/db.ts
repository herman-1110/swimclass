import { PGlite } from '@electric-sql/pglite'

import { DEMO_NOW } from '@/shared/config/demo'

import { setDemoSession } from './session'
import shim from './shim.sql?raw'

// The demo database: PGlite (Postgres compiled to WebAssembly) running the repo's own
// migrations and seed, so demo mode has the real business rules and no copies of them.
// Only the demo chunk bundles these files; production builds leave it out.
const migrations = import.meta.glob<string>('/supabase/migrations/*.sql', {
  query: '?raw',
  import: 'default',
  eager: true,
})
const seed = import.meta.glob<string>('/supabase/seed.sql', {
  query: '?raw',
  import: 'default',
  eager: true,
})

const SCRIPTS = [
  shim,
  ...Object.keys(migrations)
    .sort()
    .map((path) => migrations[path]),
  ...Object.values(seed),
]

/** FNV-1a: a short fingerprint of the scripts, so a changed migration starts a fresh database. */
function fingerprint(text: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

const PREFIX = 'swimclass-demo-'
const NAME = PREFIX + fingerprint(SCRIPTS.join('\n'))

/** In a browser the demo keeps its changes across reloads (IndexedDB); in tests it starts fresh. */
function canPersist(): boolean {
  try {
    return typeof window !== 'undefined' && typeof indexedDB !== 'undefined'
  } catch {
    return false
  }
}

let opened: Promise<PGlite> | undefined

/** The demo database, created and loaded on first use. */
export function demoDb(): Promise<PGlite> {
  opened ??= open()
  return opened
}

async function open(): Promise<PGlite> {
  const persist = canPersist()
  const db = await PGlite.create(persist ? `idb://${NAME}` : undefined)
  const { rows } = await db.query<{ ready: boolean }>(
    `select to_regclass('public.profiles') is not null as ready`,
  )
  if (!rows[0]?.ready) {
    // All or nothing, so a failed load never leaves half a database behind.
    await db.transaction(async (tx) => {
      for (const script of SCRIPTS) await tx.exec(script)
    })
  }
  // The clock the seed's expected results assume; app_now() reads it. The Supabase API
  // runs in UTC, so timestamps come out as "…+00:00" here too.
  await db.query(`select set_config('app.now', $1, false)`, [DEMO_NOW])
  await db.exec(`set timezone = 'UTC'`)
  if (persist) void forgetOtherVersions()
  return db
}

async function demoDatabaseNames(): Promise<string[]> {
  const all = await indexedDB.databases()
  return all.map((d) => d.name ?? '').filter((name) => name.includes(PREFIX))
}

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(name)
    request.onsuccess = () => resolve()
    request.onerror = () => resolve()
    request.onblocked = () => resolve()
  })
}

/** Deletes demo databases left by older migrations or seeds. */
async function forgetOtherVersions(): Promise<void> {
  try {
    const stale = (await demoDatabaseNames()).filter((name) => !name.includes(NAME))
    await Promise.all(stale.map(deleteDatabase))
  } catch {
    // indexedDB.databases() is missing in some browsers: leave them.
  }
}

/** Puts the seed back as it was: forgets every change, signs out and reloads the page. */
export async function resetDemoData(): Promise<void> {
  const db = await opened?.catch(() => undefined)
  await db?.close()
  if (canPersist()) {
    try {
      await Promise.all((await demoDatabaseNames()).map(deleteDatabase))
    } catch {
      await deleteDatabase(`/pglite/${NAME}`)
    }
  }
  setDemoSession(null)
  window.location.reload()
}
