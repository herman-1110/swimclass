// The browser-facing Edge Functions' door (TECH_SPEC §7): CORS for the site only, JSON in
// and out, and refusals as { "error": "<code>" } with a 4xx status, which the website's
// supabaseBackend.ts reads into an AppError. No business rules here (ARCHITECTURE §4.5).

/** What supabase-js sends with functions.invoke. */
const ALLOWED_HEADERS = 'authorization, x-client-info, apikey, content-type'

/**
 * The website's origin, from the SITE_URL secret: the production site, or
 * http://localhost:5173 on the dev project. The only page allowed to call these functions.
 */
export function siteOrigin(): string {
  const siteUrl = Deno.env.get('SITE_URL')
  if (!siteUrl) throw new Error('The SITE_URL secret is not set.')
  return new URL(siteUrl).origin
}

function corsHeaders(): Record<string, string> {
  // Without SITE_URL every request fails (serveFromSite logs why); the reply still goes out.
  const origin = Deno.env.get('SITE_URL') ? siteOrigin() : 'null'
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Headers': ALLOWED_HEADERS,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  }
}

export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(), 'Content-Type': 'application/json' },
  })
}

/** A refusal the website turns into words (src/shared/config/messages.ts). */
export function refuse(code: string, status: number): Response {
  return json({ error: code }, status)
}

export type Body = Record<string, unknown>

/** A string field of the body, trimmed; '' when missing or not a string. */
export function text(body: Body, field: string): string {
  const value = body[field]
  return typeof value === 'string' ? value.trim() : ''
}

/**
 * Serves a function the website calls with supabase.functions.invoke: answers the CORS
 * preflight, refuses other sites' pages (a request with another Origin), other methods and
 * bodies that aren't a JSON object, and turns anything unexpected into `unknown` (500),
 * logged without the request body (it may hold a password).
 */
export function serveFromSite(handler: (body: Body, request: Request) => Promise<Response>) {
  Deno.serve(async (request) => {
    try {
      const origin = request.headers.get('origin')
      if (origin !== null && origin !== siteOrigin()) return refuse('forbidden_origin', 403)
      if (request.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders() })
      }
      if (request.method !== 'POST') return refuse('method_not_allowed', 405)
      const body: unknown = await request.json().catch(() => null)
      if (typeof body !== 'object' || body === null || Array.isArray(body)) {
        return refuse('invalid_request', 400)
      }
      return await handler(body as Body, request)
    } catch (error) {
      console.error(error instanceof Error ? error.message : 'Unexpected failure')
      return refuse('unknown', 500)
    }
  })
}
