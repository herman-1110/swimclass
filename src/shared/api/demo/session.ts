import type { AuthSession } from '../auth'

// Who is signed in to the demo, kept in this browser (like Supabase keeps its session).

const KEY = 'swimclass.demo.session'
const listeners = new Set<(session: AuthSession | null) => void>()

function isSession(value: unknown): value is AuthSession {
  if (typeof value !== 'object' || value === null) return false
  const v = value as Record<string, unknown>
  return typeof v.userId === 'string' && (typeof v.email === 'string' || v.email === null)
}

function load(): AuthSession | null {
  try {
    const raw = localStorage.getItem(KEY)
    const value: unknown = raw ? JSON.parse(raw) : null
    return isSession(value) ? value : null
  } catch {
    return null
  }
}

let current: AuthSession | null = load()

export function demoSession(): AuthSession | null {
  return current
}

export function setDemoSession(session: AuthSession | null): void {
  current = session
  try {
    if (session) localStorage.setItem(KEY, JSON.stringify(session))
    else localStorage.removeItem(KEY)
  } catch {
    // Private windows may refuse storage: the session then lasts until a reload.
  }
  for (const listener of listeners) listener(session)
}

export function onDemoSessionChange(listener: (session: AuthSession | null) => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
