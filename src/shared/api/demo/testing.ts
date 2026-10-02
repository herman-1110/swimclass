// Test helpers for the demo database. Only *.test.tsx files import this module, so it never
// enters a bundle.
import { demoDb } from './db'

type DemoDb = Awaited<ReturnType<typeof demoDb>>

/**
 * Holds the demo database in an open transaction from this very moment, so the calls made
 * after it wait (as on a slow connection) until the returned function is called.
 */
export function holdDemoDatabaseNow(db: DemoDb): () => Promise<void> {
  let release = () => {}
  const released = new Promise<void>((resolve) => {
    release = resolve
  })
  const held = db.transaction(async () => {
    await released
  })
  return async () => {
    release()
    await held
  }
}

/**
 * Holds the demo database in an open transaction once it has started (the calls already
 * queued go first), so the next call waits until the returned function is called.
 */
export async function holdDemoDatabase(): Promise<() => Promise<void>> {
  const db = await demoDb()
  let started = () => {}
  const holding = new Promise<void>((resolve) => {
    started = resolve
  })
  let release = () => {}
  const released = new Promise<void>((resolve) => {
    release = resolve
  })
  const held = db.transaction(async () => {
    started()
    await released
  })
  await holding
  return async () => {
    release()
    await held
  }
}
