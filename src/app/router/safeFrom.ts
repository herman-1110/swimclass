/**
 * Where a signed-out visitor was going, from the router state RequireSignedIn leaves on
 * /login (`{ from: pathname + search }`), if it is a page of this site: it starts with one
 * "/" (auth spec §1.2). Anything else ("//evil.example", "https://…", a missing state)
 * gives null, so the caller goes home instead.
 */
export function safeFrom(state: unknown): string | null {
  if (typeof state !== 'object' || state === null || !('from' in state)) return null
  const { from } = state
  if (typeof from !== 'string') return null
  return /^\/(?![/\\])/.test(from) ? from : null
}
